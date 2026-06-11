'use client'

import * as THREE from 'three'
import { useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { Fader, Label, PushButton, RigContext, clamp } from './controls'

const HOT_CUE_COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ec4899']
const SECONDS_PER_REV = 1.8 // vinyl feel: one platter turn ≈ 1.8s of audio
const PLATTER_ANG_VEL = (Math.PI * 2) / SECONDS_PER_REV

function fmtTime(s) {
  if (!isFinite(s) || s < 0) s = 0
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return `${String(m).padStart(2, '0')}:${sec.toFixed(1).padStart(4, '0')}`
}

// ---------------------------------------------------------------------------
// Screen rendering (1024×576 CanvasTexture)
// ---------------------------------------------------------------------------

function drawScreen(c, deck, accent) {
  const W = 1024
  const H = 576
  c.fillStyle = '#07090d'
  c.fillRect(0, 0, W, H)

  if (!deck.buffer) {
    c.fillStyle = '#3a4150'
    c.font = '600 40px Inter, sans-serif'
    c.textAlign = 'center'
    c.fillText('NO TRACK LOADED', W / 2, 250)
    c.font = '500 26px Inter, sans-serif'
    c.fillStyle = '#2b313d'
    c.fillText('USE LOAD / DEMO ABOVE, OR DROP AN AUDIO FILE', W / 2, 300)
    return
  }

  const pos = deck.getPosition()
  const dur = deck.duration
  const wf = deck.waveform

  // ---- header
  c.textAlign = 'left'
  c.fillStyle = '#f2f4f8'
  c.font = '700 38px Inter, sans-serif'
  c.fillText(deck.title || 'Untitled', 24, 48, 600)
  c.font = '500 27px Inter, sans-serif'
  c.fillStyle = '#8b93a3'
  c.fillText(`${fmtTime(pos)}  /  -${fmtTime(Math.max(0, dur - pos))}`, 24, 86)

  c.textAlign = 'right'
  c.fillStyle = '#ffffff'
  c.font = '700 54px Inter, sans-serif'
  c.fillText(deck.effectiveBpm ? deck.effectiveBpm.toFixed(1) : '--.-', 936, 56)
  c.font = '600 22px Inter, sans-serif'
  c.fillStyle = '#8b93a3'
  c.fillText('BPM', 1000, 56)
  c.fillStyle = accent
  c.font = '600 26px Inter, sans-serif'
  const tempoStr = `${deck.tempo >= 0 ? '+' : ''}${deck.tempo.toFixed(1)}%  ±${deck.tempoRange}`
  c.fillText(deck.loop.active ? `LOOP   ${tempoStr}` : tempoStr, 1000, 90)

  // ---- scrolling detail waveform (6s window)
  const windowSec = 6
  const half = windowSec / 2
  const top = 118
  const mid = 240
  const maxAmp = 116

  if (deck.bpm) {
    const spb = 60 / deck.bpm
    for (let k = Math.max(0, Math.ceil((pos - half) / spb)); k * spb <= pos + half; k++) {
      const x = ((k * spb - pos) / windowSec + 0.5) * W
      c.fillStyle = k % 4 === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.10)'
      c.fillRect(x, top, 2, 244)
    }
  }

  for (let x = 0; x < W; x += 2) {
    const sec = pos + (x / W - 0.5) * windowSec
    if (sec < 0 || sec > dur) continue
    const amp = wf.detail[Math.floor(sec * wf.perSecond)] || 0
    const h = Math.max(2, amp * maxAmp)
    c.fillStyle = sec < pos ? '#4a5263' : accent
    c.fillRect(x, mid - h, 2, h * 2)
  }

  // loop region + hot cue / cue markers within the window
  const secToX = (sec) => ((sec - pos) / windowSec + 0.5) * W
  if (deck.loop.start != null) {
    const x0 = Math.max(0, secToX(deck.loop.start))
    const x1 = Math.min(W, secToX(deck.loop.end ?? pos + half))
    if (x1 > x0) {
      c.fillStyle = deck.loop.active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'
      c.fillRect(x0, top, x1 - x0, 244)
    }
  }
  const drawMarker = (sec, color, letter) => {
    if (sec == null || sec < pos - half || sec > pos + half) return
    const x = secToX(sec)
    c.fillStyle = color
    c.beginPath()
    c.moveTo(x - 8, top - 4)
    c.lineTo(x + 8, top - 4)
    c.lineTo(x, top + 12)
    c.closePath()
    c.fill()
    if (letter) {
      c.font = '700 20px Inter, sans-serif'
      c.textAlign = 'center'
      c.fillText(letter, x, top - 10)
    }
  }
  drawMarker(deck.cuePoint, '#ff8a00', 'CUE')
  deck.hotCues.forEach((hc, i) => drawMarker(hc, HOT_CUE_COLORS[i], String.fromCharCode(65 + i)))

  // playhead
  c.fillStyle = '#ffffff'
  c.fillRect(W / 2 - 2, top - 6, 4, 256)
  c.fillStyle = '#ff3b30'
  c.fillRect(W / 2 - 5, top - 12, 10, 8)

  // ---- full-track overview
  const ovY = 396
  const ovH = 152
  const ovX = 20
  const ovW = 984
  c.fillStyle = '#10141b'
  c.fillRect(ovX - 4, ovY - 8, ovW + 8, ovH + 16)
  const n = wf.overview.length
  const playedFrac = dur > 0 ? pos / dur : 0
  for (let i = 0; i < n; i++) {
    const h = Math.max(2, wf.overview[i] * (ovH / 2 - 10))
    c.fillStyle = i / n < playedFrac ? accent : '#525a68'
    c.fillRect(ovX + (i / n) * ovW, ovY + ovH / 2 - h, Math.max(1, ovW / n - 1), h * 2)
  }
  if (deck.loop.start != null && deck.loop.end != null) {
    c.fillStyle = 'rgba(255,255,255,0.16)'
    c.fillRect(
      ovX + (deck.loop.start / dur) * ovW,
      ovY,
      Math.max(2, ((deck.loop.end - deck.loop.start) / dur) * ovW),
      ovH
    )
  }
  const tick = (sec, color, tall) => {
    if (sec == null) return
    c.fillStyle = color
    c.fillRect(ovX + (sec / dur) * ovW - 1.5, ovY, 3, tall ? ovH : 26)
  }
  tick(deck.cuePoint, '#ff8a00', false)
  deck.hotCues.forEach((hc, i) => tick(hc, HOT_CUE_COLORS[i], false))
  tick(pos, '#ffffff', true)
}

function drawJogDisplay(c, deck, accent, letter) {
  const S = 256
  const r = S / 2
  c.clearRect(0, 0, S, S)
  c.fillStyle = '#0b0d11'
  c.beginPath()
  c.arc(r, r, r - 2, 0, Math.PI * 2)
  c.fill()

  c.lineWidth = 12
  c.strokeStyle = '#1d2230'
  c.beginPath()
  c.arc(r, r, r - 16, 0, Math.PI * 2)
  c.stroke()
  if (deck.buffer && deck.duration > 0) {
    const frac = deck.getPosition() / deck.duration
    c.strokeStyle = accent
    c.beginPath()
    c.arc(r, r, r - 16, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2)
    c.stroke()
  }

  c.textAlign = 'center'
  c.fillStyle = deck.buffer ? accent : '#2c3140'
  c.font = '800 110px Inter, sans-serif'
  c.fillText(letter, r, r + 28)
  c.fillStyle = '#8b93a3'
  c.font = '700 30px Inter, sans-serif'
  c.fillText(deck.playing ? '▶' : '❚❚', r, r + 78)
}

// ---------------------------------------------------------------------------
// Jog drag: raycast against the platter plane for true rotational feel
// ---------------------------------------------------------------------------

function useJog(deck, jogGroupRef, platterRef) {
  const { engine, setDragging } = useContext(RigContext)
  const { camera, gl } = useThree()
  const dragging = useRef(false)
  const nudgeTarget = useRef(1)
  const last = useRef({ angle: 0, t: 0 })

  const helpers = useMemo(
    () => ({
      raycaster: new THREE.Raycaster(),
      plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      ndc: new THREE.Vector2(),
      center: new THREE.Vector3(),
      hit: new THREE.Vector3(),
    }),
    []
  )

  const angleAt = useCallback(
    (clientX, clientY) => {
      const { raycaster, plane, ndc, center, hit } = helpers
      if (!jogGroupRef.current) return null
      const rect = gl.domElement.getBoundingClientRect()
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      jogGroupRef.current.getWorldPosition(center)
      plane.normal.set(0, 1, 0)
      plane.constant = -center.y
      if (!raycaster.ray.intersectPlane(plane, hit)) return null
      return Math.atan2(hit.x - center.x, hit.z - center.z)
    },
    [helpers, camera, gl, jogGroupRef]
  )

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation()
      engine.ensure()
      const ne = e.nativeEvent ?? e
      const angle = angleAt(ne.clientX, ne.clientY)
      if (angle == null) return
      dragging.current = true
      last.current = { angle, t: ne.timeStamp }
      setDragging(true)

      const move = (ev) => {
        const a = angleAt(ev.clientX, ev.clientY)
        if (a == null) return
        let d = a - last.current.angle
        if (d > Math.PI) d -= Math.PI * 2
        if (d < -Math.PI) d += Math.PI * 2
        const dt = Math.max(0.001, (ev.timeStamp - last.current.t) / 1000)
        last.current = { angle: a, t: ev.timeStamp }
        if (deck.playing) {
          // pitch bend: spinning with/against the platter speeds up/slows down
          const angVel = -d / dt // clockwise (forward) positive
          nudgeTarget.current = clamp(1 + (angVel / PLATTER_ANG_VEL) * 0.5, 0.25, 2.5)
        } else {
          deck.scrub((-d / (Math.PI * 2)) * SECONDS_PER_REV)
          if (platterRef.current) platterRef.current.rotation.y += d
        }
      }
      const up = () => {
        dragging.current = false
        nudgeTarget.current = 1
        setDragging(false)
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    },
    [angleAt, deck, engine, setDragging, platterRef]
  )

  useFrame((_, delta) => {
    // platter spins with playback (clockwise seen from above)
    if (deck.playing && platterRef.current) {
      platterRef.current.rotation.y -= PLATTER_ANG_VEL * deck.rate * delta
    }
    // smooth the pitch bend toward its target, decay to 1 after release
    if (dragging.current && deck.playing) {
      deck.setNudge(THREE.MathUtils.lerp(deck.nudge, nudgeTarget.current, 0.4))
    } else if (deck.nudge !== 1) {
      const n = THREE.MathUtils.lerp(deck.nudge, 1, 0.25)
      deck.setNudge(Math.abs(n - 1) < 0.004 ? 1 : n)
    }
  })

  return onPointerDown
}

// ---------------------------------------------------------------------------
// The deck
// ---------------------------------------------------------------------------

export function CDJ3000({ position, deckIndex, accent }) {
  const { engine } = useContext(RigContext)
  const deck = engine.decks[deckIndex]
  const letter = deckIndex === 0 ? 'A' : 'B'
  const [, force] = useReducer((x) => x + 1, 0)
  useEffect(() => engine.subscribe(force), [engine])

  const screen = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 576
    const texture = new THREE.CanvasTexture(canvas)
    texture.encoding = THREE.sRGBEncoding
    texture.anisotropy = 4
    return { canvas, ctx: canvas.getContext('2d'), texture }
  }, [])

  const jogDisplay = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const texture = new THREE.CanvasTexture(canvas)
    texture.encoding = THREE.sRGBEncoding
    return { canvas, ctx: canvas.getContext('2d'), texture }
  }, [])

  const frame = useRef(0)
  useFrame(() => {
    frame.current++
    if (frame.current % 2) return // ~30fps is plenty for the displays
    drawScreen(screen.ctx, deck, accent)
    screen.texture.needsUpdate = true
    drawJogDisplay(jogDisplay.ctx, deck, accent, letter)
    jogDisplay.texture.needsUpdate = true
  })

  const jogGroupRef = useRef()
  const platterRef = useRef()
  const onJogDown = useJog(deck, jogGroupRef, platterRef)

  const onScreenDown = useCallback(
    (e) => {
      e.stopPropagation()
      if (!deck.buffer || !e.uv) return
      // overview band lives in the lower third of the screen canvas
      if (e.uv.y < 0.33) {
        const frac = clamp((e.uv.x - 0.02) / 0.96, 0, 1)
        deck.seek(frac * deck.duration)
      }
    },
    [deck]
  )

  const notches = useMemo(() => Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2), [])

  return (
    <group position={position}>
      {/* body */}
      <RoundedBox args={[2.35, 0.16, 3.2]} radius={0.04} position={[0, 0.08, 0]}>
        <meshStandardMaterial color='#141417' roughness={0.7} metalness={0.15} />
      </RoundedBox>
      <RoundedBox args={[2.23, 0.014, 3.08]} radius={0.007} position={[0, 0.165, 0]}>
        <meshStandardMaterial color='#1a1a1f' roughness={0.85} />
      </RoundedBox>
      {/* accent edge */}
      <mesh position={[0, 0.06, 1.59]}>
        <boxGeometry args={[2.3, 0.022, 0.02]} />
        <meshStandardMaterial color='#0a0a0c' emissive={accent} emissiveIntensity={1.1} />
      </mesh>
      <Label text='CDJ-3000' height={0.07} color='#6b7280' position={[-0.92, 0.18, 1.46]} />
      <Label text={`DECK ${letter}`} height={0.08} color={accent} position={[0.92, 0.18, 1.46]} />

      <group position={[0, 0.172, 0]}>
        {/* screen, tilted up at the back */}
        <group position={[0, 0.02, -1.02]} rotation={[0.42, 0, 0]}>
          <RoundedBox args={[2.0, 0.09, 1.02]} radius={0.02} position={[0, 0.03, 0]}>
            <meshStandardMaterial color='#0c0c0f' roughness={0.6} />
          </RoundedBox>
          <mesh position={[0, 0.078, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onScreenDown}>
            <planeGeometry args={[1.86, 0.88]} />
            <meshBasicMaterial map={screen.texture} toneMapped={false} />
          </mesh>
        </group>

        {/* hot cues */}
        {HOT_CUE_COLORS.map((color, i) => (
          <PushButton
            key={i}
            position={[-0.72 + i * 0.48, 0, -0.36]}
            w={0.36}
            d={0.15}
            label={String.fromCharCode(65 + i)}
            litColor={color}
            getLit={() => (deck.hotCues[i] != null ? 1 : 0)}
            onPress={() => deck.pressHotCue(i)}
          />
        ))}

        {/* loop section */}
        <PushButton position={[-0.98, 0, 0.0]} w={0.26} d={0.115} label='IN' labelHeight={0.045} litColor='#fbbf24' getLit={() => (deck.loop.start != null ? (deck.loop.active ? 1 : 0.4) : 0)} onPress={() => deck.loopIn()} />
        <PushButton position={[-0.98, 0, 0.17]} w={0.26} d={0.115} label='OUT' labelHeight={0.045} litColor='#fbbf24' getLit={() => (deck.loop.end != null ? (deck.loop.active ? 1 : 0.4) : 0)} onPress={() => deck.loopOut()} />
        <PushButton position={[-0.98, 0, 0.34]} w={0.26} d={0.115} label='4BEAT' labelHeight={0.04} litColor={accent} getLit={() => (deck.loop.active ? 0.6 : 0)} onPress={() => deck.autoLoop(4)} />
        <PushButton position={[-0.98, 0, 0.51]} w={0.26} d={0.115} label='RELOOP' labelHeight={0.036} litColor={accent} getLit={() => (deck.loop.active ? 1 : deck.loop.end != null ? 0.25 : 0)} onPress={() => deck.toggleReloop()} />

        {/* jog wheel */}
        <group ref={jogGroupRef} position={[0, 0, 0.5]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.78, 0.8, 0.1, 48]} />
            <meshStandardMaterial color='#26262c' roughness={0.35} metalness={0.7} />
          </mesh>
          <group ref={platterRef} position={[0, 0.108, 0]}>
            <mesh>
              <cylinderGeometry args={[0.7, 0.74, 0.026, 48]} />
              <meshStandardMaterial color='#0d0d10' roughness={0.5} metalness={0.3} />
            </mesh>
            {notches.map((a, i) => (
              <mesh key={i} position={[Math.sin(a) * 0.62, 0.014, Math.cos(a) * 0.62]} rotation={[0, a, 0]}>
                <boxGeometry args={[0.02, 0.008, 0.1]} />
                <meshStandardMaterial color='#2a2a31' roughness={0.4} metalness={0.5} />
              </mesh>
            ))}
            <mesh position={[0, 0.016, 0.45]}>
              <boxGeometry args={[0.05, 0.006, 0.05]} />
              <meshBasicMaterial color={accent} toneMapped={false} />
            </mesh>
          </group>
          <mesh position={[0, 0.128, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.3, 40]} />
            <meshBasicMaterial map={jogDisplay.texture} toneMapped={false} transparent />
          </mesh>
          {/* invisible hit surface across the whole jog */}
          <mesh position={[0, 0.135, 0]} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onJogDown}>
            <circleGeometry args={[0.8, 32]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>

        {/* transport */}
        <PushButton
          position={[-0.95, 0, 1.3]}
          shape='round'
          r={0.16}
          label='PLAY'
          labelHeight={0.05}
          litColor='#22c55e'
          getLit={(t) => (deck.playing ? 1 : deck.buffer ? (Math.sin(t * 7) > 0 ? 0.8 : 0.1) : 0)}
          onPress={() => deck.togglePlay()}
        />
        <PushButton
          position={[-0.95, 0, 0.88]}
          shape='round'
          r={0.13}
          label='CUE'
          labelHeight={0.045}
          litColor='#ff8a00'
          getLit={() => (!deck.buffer ? 0 : deck.playing ? 0.12 : 1)}
          onPress={() => deck.pressCue()}
        />

        {/* tempo section */}
        <PushButton
          position={[0.98, 0, -0.1]}
          w={0.24}
          d={0.11}
          label={`±${deck.tempoRange}`}
          labelHeight={0.045}
          litColor='#e8e8ec'
          getLit={() => 0.12}
          onPress={() => deck.cycleTempoRange()}
        />
        <Fader
          position={[0.98, 0, 0.55]}
          axis='z'
          invert
          travel={0.85}
          centerTick
          getValue={() => 0.5 + deck.tempo / (2 * deck.tempoRange)}
          setValue={(v) => deck.setTempo((v - 0.5) * 2 * deck.tempoRange)}
        />
        <Label text='TEMPO' height={0.05} position={[0.98, 0.012, 1.12]} />
        <PushButton
          position={[0.98, 0, 1.34]}
          w={0.24}
          d={0.12}
          label='SYNC'
          labelHeight={0.045}
          litColor='#3b82f6'
          getLit={() => (deck.isSynced() ? 0.9 : 0)}
          onPress={() => deck.sync()}
        />
      </group>
    </group>
  )
}
