'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { RoomEnvironment } from 'three-stdlib'
import { scrollState } from '@/helpers/scrollState'

const BALL_RADIUS = 1
const TILE = 0.088
const SPIN_SPEED = 0.16 // rad/s ≈ 1.5 rpm — real disco-motor pace

// Deterministic pseudo-random (stable across renders/HMR, no hydration risk)
function prand(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function makeRadialTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.encoding = THREE.sRGBEncoding
  return t
}

/**
 * Mirror tiles laid out in latitude bands, each aligned to the surface normal
 * with a tiny deterministic tilt — that tilt scatter is what makes a real
 * ball shimmer instead of reading as one smooth chrome sphere.
 */
function buildFacets() {
  const matrices = []
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const tilt = new THREE.Quaternion()
  const axis = new THREE.Vector3()
  const scale = new THREE.Vector3(TILE, TILE, 1)
  const Z = new THREE.Vector3(0, 0, 1)
  const bands = Math.round((Math.PI * BALL_RADIUS) / TILE)
  let idx = 0
  for (let b = 1; b < bands; b++) {
    const theta = (b / bands) * Math.PI
    const ringR = Math.sin(theta) * BALL_RADIUS
    const y = Math.cos(theta) * BALL_RADIUS
    const count = Math.max(3, Math.round((2 * Math.PI * ringR) / TILE))
    for (let i = 0; i < count; i++) {
      const phi = ((i + (b % 2) * 0.5) / count) * Math.PI * 2
      pos.set(Math.sin(phi) * ringR, y, Math.cos(phi) * ringR)
      quat.setFromUnitVectors(Z, pos.clone().normalize())
      axis.set(prand(idx) - 0.5, prand(idx + 0.31) - 0.5, prand(idx + 0.62) - 0.5).normalize()
      tilt.setFromAxisAngle(axis, (prand(idx + 0.17) - 0.5) * 0.09)
      quat.multiply(tilt)
      const m = new THREE.Matrix4()
      m.compose(pos, quat, scale)
      matrices.push(m)
      idx++
    }
  }
  return matrices
}

/** Deterministic random directions for the glints and swept light spots. */
function buildDirections(count, seed, maxAbsY = 1) {
  const dirs = []
  for (let i = 0; dirs.length < count; i++) {
    const y = (prand(seed + i) * 2 - 1) * maxAbsY
    const phi = prand(seed + i + 0.5) * Math.PI * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    dirs.push(new THREE.Vector3(Math.sin(phi) * r, y, Math.cos(phi) * r))
  }
  return dirs
}

// Where the ball sits per page section (fractions of the viewport)
const POSE_HERO = { x: 0.26, y: -0.03, scale: 1.0, glow: 1.0 }
const POSE_STORY = { x: -0.3, y: -0.05, scale: 0.72, glow: 0.55 }
const POSE_SERVICES = { x: 0.36, y: 0.32, scale: 0.4, glow: 0.3 }
const POSE_CONTACT = { x: 0, y: 0.02, scale: 0.58, glow: 0.85 }

function smooth(t) {
  return t * t * (3 - 2 * t)
}

function mixPose(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    scale: a.scale + (b.scale - a.scale) * t,
    glow: a.glow + (b.glow - a.glow) * t,
  }
}

export function DiscoBall() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const viewport = useThree((s) => s.viewport)

  const group = useRef()
  const ball = useRef()
  const facetMat = useRef()
  const glintsRef = useRef()
  const dotsRef = useRef()
  const glowRef = useRef()
  const appear = useRef(0)

  // Procedural studio environment so the mirror facets have something to
  // reflect — this is what makes the ball read as mirrored instead of black.
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const rt = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = rt.texture
    return () => {
      scene.environment = null
      rt.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  const facets = useMemo(() => buildFacets(), [])
  const glintDirs = useMemo(() => buildDirections(72, 7.13), [])
  const dotDirs = useMemo(() => buildDirections(110, 41.7, 0.72), [])
  const spriteTex = useMemo(() => makeRadialTexture(), [])

  useEffect(() => () => spriteTex.dispose(), [spriteTex])

  useEffect(() => {
    facets.forEach((m, i) => ball.current.setMatrixAt(i, m))
    ball.current.instanceMatrix.needsUpdate = true
  }, [facets])

  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      p: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      qi: new THREE.Quaternion(),
      s: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      half: new THREE.Vector3(0.45, 0.62, 0.86).normalize(), // key light ⊕ view
      cone: new THREE.Vector3(-0.55, -0.3, -0.78).normalize(),
    }),
    []
  )

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime

    // --- scroll choreography (scrollState is written by the page's GSAP)
    let pose = POSE_HERO
    pose = mixPose(pose, POSE_STORY, smooth(Math.min(1, scrollState.hero)))
    pose = mixPose(pose, POSE_SERVICES, smooth(Math.min(1, scrollState.services)))
    pose = mixPose(pose, POSE_CONTACT, smooth(Math.min(1, scrollState.contact)))

    appear.current = THREE.MathUtils.damp(appear.current, 1, 1.6, delta)
    const narrow = viewport.width < viewport.height * 1.05
    const targetX = (narrow ? pose.x * 0.3 : pose.x) * viewport.width
    const targetY = pose.y * viewport.height
    const targetS = pose.scale * (narrow ? 0.8 : 1) * appear.current

    g.position.x = THREE.MathUtils.damp(g.position.x, targetX, 3.5, delta)
    g.position.y = THREE.MathUtils.damp(g.position.y, targetY, 3.5, delta)
    const s = THREE.MathUtils.damp(g.scale.x, Math.max(0.001, targetS), 3.5, delta)
    g.scale.setScalar(s)

    g.rotation.y += SPIN_SPEED * delta

    const glow = pose.glow * appear.current
    if (facetMat.current) facetMat.current.envMapIntensity = 0.6 + glow * 0.9
    if (glowRef.current) glowRef.current.material.opacity = 0.16 * glow

    const { m, p, q, qi, s: sc, dir, up, half, cone } = tmp
    q.setFromAxisAngle(up, g.rotation.y)
    qi.copy(q).invert()

    // --- facet flash glints: a sparkle fires when a facet's world normal
    // aligns with the half-vector between the key light and the camera
    if (glintsRef.current) {
      for (let i = 0; i < glintDirs.length; i++) {
        dir.copy(glintDirs[i]).applyQuaternion(q)
        const align = Math.max(0, dir.dot(half))
        const twinkle = 0.55 + 0.45 * Math.sin(t * (2.2 + prand(i) * 2.5) + prand(i + 0.4) * Math.PI * 2)
        const k = Math.pow(align, 18) * twinkle * glow
        p.copy(glintDirs[i]).multiplyScalar(BALL_RADIUS * 1.015)
        sc.setScalar(k > 0.012 ? 0.05 + k * 0.34 : 0.0001)
        m.compose(p, qi, sc) // counter-rotate so the quads stay camera-facing
        glintsRef.current.setMatrixAt(i, m)
      }
      glintsRef.current.instanceMatrix.needsUpdate = true
    }

    // --- swept light spots: the dots a mirror ball throws around the room,
    // rotating with the ball, confined to a soft cone behind it
    if (dotsRef.current) {
      const coneIn = Math.cos(0.85)
      const coneOut = Math.cos(0.45)
      for (let i = 0; i < dotDirs.length; i++) {
        dir.copy(dotDirs[i]).applyQuaternion(q)
        const inCone = THREE.MathUtils.smoothstep(dir.dot(cone), coneIn, coneOut)
        const k = inCone * glow * (dir.z < 0.1 ? 1 : 0)
        p.copy(dir).multiplyScalar(2.7)
        sc.setScalar(k > 0.01 ? 0.045 + k * 0.075 : 0.0001)
        m.compose(p, qi, sc)
        dotsRef.current.setMatrixAt(i, m)
      }
      dotsRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      <PerspectiveCamera makeDefault fov={35} position={[0, 0, 7.5]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <pointLight position={[-5, -2, -2]} color='#7c3aed' intensity={0.7} />
      <pointLight position={[5, -3, -3]} color='#0891b2' intensity={0.5} />

      <group ref={group} scale={0.001}>
        {/* mirror tiles */}
        <instancedMesh ref={ball} args={[null, null, facets.length]}>
          <boxGeometry args={[1, 1, 0.035]} />
          <meshStandardMaterial ref={facetMat} color='#d9dae2' metalness={1} roughness={0.08} envMapIntensity={1.4} />
        </instancedMesh>
        {/* dark core behind the tile gaps */}
        <mesh>
          <sphereGeometry args={[BALL_RADIUS * 0.985, 48, 32]} />
          <meshStandardMaterial color='#0b0b0e' roughness={0.85} metalness={0.2} />
        </mesh>
        {/* hanging stem */}
        <mesh position={[0, BALL_RADIUS + 0.16, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.32, 12]} />
          <meshStandardMaterial color='#3a3a42' metalness={0.9} roughness={0.3} />
        </mesh>

        {/* flash glints on the surface */}
        <instancedMesh ref={glintsRef} args={[null, null, glintDirs.length]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={spriteTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </instancedMesh>

        {/* light spots swept around the room */}
        <instancedMesh ref={dotsRef} args={[null, null, dotDirs.length]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={spriteTex}
            color='#cdb4ff'
            transparent
            opacity={0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </instancedMesh>

        {/* soft halo behind the ball */}
        <mesh ref={glowRef} position={[0, 0, -1.4]} scale={5.4}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={spriteTex}
            color='#8b5cf6'
            transparent
            opacity={0.16}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </>
  )
}
