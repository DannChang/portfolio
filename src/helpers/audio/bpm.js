const FRAME = 1024
const HOP = 512

/**
 * Estimates track BPM via autocorrelation of the onset-energy flux.
 * Analyses up to 70s from the middle of the track. Returns a number rounded
 * to 0.1 BPM (folded into the 70–190 range), or null if no confident pulse.
 */
export function estimateBpm(buffer) {
  try {
    const sr = buffer.sampleRate
    const data = buffer.getChannelData(0)
    const maxSamples = Math.min(data.length, Math.floor(70 * sr))
    const offset = Math.floor((data.length - maxSamples) / 2)
    const frames = Math.floor((maxSamples - FRAME) / HOP)
    if (frames < 128) return null

    const energy = new Float32Array(frames)
    for (let i = 0; i < frames; i++) {
      let sum = 0
      const base = offset + i * HOP
      for (let j = 0; j < FRAME; j += 2) {
        const v = data[base + j]
        sum += v * v
      }
      energy[i] = sum
    }

    // Half-wave rectified energy flux = onset strength
    const flux = new Float32Array(frames)
    let mean = 0
    for (let i = 1; i < frames; i++) {
      flux[i] = Math.max(0, energy[i] - energy[i - 1])
      mean += flux[i]
    }
    mean /= frames
    for (let i = 0; i < frames; i++) flux[i] -= mean

    const fps = sr / HOP
    const minLag = Math.max(2, Math.floor((60 / 200) * fps)) // 200 BPM
    const maxLag = Math.ceil((60 / 60) * fps) // 60 BPM
    const scoreLen = Math.min(maxLag * 2 + 2, frames - 8)
    const score = new Float32Array(scoreLen)
    for (let lag = minLag; lag < scoreLen; lag++) {
      let s = 0
      for (let i = 0; i + lag < frames; i++) s += flux[i] * flux[i + lag]
      score[lag] = s / (frames - lag)
    }

    // Prefer lags whose double also correlates (beat vs. half-beat ambiguity)
    let bestLag = 0
    let bestScore = -Infinity
    for (let lag = minLag; lag <= Math.min(maxLag, scoreLen - 1); lag++) {
      const dbl = lag * 2 < scoreLen ? score[lag * 2] : 0
      const s = score[lag] + 0.5 * dbl
      if (s > bestScore) {
        bestScore = s
        bestLag = lag
      }
    }
    if (bestLag === 0 || bestScore <= 0) return null

    // Parabolic interpolation for sub-frame lag precision (~0.2 BPM)
    let lag = bestLag
    if (bestLag > minLag && bestLag + 1 < scoreLen) {
      const y1 = score[bestLag - 1]
      const y2 = score[bestLag]
      const y3 = score[bestLag + 1]
      const denom = y1 - 2 * y2 + y3
      if (denom !== 0) {
        const shift = (0.5 * (y1 - y3)) / denom
        lag = bestLag + Math.max(-0.5, Math.min(0.5, shift))
      }
    }

    let bpm = (60 * fps) / lag
    while (bpm < 70) bpm *= 2
    while (bpm > 190) bpm /= 2
    return Math.round(bpm * 10) / 10
  } catch (e) {
    return null
  }
}
