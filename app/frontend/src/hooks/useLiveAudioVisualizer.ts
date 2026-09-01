import { useState, useEffect, useRef } from 'react'

interface UseLiveAudioVisualizerOptions {
  isActive: boolean
  barCount?: number
}

export function useLiveAudioVisualizer({ isActive, barCount = 32 }: UseLiveAudioVisualizerOptions) {
  const [frequencies, setFrequencies] = useState<number[]>(() => new Array(barCount).fill(0))
  const [volume, setVolume] = useState<number>(0)
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isActive) {
      // Clean up audio tracks & context
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      setFrequencies(new Array(barCount).fill(0))
      setVolume(0)
      return
    }

    let isMounted = true

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop())
          return
        }

        mediaStreamRef.current = stream
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        const audioContext = new AudioContextClass()
        audioContextRef.current = audioContext

        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 64
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)
        analyserRef.current = analyser

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const updateVisuals = () => {
          if (!isMounted || !analyserRef.current) return

          analyserRef.current.getByteFrequencyData(dataArray)

          // Map frequency bins into normalized 0-1 bars
          const newFrequencies: number[] = []
          let sum = 0

          for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * bufferLength)
            const val = (dataArray[dataIndex] || 0) / 255
            newFrequencies.push(val)
            sum += val
          }

          setFrequencies(newFrequencies)
          setVolume(sum / barCount)

          animationFrameRef.current = requestAnimationFrame(updateVisuals)
        }

        animationFrameRef.current = requestAnimationFrame(updateVisuals)
      } catch (err) {
        console.warn('Microphone visualizer permission or device error:', err)
      }
    }

    initAudio()

    return () => {
      isMounted = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [isActive, barCount])

  return {
    frequencies,
    volume,
  }
}
