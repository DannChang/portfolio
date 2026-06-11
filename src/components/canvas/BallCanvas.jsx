'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { DiscoBall } from './DiscoBall'

/**
 * Dedicated, transparent canvas for the homepage disco ball. Like /dj, this
 * route avoids the shared tunnel canvas: the tunnel's cross-renderer update
 * has a first-mount race in this dependency tree (content only appears after
 * an HMR remount), and a display-only layer has no need for it.
 */
export function BallCanvas() {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
      <Suspense fallback={null}>
        <DiscoBall />
      </Suspense>
    </Canvas>
  )
}
