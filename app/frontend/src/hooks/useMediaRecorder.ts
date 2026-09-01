/**
 * useMediaRecorder.ts
 *
 * Captures microphone audio using direct Web Audio PCM recording (WavRecorder)
 * and directly outputs standard 16-bit 16,000 Hz mono PCM WAV blobs.
 *
 * This completely avoids browser MediaRecorder container/codec bugs,
 * chunk fragmentation, and decodeAudioData failures.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { WavRecorder, type WavRecorderResult } from '@/utils/wavRecorder'

export interface MediaRecorderResult {
  blob: Blob
  mimeType: string
  durationMs: number
}

interface UseMediaRecorderOptions {
  onChunk?: (chunk: Blob) => void
  timesliceMs?: number
  barCount?: number
}

export function useMediaRecorder({
  barCount = 32,
}: UseMediaRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [volume, setVolume] = useState(0)
  const [frequencies, setFrequencies] = useState<number[]>(() => new Array(barCount).fill(0))

  const recorderRef = useRef<WavRecorder | null>(null)

  const startRecording = useCallback(async (): Promise<void> => {
    if (isRecording) return

    try {
      const recorder = new WavRecorder((vol, freqs) => {
        setVolume(vol)
        setFrequencies(freqs.slice(0, barCount))
      })
      recorderRef.current = recorder

      await recorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('useMediaRecorder: Failed to get microphone access:', err)
      throw err
    }
  }, [isRecording, barCount])

  const stopRecording = useCallback(async (): Promise<MediaRecorderResult | null> => {
    const recorder = recorderRef.current
    if (!recorder) return null

    try {
      const res: WavRecorderResult | null = await recorder.stop()
      recorderRef.current = null
      setIsRecording(false)
      setVolume(0)
      setFrequencies(new Array(barCount).fill(0))

      if (!res) return null

      console.log(`[MediaRecorder] Captured ${Math.round(res.sizeBytes / 1024)} KB 16-bit WAV (${(res.durationMs / 1000).toFixed(1)}s)`)

      return {
        blob: res.blob,
        mimeType: 'audio/wav',
        durationMs: res.durationMs,
      }
    } catch (err) {
      console.error('useMediaRecorder: Error stopping recorder:', err)
      recorderRef.current = null
      setIsRecording(false)
      return null
    }
  }, [barCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.stop().catch(() => {})
        recorderRef.current = null
      }
    }
  }, [])

  return {
    startRecording,
    stopRecording,
    isRecording,
    volume,
    frequencies,
  }
}
