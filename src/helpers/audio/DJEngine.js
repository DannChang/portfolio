import { computeWaveform } from './waveform'
import { estimateBpm } from './bpm'
import { renderDemoTrack } from './demoTracks'

export const NUM_HOT_CUES = 4
export const TEMPO_RANGES = [6, 10, 16]

const GAIN_SMOOTHING = 0.015

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function dbToGain(db) {
  return Math.pow(10, db / 20)
}

/**
 * One CDJ deck. Playback uses an AudioBufferSourceNode with a variable
 * playbackRate (tempo ± jog nudge). Because the rate changes over time, the
 * play position is tracked with an anchor (position + context time at the
 * last rate change); every rate/loop change folds elapsed time into the
 * anchor so extrapolation stays exact.
 */
class Deck {
  constructor(engine, id) {
    this.engine = engine
    this.id = id

    this.output = null // GainNode, created at engine init

    this.buffer = null
    this.source = null
    this.playing = false
    this.position = 0
    this.anchorPos = 0
    this.anchorTime = 0

    this.tempo = 0 // percent
    this.tempoRange = TEMPO_RANGES[1]
    this.nudge = 1 // jog pitch-bend multiplier

    this.cuePoint = 0
    this.hotCues = new Array(NUM_HOT_CUES).fill(null)
    this.loop = { start: null, end: null, active: false }

    this.title = null
    this.bpm = null
    this.duration = 0
    this.waveform = null
  }

  get rate() {
    return (1 + this.tempo / 100) * this.nudge
  }

  get effectiveBpm() {
    return this.bpm ? this.bpm * (1 + this.tempo / 100) : null
  }

  getPosition() {
    let p
    if (!this.playing || !this.engine.ctx) {
      p = this.position
    } else {
      p = this.anchorPos + (this.engine.ctx.currentTime - this.anchorTime) * this.rate
    }
    const { start, end, active } = this.loop
    if (active && start != null && end != null && p >= end) {
      p = start + ((p - start) % (end - start))
    }
    return clamp(p, 0, this.duration)
  }

  _foldPosition() {
    if (this.playing && this.engine.ctx) {
      this.position = this.getPosition()
      this.anchorPos = this.position
      this.anchorTime = this.engine.ctx.currentTime
    }
  }

  _startSource(pos) {
    const ctx = this.engine.ctx
    if (!ctx || !this.buffer) return
    this._stopSource()
    pos = clamp(pos, 0, Math.max(0, this.duration - 0.005))
    const src = ctx.createBufferSource()
    src.buffer = this.buffer
    src.playbackRate.value = this.rate
    this._applyLoopToSource(src)
    src.connect(this.output)
    src.onended = () => {
      // Ignore stops we triggered ourselves (identity check); only a source
      // that is still current has played through to the end of the track.
      if (this.source !== src) return
      this.source = null
      this.playing = false
      this.position = this.duration
      this.engine._emit()
    }
    src.start(0, pos)
    this.source = src
    this.playing = true
    this.position = pos
    this.anchorPos = pos
    this.anchorTime = ctx.currentTime
  }

  _stopSource() {
    if (this.source) {
      const src = this.source
      this.source = null
      try {
        src.stop()
      } catch (e) {
        /* already stopped */
      }
      try {
        src.disconnect()
      } catch (e) {
        /* noop */
      }
    }
    this.playing = false
  }

  play() {
    this.engine.ensure()
    if (!this.buffer || this.playing) return
    if (this.position >= this.duration - 0.005) this.position = 0
    this._startSource(this.position)
    this.engine._emit()
  }

  pause() {
    this.engine.ensure()
    if (!this.playing) return
    this.position = this.getPosition()
    this._stopSource()
    this.engine._emit()
  }

  togglePlay() {
    if (this.playing) this.pause()
    else this.play()
  }

  seek(pos) {
    this.engine.ensure()
    if (!this.buffer) return
    pos = clamp(pos, 0, this.duration)
    if (this.playing) this._startSource(pos)
    else this.position = pos
    this.engine._emit()
  }

  /** CDJ cue behavior: playing → back to cue & pause; paused → set cue here. */
  pressCue() {
    this.engine.ensure()
    if (!this.buffer) return
    if (this.playing) {
      this.pause()
      this.position = this.cuePoint
    } else {
      this.cuePoint = this.getPosition()
    }
    this.engine._emit()
  }

  /** Empty slot stores the current position; a stored slot jumps and plays. */
  pressHotCue(i) {
    this.engine.ensure()
    if (!this.buffer) return
    if (this.hotCues[i] == null) {
      this.hotCues[i] = this.getPosition()
    } else {
      this._startSource(this.hotCues[i])
    }
    this.engine._emit()
  }

  loopIn() {
    this.engine.ensure()
    if (!this.buffer) return
    this._setLoopActive(false)
    this.loop.start = this.getPosition()
    this.loop.end = null
    this.engine._emit()
  }

  loopOut() {
    this.engine.ensure()
    if (!this.buffer || this.loop.start == null) return
    const p = this.getPosition()
    if (p <= this.loop.start + 0.02) return
    this.loop.end = p
    this._setLoopActive(true)
    this.engine._emit()
  }

  autoLoop(beats = 4) {
    this.engine.ensure()
    if (!this.buffer || !this.bpm) return
    const start = this.getPosition()
    const len = (60 / this.bpm) * beats // loop bounds live in track-time
    if (start + len > this.duration) return
    this.loop.start = start
    this.loop.end = start + len
    this._setLoopActive(true)
    this.engine._emit()
  }

  /** RELOOP/EXIT: exits an active loop, or re-enters the stored one. */
  toggleReloop() {
    this.engine.ensure()
    const { start, end, active } = this.loop
    if (active) {
      this._setLoopActive(false)
    } else if (start != null && end != null) {
      this.loop.active = true
      if (this.playing) this._startSource(start)
      else this.position = start
    }
    this.engine._emit()
  }

  _setLoopActive(active) {
    this._foldPosition()
    this.loop.active = active
    if (this.source) this._applyLoopToSource(this.source)
  }

  _applyLoopToSource(src) {
    const { start, end, active } = this.loop
    if (active && start != null && end != null) {
      src.loopStart = start
      src.loopEnd = end
      src.loop = true
    } else {
      src.loop = false
    }
  }

  setTempo(pct) {
    pct = clamp(pct, -this.tempoRange, this.tempoRange)
    this._foldPosition()
    this.tempo = pct
    if (this.source) this.source.playbackRate.value = this.rate
    this.engine._emit()
  }

  cycleTempoRange() {
    const i = TEMPO_RANGES.indexOf(this.tempoRange)
    this.tempoRange = TEMPO_RANGES[(i + 1) % TEMPO_RANGES.length]
    this.setTempo(this.tempo) // re-clamp into the new range
  }

  /** Jog pitch-bend; 1 = no bend. Folds position so tracking stays exact. */
  setNudge(mult) {
    this._foldPosition()
    this.nudge = clamp(mult, 0.15, 3)
    if (this.source) this.source.playbackRate.value = this.rate
  }

  /** Jog scrub while paused, in track seconds. */
  scrub(deltaSeconds) {
    this.engine.ensure()
    if (!this.buffer || this.playing) return
    this.position = clamp(this.position + deltaSeconds, 0, this.duration)
  }

  /** Match this deck's effective BPM to the other deck's (no phase align). */
  sync() {
    this.engine.ensure()
    const other = this.engine.decks[1 - this.id]
    if (!this.bpm || !other.effectiveBpm) return
    let pct = (other.effectiveBpm / this.bpm - 1) * 100
    while (Math.abs(pct) > this.tempoRange && this.tempoRange < TEMPO_RANGES[TEMPO_RANGES.length - 1]) {
      this.cycleTempoRange()
    }
    this.setTempo(pct)
  }

  isSynced() {
    const other = this.engine.decks[1 - this.id]
    if (!this.effectiveBpm || !other.effectiveBpm) return false
    return Math.abs(this.effectiveBpm - other.effectiveBpm) < 0.05
  }
}

/** One mixer channel strip: trim → 3-band EQ → filter → fader → crossfader. */
class Channel {
  constructor(engine, id) {
    this.engine = engine
    this.id = id
    this.values = { trim: 0, low: 0, mid: 0, high: 0, filter: 0, fader: 1 }
    this.nodes = null
  }

  _init(ctx) {
    const trim = ctx.createGain()
    const low = ctx.createBiquadFilter()
    low.type = 'lowshelf'
    low.frequency.value = 100
    const mid = ctx.createBiquadFilter()
    mid.type = 'peaking'
    mid.frequency.value = 1000
    mid.Q.value = 0.7
    const high = ctx.createBiquadFilter()
    high.type = 'highshelf'
    high.frequency.value = 10000
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 20000
    const fader = ctx.createGain()
    const xf = ctx.createGain()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024

    trim.connect(low)
    low.connect(mid)
    mid.connect(high)
    high.connect(filter)
    filter.connect(fader)
    fader.connect(xf)
    filter.connect(analyser) // VU tap: post-EQ/filter, pre-fader (DJM-style)

    this.nodes = { trim, low, mid, high, filter, fader, xf, analyser }

    // Re-apply anything the user touched before audio was unlocked
    this.setTrim(this.values.trim)
    this.setEq('low', this.values.low)
    this.setEq('mid', this.values.mid)
    this.setEq('high', this.values.high)
    this.setFilter(this.values.filter)
    this.setFader(this.values.fader)
  }

  _setGain(param, value) {
    const ctx = this.engine.ctx
    param.setTargetAtTime(value, ctx.currentTime, GAIN_SMOOTHING)
  }

  /** v in [-1, 1] → ±12 dB */
  setTrim(v) {
    this.values.trim = clamp(v, -1, 1)
    if (this.nodes) this._setGain(this.nodes.trim.gain, dbToGain(this.values.trim * 12))
  }

  /** v in [-1, 1] → −26 dB cut … +6 dB boost (DJM-style EQ) */
  setEq(band, v) {
    this.values[band] = clamp(v, -1, 1)
    if (this.nodes) {
      const db = this.values[band] < 0 ? this.values[band] * 26 : this.values[band] * 6
      this.nodes[band].gain.setTargetAtTime(db, this.engine.ctx.currentTime, GAIN_SMOOTHING)
    }
  }

  /** One-knob filter: left = low-pass sweep, right = high-pass sweep. */
  setFilter(v) {
    this.values.filter = clamp(v, -1, 1)
    if (!this.nodes) return
    const f = this.nodes.filter
    const t = this.engine.ctx.currentTime
    if (this.values.filter < -0.03) {
      f.type = 'lowpass'
      f.Q.value = 1.1
      f.frequency.setTargetAtTime(20000 * Math.pow(70 / 20000, -this.values.filter), t, GAIN_SMOOTHING)
    } else if (this.values.filter > 0.03) {
      f.type = 'highpass'
      f.Q.value = 1.1
      f.frequency.setTargetAtTime(20 * Math.pow(8000 / 20, this.values.filter), t, GAIN_SMOOTHING)
    } else {
      f.type = 'lowpass'
      f.Q.value = 0.5
      f.frequency.setTargetAtTime(20000, t, GAIN_SMOOTHING)
    }
  }

  /** v in [0, 1], squared taper. */
  setFader(v) {
    this.values.fader = clamp(v, 0, 1)
    if (this.nodes) this._setGain(this.nodes.fader.gain, this.values.fader * this.values.fader)
  }
}

class DJEngine {
  constructor() {
    this.ctx = null
    this.decks = [new Deck(this, 0), new Deck(this, 1)]
    this.channels = [new Channel(this, 0), new Channel(this, 1)]
    this.crossfader = 0.5
    this.master = 0.9
    this.loading = [false, false]
    this.errors = [null, null]
    this.masterNodes = null
    this._listeners = new Set()
    this._levelBuf = null
  }

  /** Idempotent; builds the audio graph. Safe to call from any user gesture. */
  init() {
    if (this.ctx || typeof window === 'undefined') return
    const AC = window.AudioContext || window.webkitAudioContext
    this.ctx = new AC({ latencyHint: 'interactive' })

    const masterGain = this.ctx.createGain()
    const analyser = this.ctx.createAnalyser()
    analyser.fftSize = 1024
    masterGain.connect(analyser)
    analyser.connect(this.ctx.destination)
    this.masterNodes = { gain: masterGain, analyser }
    this._levelBuf = new Float32Array(analyser.fftSize)

    for (const deck of this.decks) {
      deck.output = this.ctx.createGain()
    }
    for (const ch of this.channels) {
      ch._init(this.ctx)
      this.decks[ch.id].output.connect(ch.nodes.trim)
      ch.nodes.xf.connect(masterGain)
    }
    this.setCrossfader(this.crossfader)
    this.setMaster(this.master)
  }

  ensure() {
    this.init()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  /** Equal-power crossfade; 0 = full deck A, 1 = full deck B. */
  setCrossfader(x) {
    this.crossfader = clamp(x, 0, 1)
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const a = Math.cos((this.crossfader * Math.PI) / 2)
    const b = Math.sin((this.crossfader * Math.PI) / 2)
    this.channels[0].nodes.xf.gain.setTargetAtTime(a, t, GAIN_SMOOTHING)
    this.channels[1].nodes.xf.gain.setTargetAtTime(b, t, GAIN_SMOOTHING)
  }

  setMaster(v) {
    this.master = clamp(v, 0, 1)
    if (this.masterNodes) {
      this.masterNodes.gain.gain.setTargetAtTime(this.master * this.master, this.ctx.currentTime, GAIN_SMOOTHING)
    }
  }

  /** RMS level (linear) for 'ch0' | 'ch1' | 'master', for the VU meters. */
  getLevel(which) {
    const analyser =
      which === 'master' ? this.masterNodes?.analyser : this.channels[which === 'ch0' ? 0 : 1].nodes?.analyser
    if (!analyser || !this._levelBuf) return 0
    analyser.getFloatTimeDomainData(this._levelBuf)
    let sum = 0
    for (let i = 0; i < this._levelBuf.length; i++) sum += this._levelBuf[i] * this._levelBuf[i]
    return Math.sqrt(sum / this._levelBuf.length)
  }

  async loadFile(deckIndex, file) {
    this.ensure()
    this.loading[deckIndex] = true
    this.errors[deckIndex] = null
    this._emit()
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = await this.ctx.decodeAudioData(arrayBuffer)
      const title = file.name.replace(/\.[^.]+$/, '')
      await this._setDeckBuffer(deckIndex, buffer, title)
    } catch (e) {
      this.errors[deckIndex] = 'Could not decode that file — try MP3, WAV, M4A, OGG or FLAC.'
    } finally {
      this.loading[deckIndex] = false
      this._emit()
    }
  }

  async loadDemo(deckIndex) {
    this.ensure()
    this.loading[deckIndex] = true
    this.errors[deckIndex] = null
    this._emit()
    try {
      const { buffer, title, bpm } = await renderDemoTrack(deckIndex)
      await this._setDeckBuffer(deckIndex, buffer, title, bpm)
    } catch (e) {
      this.errors[deckIndex] = 'Demo track failed to render.'
    } finally {
      this.loading[deckIndex] = false
      this._emit()
    }
  }

  async _setDeckBuffer(deckIndex, buffer, title, knownBpm = null) {
    // Yield once so the "Analyzing…" state paints before the heavy analysis.
    await new Promise((resolve) => setTimeout(resolve, 0))
    const deck = this.decks[deckIndex]
    deck._stopSource()
    deck.buffer = buffer
    deck.duration = buffer.duration
    deck.position = 0
    deck.anchorPos = 0
    deck.cuePoint = 0
    deck.hotCues = new Array(NUM_HOT_CUES).fill(null)
    deck.loop = { start: null, end: null, active: false }
    deck.nudge = 1
    deck.title = title
    deck.waveform = computeWaveform(buffer)
    deck.bpm = knownBpm ?? estimateBpm(buffer)
    this._emit()
  }

  subscribe(fn) {
    this._listeners.add(fn)
    return () => this._listeners.delete(fn)
  }

  _emit() {
    for (const fn of this._listeners) {
      try {
        fn()
      } catch (e) {
        /* listener errors must not break the engine */
      }
    }
  }
}

let instance = null

export function getDJEngine() {
  if (!instance) {
    instance = new DJEngine()
    if (typeof window !== 'undefined') {
      // Handy for debugging and for driving the booth programmatically.
      window.__djEngine = instance
    }
  }
  return instance
}
