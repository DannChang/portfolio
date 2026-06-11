'use client'

import { useContext } from 'react'
import { RoundedBox } from '@react-three/drei'
import { Fader, Knob, Label, RigContext, VUMeter } from './controls'

function ChannelStrip({ x, channel, getLevel, accent }) {
  return (
    <>
      <Knob position={[x, 0, -1.3]} label='TRIM' getValue={() => channel.values.trim} setValue={(v) => channel.setTrim(v)} size={0.08} />
      <Knob position={[x, 0, -0.92]} label='HI' getValue={() => channel.values.high} setValue={(v) => channel.setEq('high', v)} size={0.08} />
      <Knob position={[x, 0, -0.56]} label='MID' getValue={() => channel.values.mid} setValue={(v) => channel.setEq('mid', v)} size={0.08} />
      <Knob position={[x, 0, -0.2]} label='LOW' getValue={() => channel.values.low} setValue={(v) => channel.setEq('low', v)} size={0.08} />
      <Knob
        position={[x, 0, 0.24]}
        label='FILTER'
        accent={accent}
        labelColor={accent}
        getValue={() => channel.values.filter}
        setValue={(v) => channel.setFilter(v)}
        size={0.085}
      />
      <VUMeter position={[x * 0.29, 0, -0.52]} getLevel={getLevel} />
      <Fader
        position={[x, 0, 1.05]}
        axis='z'
        travel={0.6}
        getValue={() => channel.values.fader}
        setValue={(v) => channel.setFader(v)}
      />
    </>
  )
}

export function Mixer({ position }) {
  const { engine } = useContext(RigContext)

  return (
    <group position={position}>
      <RoundedBox args={[1.6, 0.16, 3.2]} radius={0.04} position={[0, 0.08, 0]}>
        <meshStandardMaterial color='#111114' roughness={0.7} metalness={0.15} />
      </RoundedBox>
      <RoundedBox args={[1.5, 0.014, 3.08]} radius={0.007} position={[0, 0.165, 0]}>
        <meshStandardMaterial color='#17171b' roughness={0.85} />
      </RoundedBox>

      <group position={[0, 0.172, 0]}>
        <Knob
          position={[0, 0, -1.42]}
          label='MASTER'
          getValue={() => engine.master * 2 - 1}
          setValue={(v) => engine.setMaster((v + 1) / 2)}
          size={0.07}
        />

        <ChannelStrip x={-0.45} channel={engine.channels[0]} getLevel={() => engine.getLevel('ch0')} accent='#a855f7' />
        <ChannelStrip x={0.45} channel={engine.channels[1]} getLevel={() => engine.getLevel('ch1')} accent='#22d3ee' />

        <Label text='A' height={0.07} color='#a855f7' position={[-0.45, 0.012, 0.62]} />
        <Label text='B' height={0.07} color='#22d3ee' position={[0.45, 0.012, 0.62]} />

        {/* crossfader */}
        <Fader
          position={[0, 0, 1.52]}
          axis='x'
          travel={0.7}
          centerTick
          getValue={() => engine.crossfader}
          setValue={(v) => engine.setCrossfader(v)}
        />
        <Label text='A' height={0.06} color='#a855f7' position={[-0.55, 0.012, 1.52]} />
        <Label text='B' height={0.06} color='#22d3ee' position={[0.55, 0.012, 1.52]} />
      </group>
    </group>
  )
}
