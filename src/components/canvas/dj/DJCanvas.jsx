'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { DJRig } from './DJRig'

/**
 * The booth gets its own Canvas (instead of the shared tunnel canvas) on
 * purpose: r3f binds pointer events to this canvas element only, so clicks on
 * the DOM overlay (load buttons, links) can never leak into the 3D scene —
 * with the shared canvas they bubble through the layout wrapper and get
 * raycast into the rig.
 */
export function DJCanvas() {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <Suspense fallback={null}>
        <DJRig />
      </Suspense>
    </Canvas>
  )
}
