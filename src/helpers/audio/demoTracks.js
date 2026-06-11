/**
 * Synthesizes two short house loops with an OfflineAudioContext so the booth
 * is mixable with zero bundled assets (and so the audio path can be exercised
 * without picking files). Track A is 124 BPM, track B is 128 BPM — close
 * enough to practice beat-matching with the tempo faders.
 */

const SR = 44100

function midiToFreq(n) {
  return 440 * Math.pow(2, (n - 69) / 12)
}

function makeNoiseBuffer(ctx, seconds = 1) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function kick(ctx, out, t) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.11)
  g.gain.setValueAtTime(1, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
  osc.connect(g)
  g.connect(out)
  osc.start(t)
  osc.stop(t + 0.32)
}

function hat(ctx, noise, out, t, open, seed) {
  const src = ctx.createBufferSource()
  src.buffer = noise
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 8500
  const g = ctx.createGain()
  const dur = open ? 0.22 : 0.055
  g.gain.setValueAtTime(open ? 0.25 : 0.16, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(hp)
  hp.connect(g)
  g.connect(out)
  src.start(t, (seed % 7) * 0.11)
  src.stop(t + dur + 0.02)
}

function clap(ctx, noise, out, t, seed) {
  const src = ctx.createBufferSource()
  src.buffer = noise
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1600
  bp.Q.value = 0.9
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.55, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
  src.connect(bp)
  bp.connect(g)
  g.connect(out)
  src.start(t, (seed % 5) * 0.13)
  src.stop(t + 0.25)
}

function bassNote(ctx, out, t, note, dur, cutoff = 420, level = 0.34) {
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = midiToFreq(note)
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = cutoff
  lp.Q.value = 2
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(level, t + 0.008)
  g.gain.setValueAtTime(level, t + dur * 0.6)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(lp)
  lp.connect(g)
  g.connect(out)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function stab(ctx, out, t, notes, level = 0.12) {
  for (const note of notes) {
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = midiToFreq(note)
      osc.detune.value = detune
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 950
      bp.Q.value = 0.8
      const g = ctx.createGain()
      g.gain.setValueAtTime(level, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
      osc.connect(bp)
      bp.connect(g)
      g.connect(out)
      osc.start(t)
      osc.stop(t + 0.25)
    }
  }
}

const TRACKS = [
  {
    title: 'Neon Skyline (Demo)',
    bpm: 124,
    bars: 16,
    // A minor bassline, eighth notes (midi)
    bassPattern: [33, 33, 36, 33, 31, 33, 40, 38],
    bassFrom: 2,
    bassUntil: 14,
    clapFrom: 4,
    openHats: true,
    sixteenthHats: false,
    stabs: false,
  },
  {
    title: 'Midnight Drive (Demo)',
    bpm: 128,
    bars: 16,
    // F minor bassline
    bassPattern: [29, 29, 32, 29, 34, 32, 29, 27],
    bassFrom: 0,
    bassUntil: 16,
    clapFrom: 0,
    openHats: false,
    sixteenthHats: true,
    stabs: true,
  },
]

export const DEMO_TRACK_COUNT = TRACKS.length

export async function renderDemoTrack(index) {
  const spec = TRACKS[index % TRACKS.length]
  const secPerBeat = 60 / spec.bpm
  const beats = spec.bars * 4
  const duration = beats * secPerBeat + 0.4
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext
  const ctx = new OfflineCtx(2, Math.ceil(duration * SR), SR)

  const master = ctx.createGain()
  master.gain.value = 0.82
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -10
  comp.ratio.value = 4
  master.connect(comp)
  comp.connect(ctx.destination)

  const noise = makeNoiseBuffer(ctx)

  for (let b = 0; b < beats; b++) {
    const t = b * secPerBeat + 0.05
    const bar = Math.floor(b / 4)

    kick(ctx, master, t)

    if (spec.openHats) hat(ctx, noise, master, t + secPerBeat / 2, true, b)
    if (spec.sixteenthHats) {
      for (let s = 0; s < 4; s++) {
        if (s === 0) continue
        hat(ctx, noise, master, t + (s * secPerBeat) / 4, false, b * 4 + s)
      }
    } else {
      hat(ctx, noise, master, t + secPerBeat / 4, false, b)
    }

    if (bar >= spec.clapFrom && b % 2 === 1) clap(ctx, noise, master, t, b)

    if (bar >= spec.bassFrom && bar < spec.bassUntil) {
      const eighth = secPerBeat / 2
      for (let e = 0; e < 2; e++) {
        const idx = ((b % 4) * 2 + e) % spec.bassPattern.length
        bassNote(ctx, master, t + e * eighth, spec.bassPattern[idx], eighth * 0.9)
      }
    }

    if (spec.stabs && bar >= 4 && bar % 2 === 0 && b % 4 === 1) {
      stab(ctx, master, t + secPerBeat / 2, [53, 56, 60])
    }
  }

  const buffer = await ctx.startRendering()
  return { buffer, title: spec.title, bpm: spec.bpm }
}
