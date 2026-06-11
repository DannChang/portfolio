'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getDJEngine } from '@/helpers/audio/DJEngine'

const DJCanvas = dynamic(() => import('@/components/canvas/dj/DJCanvas').then((mod) => mod.DJCanvas), {
  ssr: false,
  loading: () => (
    <div className='flex h-full w-full flex-col items-center justify-center text-gray-500'>
      Warming up the booth…
    </div>
  ),
})

const DECK_META = [
  { letter: 'A', color: '#a855f7' },
  { letter: 'B', color: '#22d3ee' },
]

const EMPTY_DECK = { title: null, bpm: null, playing: false, loading: false, error: null }

function readSnapshot(engine) {
  return {
    decks: engine.decks.map((d, i) => ({
      title: d.title,
      bpm: d.bpm,
      playing: d.playing,
      loading: engine.loading[i],
      error: engine.errors[i],
    })),
  }
}

function DeckCard({ index, deck, onLoad, onDemo }) {
  const meta = DECK_META[index]
  return (
    <div className='glass pointer-events-auto flex flex-col gap-1 rounded-lg p-3' style={{ minWidth: '15rem' }}>
      <div className='flex items-center gap-2'>
        <span
          className='inline-block h-2.5 w-2.5 rounded-full'
          style={{ background: meta.color, boxShadow: deck.playing ? `0 0 8px ${meta.color}` : 'none' }}
        />
        <span className='text-xs font-bold tracking-widest text-gray-400'>DECK {meta.letter}</span>
        {deck.bpm && (
          <span className='ml-auto rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-white'>
            {deck.bpm.toFixed(1)} BPM
          </span>
        )}
      </div>
      <div className='truncate text-sm font-semibold text-white' style={{ maxWidth: '15rem' }}>
        {deck.loading ? 'Analyzing…' : deck.title || 'No track loaded'}
      </div>
      {deck.error && <div className='text-xs text-red-400'>{deck.error}</div>}
      <div className='mt-1 flex gap-2'>
        <button
          onClick={onLoad}
          disabled={deck.loading}
          className='rounded-full bg-purple-600 px-4 py-1 text-xs font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50'
        >
          Load track
        </button>
        <button
          onClick={onDemo}
          disabled={deck.loading}
          className='rounded-full border border-purple-400 px-4 py-1 text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-400/20 disabled:opacity-50'
        >
          Demo track
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  const engineRef = useRef(null)
  if (engineRef.current === null && typeof window !== 'undefined') {
    engineRef.current = getDJEngine()
  }

  const [snapshot, setSnapshot] = useState({ decks: [EMPTY_DECK, EMPTY_DECK] })
  const [dropSide, setDropSide] = useState(null)
  const fileInputA = useRef(null)
  const fileInputB = useRef(null)
  const fileInputs = [fileInputA, fileInputB]

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return undefined
    const update = () => setSnapshot(readSnapshot(engine))
    update()
    return engine.subscribe(update)
  }, [])

  // Browsers require a user gesture before audio can start.
  const unlockAudio = useCallback(() => {
    engineRef.current?.ensure()
  }, [])

  const onFileChange = useCallback((index, e) => {
    const file = e.target.files?.[0]
    if (file) engineRef.current?.loadFile(index, file)
    e.target.value = ''
  }, [])

  const onDragOver = useCallback((e) => {
    if (!Array.from(e.dataTransfer?.types ?? []).includes('Files')) return
    e.preventDefault()
    setDropSide(e.clientX < window.innerWidth / 2 ? 0 : 1)
  }, [])

  const onDrop = useCallback((e) => {
    if (!Array.from(e.dataTransfer?.types ?? []).includes('Files')) return
    e.preventDefault()
    const side = e.clientX < window.innerWidth / 2 ? 0 : 1
    setDropSide(null)
    const file = e.dataTransfer.files?.[0]
    if (file) engineRef.current?.loadFile(side, file)
  }, [])

  return (
    <div
      className='relative h-screen w-screen overflow-hidden bg-black'
      onPointerDown={unlockAudio}
      onDragOver={onDragOver}
      onDragLeave={() => setDropSide(null)}
      onDrop={onDrop}
    >
      <div className='absolute inset-0 h-full w-full'>
        <DJCanvas />
      </div>

      {/* top bar */}
      <div className='pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 p-4'>
        <div className='glass pointer-events-auto rounded-lg p-3'>
          <Link href='/' className='text-xs text-gray-400 transition-colors hover:text-purple-300'>
            ← Dan Chang
          </Link>
          <h1 className='gradient-text text-xl font-bold'>Virtual DJ Booth</h1>
          <p className='text-xs text-gray-400'>Two CDJ-3000s + mixer, built in Three.js</p>
        </div>
        <div className='flex flex-wrap gap-3'>
          {snapshot.decks.map((deck, i) => (
            <DeckCard
              key={i}
              index={i}
              deck={deck}
              onLoad={() => fileInputs[i].current?.click()}
              onDemo={() => engineRef.current?.loadDemo(i)}
            />
          ))}
        </div>
      </div>

      {/* bottom hints */}
      <div className='pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center px-4'>
        <div className='glass rounded-full px-5 py-2 text-center text-xs text-gray-300'>
          Load a track on each deck, press <span className='font-bold text-green-400'>PLAY</span>, then blend with the
          crossfader · drag the jogs to scratch & pitch-bend · tap a screen&apos;s bottom waveform to seek ·
          double-click any knob to reset · drag empty space to orbit
        </div>
      </div>

      {/* drag & drop overlay */}
      {dropSide !== null && (
        <div className='pointer-events-none absolute inset-0 z-20 flex'>
          {DECK_META.map((meta, i) => (
            <div
              key={i}
              className='flex h-full w-1/2 items-center justify-center border-2 border-dashed transition-colors'
              style={{
                borderColor: dropSide === i ? meta.color : 'transparent',
                background: dropSide === i ? `${meta.color}14` : 'transparent',
              }}
            >
              <div className='glass rounded-lg px-6 py-3 text-lg font-bold text-white' style={{ opacity: dropSide === i ? 1 : 0.25 }}>
                Drop to load Deck {meta.letter}
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputA} type='file' accept='audio/*' className='hidden' onChange={(e) => onFileChange(0, e)} />
      <input ref={fileInputB} type='file' accept='audio/*' className='hidden' onChange={(e) => onFileChange(1, e)} />
    </div>
  )
}
