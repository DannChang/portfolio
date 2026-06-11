'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { getDJEngine } from '@/helpers/audio/DJEngine'
import { RigContext } from './controls'
import { CDJ3000 } from './CDJ3000'
import { Mixer } from './Mixer'

/** Pulls the camera back on narrow viewports so the whole rig stays in frame. */
function ResponsiveCamera() {
  const size = useThree((s) => s.size)
  const k = Math.max(1, Math.min(1.9, 1.6 / (size.width / Math.max(1, size.height))))
  return <PerspectiveCamera makeDefault fov={42} position={[0, 4.7 * k, 5.9 * k]} />
}

/** Exposes the r3f state alongside window.__djEngine for console tinkering. */
function DebugHandle() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    window.__djThree = get
    return () => {
      if (window.__djThree === get) delete window.__djThree
    }
  }, [get])
  return null
}

export function DJRig() {
  const engine = getDJEngine()
  const controlsRef = useRef()

  // Knob/fader/jog drags own the pointer; pause the orbit camera meanwhile.
  const setDragging = useCallback((dragging) => {
    if (controlsRef.current) controlsRef.current.enabled = !dragging
  }, [])
  const ctxValue = useMemo(() => ({ engine, setDragging }), [engine, setDragging])

  return (
    <RigContext.Provider value={ctxValue}>
      <color attach='background' args={['#050507']} />
      <fog attach='fog' args={['#050507', 10, 24]} />
      <ResponsiveCamera />
      <DebugHandle />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0, 0.4]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={16}
        minPolarAngle={0.2}
        maxPolarAngle={1.25}
        minAzimuthAngle={-0.95}
        maxAzimuthAngle={0.95}
      />

      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 8, 5]} intensity={0.9} />
      <pointLight position={[-5, 3, -2]} color='#7c3aed' intensity={1.1} distance={14} />
      <pointLight position={[5, 3, -2]} color='#0891b2' intensity={1.1} distance={14} />
      <pointLight position={[0, 5, 3.5]} color='#ffffff' intensity={0.45} distance={12} />

      <CDJ3000 deckIndex={0} accent='#a855f7' position={[-2.16, 0, 0]} />
      <Mixer position={[0, 0, 0]} />
      <CDJ3000 deckIndex={1} accent='#22d3ee' position={[2.16, 0, 0]} />

      {/* stage */}
      <mesh position={[0, -0.17, 0]}>
        <boxGeometry args={[7.6, 0.32, 4.0]} />
        <meshStandardMaterial color='#101013' roughness={0.85} metalness={0.1} />
      </mesh>
      <mesh position={[0, -0.06, 2.02]}>
        <boxGeometry args={[7.6, 0.05, 0.05]} />
        <meshStandardMaterial color='#0a0a0c' emissive='#7c3aed' emissiveIntensity={1.6} />
      </mesh>
      <mesh position={[0, -0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color='#060608' roughness={0.95} />
      </mesh>
    </RigContext.Provider>
  )
}
