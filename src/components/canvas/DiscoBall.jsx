'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

export function DiscoBall() {
  const meshRef = useRef()
  const groupRef = useRef()
  
  // Create disco ball mirror tiles
  const mirrorTiles = useMemo(() => {
    const tiles = []
    const rows = 20
    const cols = 20
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const phi = (i / rows) * Math.PI
        const theta = (j / cols) * 2 * Math.PI
        
        const x = Math.sin(phi) * Math.cos(theta)
        const y = Math.cos(phi)
        const z = Math.sin(phi) * Math.sin(theta)
        
        tiles.push({
          position: [x * 0.95, y * 0.95, z * 0.95],
          rotation: [Math.atan2(z, x), Math.acos(y), 0],
          scale: [0.05, 0.05, 0.02]
        })
      }
    }
    return tiles
  }, [])

  // Create light sources for disco effect
  const lights = useMemo(() => {
    const lightColors = [
      '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
      '#ff00ff', '#00ffff', '#ff8800', '#8800ff'
    ]
    
    return lightColors.map((color, index) => ({
      color,
      position: [
        Math.sin(index * Math.PI * 2 / lightColors.length) * 5,
        Math.cos(index * Math.PI * 2 / lightColors.length) * 5,
        3
      ]
    }))
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      // Slow rotation of the disco ball
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
    
    // Animate individual mirror tiles
    if (meshRef.current) {
      meshRef.current.children.forEach((child, index) => {
        if (child.material) {
          child.material.opacity = 0.7 + Math.sin(state.clock.elapsedTime * 2 + index * 0.1) * 0.3
        }
      })
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={[2, 2, 2]}>
      {/* Main disco ball sphere */}
      <Sphere ref={meshRef} args={[1, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial 
          color="#ffffff" 
          metalness={1}
          roughness={0.1}
          envMapIntensity={2}
        />
      </Sphere>
      
      {/* Mirror tiles */}
      {mirrorTiles.map((tile, index) => (
        <mesh
          key={index}
          position={tile.position}
          rotation={tile.rotation}
          scale={tile.scale}
        >
          <boxGeometry />
          <meshStandardMaterial
            color="#ffffff"
            metalness={1}
            roughness={0}
            opacity={0.8}
            transparent
            envMapIntensity={3}
          />
        </mesh>
      ))}
      
      {/* Disco lights */}
      {lights.map((light, index) => (
        <pointLight
          key={index}
          color={light.color}
          position={light.position}
          intensity={2}
          distance={10}
          decay={2}
        />
      ))}
      
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.3} />
      
      {/* Spotlight from above */}
      <spotLight
        position={[0, 5, 0]}
        angle={0.5}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Hanging chain */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4]} />
        <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Chain links */}
      {Array.from({ length: 5 }).map((_, index) => (
        <mesh key={index} position={[0, 1.4 + index * 0.1, 0]}>
          <torusGeometry args={[0.03, 0.01, 8, 16]} />
          <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

// Enhanced disco ball with particle effects
export function EnhancedDiscoBall() {
  const particlesRef = useRef()
  
  // Create particle system for light rays
  const particles = useMemo(() => {
    const count = 200
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Random positions around the disco ball
      const radius = 2 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.cos(phi)
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      
      // Random colors
      const color = new THREE.Color()
      color.setHSL(Math.random(), 1, 0.5)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
      
      sizes[i] = Math.random() * 0.1 + 0.05
    }
    
    return { positions, colors, sizes }
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array
      const time = state.clock.elapsedTime
      
      for (let i = 0; i < positions.length; i += 3) {
        // Animate particles in a spiral pattern
        const angle = time * 0.5 + i * 0.01
        const radius = 2 + Math.sin(time + i * 0.1) * 0.5
        
        positions[i] = radius * Math.cos(angle)
        positions[i + 1] = Math.sin(time * 2 + i * 0.05) * 0.5
        positions[i + 2] = radius * Math.sin(angle)
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group>
      <DiscoBall />
      
      {/* Particle system for light rays */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.positions.length / 3}
            array={particles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particles.colors.length / 3}
            array={particles.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particles.sizes.length}
            array={particles.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          vertexColors
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}