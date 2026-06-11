/**
 * Extracts peak data from an AudioBuffer for the CDJ screens.
 * `detail` is a fixed-rate array (perSecond buckets/sec) used by the scrolling
 * waveform; `overview` is a fixed-length resample of it for the full-track bar.
 */
export function computeWaveform(buffer, perSecond = 50, overviewBuckets = 480) {
  const left = buffer.getChannelData(0)
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left
  const bucketCount = Math.max(1, Math.ceil(buffer.duration * perSecond))
  const samplesPerBucket = Math.max(1, Math.floor(buffer.length / bucketCount))
  // Sampling a stride of the bucket is enough for display purposes and keeps
  // decode-time analysis fast on long tracks.
  const stride = Math.max(1, Math.floor(samplesPerBucket / 64))

  const detail = new Float32Array(bucketCount)
  for (let i = 0; i < bucketCount; i++) {
    const start = i * samplesPerBucket
    const end = Math.min(start + samplesPerBucket, buffer.length)
    let peak = 0
    for (let j = start; j < end; j += stride) {
      const v = Math.abs(left[j] + right[j]) * 0.5
      if (v > peak) peak = v
    }
    detail[i] = peak
  }

  const overview = new Float32Array(overviewBuckets)
  const perOv = bucketCount / overviewBuckets
  for (let i = 0; i < overviewBuckets; i++) {
    const start = Math.floor(i * perOv)
    const end = Math.min(Math.max(start + 1, Math.floor((i + 1) * perOv)), bucketCount)
    let peak = 0
    for (let j = start; j < end; j++) if (detail[j] > peak) peak = detail[j]
    overview[i] = peak
  }

  let max = 0
  for (let i = 0; i < bucketCount; i++) if (detail[i] > max) max = detail[i]
  if (max > 0) {
    const scale = 1 / max
    for (let i = 0; i < bucketCount; i++) detail[i] = Math.min(1, detail[i] * scale)
    for (let i = 0; i < overviewBuckets; i++) overview[i] = Math.min(1, overview[i] * scale)
  }

  return { detail, overview, perSecond }
}
