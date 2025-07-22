'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'
import { Cylinder, Box, Sphere } from '@react-three/drei'
import * as THREE from 'three'

// Interactive Knob Component
function InteractiveKnob({ position, value, setValue, label, color = '#6366f1' }) {
  const meshRef = useRef()
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [startValue, setStartValue] = useState(0)

  const { camera } = useThree()

  const { rotation } = useSpring({
    rotation: [0, 0, value * Math.PI * 2],
    config: { mass: 1, tension: 280, friction: 60 }
  })

  const handlePointerDown = (e) => {
    e.stopPropagation()
    setIsDragging(true)
    setStartY(e.clientY)
    setStartValue(value)
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    
    const deltaY = startY - e.clientY
    const newValue = Math.max(0, Math.min(1, startValue + deltaY * 0.005))
    setValue(newValue)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing'
    } else {
      document.body.style.cursor = 'auto'
    }

    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [isDragging])

  useEffect(() => {
    const handleGlobalPointerMove = (e) => {
      if (isDragging) {
        handlePointerMove(e)
      }
    }

    const handleGlobalPointerUp = () => {
      if (isDragging) {
        handlePointerUp()
      }
    }

    document.addEventListener('pointermove', handleGlobalPointerMove)
    document.addEventListener('pointerup', handleGlobalPointerUp)

    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove)
      document.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  }, [isDragging, startY, startValue])

  return (
    <group position={position}>
      {/* Knob Base */}
      <Cylinder
        ref={meshRef}
        args={[0.3, 0.3, 0.1, 32]}
        onPointerDown={handlePointerDown}
        onPointerEnter={() => !isDragging && (document.body.style.cursor = 'grab')}
        onPointerLeave={() => !isDragging && (document.body.style.cursor = 'auto')}
      >
        <meshStandardMaterial color="#2a2a2a" />
      </Cylinder>
      
      {/* Knob Top */}
      <animated.mesh rotation={rotation}>
        <Cylinder args={[0.25, 0.25, 0.05, 32]} position={[0, 0.075, 0]}>
          <meshStandardMaterial color={color} />
        </Cylinder>
      </animated.mesh>
      
      {/* Knob Indicator */}
      <animated.mesh rotation={rotation}>
        <Box args={[0.02, 0.15, 0.02]} position={[0, 0.2, 0]}>
          <meshStandardMaterial color="#ffffff" />
        </Box>
      </animated.mesh>
      
      {/* Label */}
      <mesh position={[0, -0.3, 0]}>
        <Box args={[0.8, 0.1, 0.05]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Box>
      </mesh>
    </group>
  )
}

// Interactive Fader Component
function InteractiveFader({ position, value, setValue, label, color = '#6366f1' }) {
  const meshRef = useRef()
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [startValue, setStartValue] = useState(0)

  const { camera } = useThree()

  const { position: faderPosition } = useSpring({
    position: [0, value * 0.8 - 0.4, 0],
    config: { mass: 1, tension: 280, friction: 60 }
  })

  const handlePointerDown = (e) => {
    e.stopPropagation()
    setIsDragging(true)
    setStartY(e.clientY)
    setStartValue(value)
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    
    const deltaY = startY - e.clientY
    const newValue = Math.max(0, Math.min(1, startValue + deltaY * 0.003))
    setValue(newValue)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing'
    } else {
      document.body.style.cursor = 'auto'
    }

    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [isDragging])

  useEffect(() => {
    const handleGlobalPointerMove = (e) => {
      if (isDragging) {
        handlePointerMove(e)
      }
    }

    const handleGlobalPointerUp = () => {
      if (isDragging) {
        handlePointerUp()
      }
    }

    document.addEventListener('pointermove', handleGlobalPointerMove)
    document.addEventListener('pointerup', handleGlobalPointerUp)

    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove)
      document.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  }, [isDragging, startY, startValue])

  return (
    <group position={position}>
      {/* Fader Track */}
      <Box args={[0.05, 1, 0.05]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#2a2a2a" />
      </Box>
      
      {/* Fader Handle */}
      <animated.mesh position={faderPosition}>
        <Box 
          ref={meshRef}
          args={[0.15, 0.1, 0.15]} 
          onPointerDown={handlePointerDown}
          onPointerEnter={() => !isDragging && (document.body.style.cursor = 'grab')}
          onPointerLeave={() => !isDragging && (document.body.style.cursor = 'auto')}
        >
          <meshStandardMaterial color={color} />
        </Box>
      </animated.mesh>
      
      {/* Label */}
      <mesh position={[0, -0.7, 0]}>
        <Box args={[0.8, 0.1, 0.05]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Box>
      </mesh>
    </group>
  )
}

// Main DJ Controller Component
export function DJController({ volume, setVolume, bass, setBass, treble, setTreble }) {
  const groupRef = useRef()
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={[1.5, 1.5, 1.5]}>
      {/* Main Controller Body */}
      <Box args={[4, 0.2, 2]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1a1a1a" />
      </Box>
      
      {/* Controller Surface */}
      <Box args={[3.8, 0.05, 1.8]} position={[0, 0.125, 0]}>
        <meshStandardMaterial color="#2a2a2a" />
      </Box>
      
      {/* Volume Fader */}
      <InteractiveFader
        position={[-1.5, 0.2, 0]}
        value={volume}
        setValue={setVolume}
        label="Volume"
        color="#ef4444"
      />
      
      {/* Bass Knob */}
      <InteractiveKnob
        position={[-0.5, 0.2, 0]}
        value={bass}
        setValue={setBass}
        label="Bass"
        color="#3b82f6"
      />
      
      {/* Treble Knob */}
      <InteractiveKnob
        position={[0.5, 0.2, 0]}
        value={treble}
        setValue={setTreble}
        label="Treble"
        color="#10b981"
      />
      
      {/* Master Volume Fader */}
      <InteractiveFader
        position={[1.5, 0.2, 0]}
        value={volume}
        setValue={setVolume}
        label="Master"
        color="#f59e0b"
      />
      
      {/* LED Indicators */}
      <Sphere args={[0.05, 16, 16]} position={[-1.5, 0.6, 0]}>
        <meshStandardMaterial 
          color={volume > 0.5 ? "#ef4444" : "#4b5563"} 
          emissive={volume > 0.5 ? "#ef4444" : "#000000"}
          emissiveIntensity={0.5}
        />
      </Sphere>
      
      <Sphere args={[0.05, 16, 16]} position={[-0.5, 0.6, 0]}>
        <meshStandardMaterial 
          color={bass > 0.5 ? "#3b82f6" : "#4b5563"} 
          emissive={bass > 0.5 ? "#3b82f6" : "#000000"}
          emissiveIntensity={0.5}
        />
      </Sphere>
      
      <Sphere args={[0.05, 16, 16]} position={[0.5, 0.6, 0]}>
        <meshStandardMaterial 
          color={treble > 0.5 ? "#10b981" : "#4b5563"} 
          emissive={treble > 0.5 ? "#10b981" : "#000000"}
          emissiveIntensity={0.5}
        />
      </Sphere>
      
      <Sphere args={[0.05, 16, 16]} position={[1.5, 0.6, 0]}>
        <meshStandardMaterial 
          color={volume > 0.5 ? "#f59e0b" : "#4b5563"} 
          emissive={volume > 0.5 ? "#f59e0b" : "#000000"}
          emissiveIntensity={0.5}
        />
      </Sphere>
      
      {/* Decorative Elements */}
      <Box args={[0.1, 0.1, 0.1]} position={[-1.8, 0.15, -0.8]}>
        <meshStandardMaterial color="#6366f1" />
      </Box>
      
      <Box args={[0.1, 0.1, 0.1]} position={[1.8, 0.15, -0.8]}>
        <meshStandardMaterial color="#6366f1" />
      </Box>
      
      <Box args={[0.1, 0.1, 0.1]} position={[-1.8, 0.15, 0.8]}>
        <meshStandardMaterial color="#6366f1" />
      </Box>
      
      <Box args={[0.1, 0.1, 0.1]} position={[1.8, 0.15, 0.8]}>
        <meshStandardMaterial color="#6366f1" />
      </Box>
    </group>
  )
}