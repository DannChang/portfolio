'use client'

import * as THREE from 'three'
import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Shared rig context: the audio engine instance plus a hook to disable the
 * orbit camera while a control is being dragged.
 */
export const RigContext = createContext({ engine: null, setDragging: () => {} })

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

// ---------------------------------------------------------------------------
// Canvas-texture text labels (no external font/CDN dependency)
// ---------------------------------------------------------------------------

const labelCache = new Map()

export function makeTextTexture(text, { size = 64, color = '#c8ccd4', weight = 600 } = {}) {
  const key = `${text}|${color}|${size}|${weight}`
  if (labelCache.has(key)) return labelCache.get(key)
  const font = `${weight} ${size}px Inter, -apple-system, 'Segoe UI', Roboto, sans-serif`
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.font = font
  const metrics = ctx.measureText(text)
  const pad = Math.ceil(size * 0.25)
  canvas.width = Math.max(2, Math.ceil(metrics.width) + pad * 2)
  canvas.height = Math.ceil(size * 1.35)
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + size * 0.04)
  const texture = new THREE.CanvasTexture(canvas)
  texture.encoding = THREE.sRGBEncoding
  texture.minFilter = THREE.LinearFilter
  texture.anisotropy = 4
  const entry = { texture, aspect: canvas.width / canvas.height }
  labelCache.set(key, entry)
  return entry
}

/** Flat text label; by default lies on the deck surface facing up. */
export function Label({ text, height = 0.07, color = '#c8ccd4', weight = 600, position, rotation }) {
  const { texture, aspect } = useMemo(() => makeTextTexture(text, { color, weight }), [text, color, weight])
  return (
    <mesh position={position} rotation={rotation ?? [-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Drag plumbing: window-level listeners so fast drags never escape the mesh
// ---------------------------------------------------------------------------

export function useDrag({ onStart, onMove, onEnd }) {
  const { setDragging } = useContext(RigContext)
  const state = useRef(null)

  return useCallback(
    (e) => {
      e.stopPropagation()
      const ne = e.nativeEvent ?? e
      state.current = { x: ne.clientX, y: ne.clientY, lastX: ne.clientX, lastY: ne.clientY, lastT: ne.timeStamp }
      setDragging(true)
      if (onStart) onStart(e)

      const move = (ev) => {
        const s = state.current
        if (!s) return
        if (onMove)
          onMove({
            dx: ev.clientX - s.x,
            dy: ev.clientY - s.y,
            ddx: ev.clientX - s.lastX,
            ddy: ev.clientY - s.lastY,
            dt: Math.max(1, ev.timeStamp - s.lastT) / 1000,
            event: ev,
          })
        s.lastX = ev.clientX
        s.lastY = ev.clientY
        s.lastT = ev.timeStamp
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        state.current = null
        setDragging(false)
        if (onEnd) onEnd()
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    },
    [onStart, onMove, onEnd, setDragging]
  )
}

// ---------------------------------------------------------------------------
// Knob — rotary control bound to the engine; drag vertically, dbl-click resets
// ---------------------------------------------------------------------------

export function Knob({ position, label, getValue, setValue, size = 0.09, accent = '#e8e8ec', labelColor }) {
  const rotorRef = useRef()
  const startVal = useRef(0)

  const onStart = useCallback(() => {
    startVal.current = getValue()
  }, [getValue])
  const onMove = useCallback(
    ({ dy }) => setValue(clamp(startVal.current - dy / 120, -1, 1)),
    [setValue]
  )
  const onPointerDown = useDrag({ onStart, onMove })

  useFrame(() => {
    if (rotorRef.current) rotorRef.current.rotation.y = -getValue() * Math.PI * 0.75
  })

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[size * 1.18, size * 1.24, 0.02, 24]} />
        <meshStandardMaterial color='#0e0e11' roughness={0.8} />
      </mesh>
      <group ref={rotorRef}>
        <mesh
          position={[0, size * 0.62, 0]}
          onPointerDown={onPointerDown}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setValue(0)
          }}
        >
          <cylinderGeometry args={[size * 0.92, size, size * 1.25, 24]} />
          <meshStandardMaterial color='#1b1b20' roughness={0.5} metalness={0.35} />
        </mesh>
        <mesh position={[0, size * 1.26, -size * 0.5]}>
          <boxGeometry args={[size * 0.16, 0.012, size * 0.8]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      </group>
      {label && <Label text={label} height={0.058} color={labelColor} position={[0, 0.012, size + 0.075]} />}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Fader — linear control along x or z
// ---------------------------------------------------------------------------

export function Fader({
  position,
  label,
  getValue,
  setValue,
  travel = 0.7,
  axis = 'z',
  invert = false,
  handleColor = '#202024',
  stripeColor = '#d6d9de',
  centerTick = false,
}) {
  const handleRef = useRef()
  const startVal = useRef(0)

  const onStart = useCallback(() => {
    startVal.current = getValue()
  }, [getValue])
  const onMove = useCallback(
    ({ dx, dy }) => {
      const delta = axis === 'x' ? dx / 150 : (invert ? dy : -dy) / 150
      setValue(clamp(startVal.current + delta, 0, 1))
    },
    [setValue, axis, invert]
  )
  const onPointerDown = useDrag({ onStart, onMove })

  useFrame(() => {
    if (!handleRef.current) return
    const v = getValue()
    const offset = axis === 'x' ? (v - 0.5) * travel : (invert ? v - 0.5 : 0.5 - v) * travel
    if (axis === 'x') handleRef.current.position.x = offset
    else handleRef.current.position.z = offset
  })

  const slotDims = axis === 'x' ? [travel + 0.1, 0.015, 0.05] : [0.05, 0.015, travel + 0.1]
  const handleDims = axis === 'x' ? [0.09, 0.075, 0.3] : [0.3, 0.075, 0.09]
  const stripeDims = axis === 'x' ? [0.024, 0.002, 0.3] : [0.3, 0.002, 0.024]

  return (
    <group position={position}>
      <mesh position={[0, 0.004, 0]}>
        <boxGeometry args={slotDims} />
        <meshStandardMaterial color='#060608' roughness={0.9} />
      </mesh>
      {centerTick && (
        <mesh position={axis === 'x' ? [0, 0.006, 0.06] : [0.1, 0.006, 0]}>
          <boxGeometry args={axis === 'x' ? [0.012, 0.002, 0.06] : [0.06, 0.002, 0.012]} />
          <meshBasicMaterial color='#9aa0aa' toneMapped={false} />
        </mesh>
      )}
      <group ref={handleRef}>
        <mesh position={[0, 0.045, 0]} onPointerDown={onPointerDown}>
          <boxGeometry args={handleDims} />
          <meshStandardMaterial color={handleColor} roughness={0.45} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.085, 0]}>
          <boxGeometry args={stripeDims} />
          <meshBasicMaterial color={stripeColor} toneMapped={false} />
        </mesh>
      </group>
      {label && (
        <Label
          text={label}
          height={0.06}
          position={axis === 'x' ? [0, 0.012, 0.28] : [0, 0.012, travel / 2 + 0.16]}
        />
      )}
    </group>
  )
}

// ---------------------------------------------------------------------------
// PushButton — momentary button with emissive lit state
// ---------------------------------------------------------------------------

export function PushButton({
  position,
  label,
  shape = 'rect',
  w = 0.26,
  d = 0.13,
  r = 0.14,
  litColor = '#22c55e',
  getLit,
  onPress,
  labelColor = '#c8ccd4',
  labelHeight = 0.05,
}) {
  const matRef = useRef()
  const bodyRef = useRef()
  const pressT = useRef(-1)

  useFrame(({ clock }) => {
    if (matRef.current && getLit) {
      const lit = getLit(clock.elapsedTime)
      const intensity = typeof lit === 'number' ? lit : lit ? 1 : 0
      matRef.current.emissiveIntensity = 0.08 + intensity * 1.6
    }
    if (bodyRef.current) {
      const since = pressT.current < 0 ? 1 : (performance.now() - pressT.current) / 160
      bodyRef.current.position.y = -0.014 * Math.max(0, 1 - since)
    }
  })

  return (
    <group position={position}>
      <group ref={bodyRef}>
        <mesh
          onPointerDown={(e) => {
            e.stopPropagation()
            pressT.current = performance.now()
            if (onPress) onPress()
          }}
        >
          {shape === 'rect' ? <boxGeometry args={[w, 0.05, d]} /> : <cylinderGeometry args={[r, r * 1.05, 0.05, 28]} />}
          <meshStandardMaterial ref={matRef} color='#131316' roughness={0.5} emissive={litColor} emissiveIntensity={0.08} />
        </mesh>
        {label && <Label text={label} height={labelHeight} color={labelColor} position={[0, 0.028, 0]} />}
      </group>
    </group>
  )
}

// ---------------------------------------------------------------------------
// VUMeter — LED column driven by an engine analyser
// ---------------------------------------------------------------------------

export function VUMeter({ position, getLevel, segments = 10, segLength = 0.055, width = 0.055 }) {
  const mats = useRef([])
  const displayDb = useRef(-60)

  useFrame((_, delta) => {
    const rms = getLevel()
    const db = 20 * Math.log10(rms + 1e-7)
    // fast attack, slow release
    displayDb.current = db > displayDb.current ? db : Math.max(db, displayDb.current - 50 * delta)
    for (let i = 0; i < segments; i++) {
      const threshold = -42 + (i * 45) / segments
      const mat = mats.current[i]
      if (mat) mat.emissiveIntensity = displayDb.current >= threshold ? 1.7 : 0.07
    }
  })

  return (
    <group position={position}>
      {Array.from({ length: segments }).map((_, i) => {
        const frac = i / segments
        const color = frac < 0.6 ? '#2dd45f' : frac < 0.85 ? '#fbbf24' : '#ef4444'
        return (
          <mesh key={i} position={[0, 0, -i * (segLength + 0.018)]}>
            <boxGeometry args={[width, 0.018, segLength]} />
            <meshStandardMaterial
              ref={(m) => (mats.current[i] = m)}
              color='#0a0a0c'
              emissive={color}
              emissiveIntensity={0.07}
              roughness={0.6}
            />
          </mesh>
        )
      })}
    </group>
  )
}
