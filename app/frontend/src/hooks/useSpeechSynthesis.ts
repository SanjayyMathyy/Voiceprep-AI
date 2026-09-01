import { useState, useCallback, useRef, useEffect } from 'react'

export interface NeuralVoice {
  id: string
  name: string
  gender: string
  locale: string
}

const DEFAULT_NEURAL_VOICES: NeuralVoice[] = [
  { id: 'en-US-JennyNeural', name: 'Jenny (Natural US Female)', gender: 'Female', locale: 'en-US' },
  { id: 'en-US-GuyNeural', name: 'Guy (Professional US Male)', gender: 'Male', locale: 'en-US' },
  { id: 'en-US-AriaNeural', name: 'Aria (Expressive US Female)', gender: 'Female', locale: 'en-US' },
  { id: 'en-US-ChristopherNeural', name: 'Christopher (Executive US Male)', gender: 'Male', locale: 'en-US' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia (British Natural Female)', gender: 'Female', locale: 'en-GB' },
  { id: 'en-GB-RyanNeural', name: 'Ryan (British Professional Male)', gender: 'Male', locale: 'en-GB' },
  { id: 'en-AU-NatashaNeural', name: 'Natasha (Australian Female)', gender: 'Female', locale: 'en-AU' },
  { id: 'en-IN-NeerjaNeural', name: 'Neerja (Indian English Female)', gender: 'Female', locale: 'en-IN' },
]

interface UseSpeechSynthesisProps {
  onStart?: () => void
  onEnd?: () => void
  rate?: number
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export function useSpeechSynthesis({ onStart, onEnd, rate = 1.0 }: UseSpeechSynthesisProps = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<NeuralVoice[]>(DEFAULT_NEURAL_VOICES)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('en-US-JennyNeural')
  const isSpeakingRef = useRef(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  // ─── Cleanup: stop any playing audio when component unmounts ──────────────
  // This prevents TTS audio from leaking to other pages when the user
  // navigates away from the interview room mid-speech.
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.src = ''
        currentAudioRef.current = null
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      isSpeakingRef.current = false
    }
  }, [])

  // Fetch live neural voices from backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/v1/tts/voices`)
      .then(res => res.json())
      .then((data: NeuralVoice[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setVoices(data)
        }
      })
      .catch(() => {
        setVoices(DEFAULT_NEURAL_VOICES)
      })
  }, [])

  const speak = useCallback(
    async (text: string, overrideVoiceId?: string) => {
      // 1. Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
        currentAudioRef.current = null
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }

      const chosenVoice = overrideVoiceId || selectedVoiceId || 'en-US-JennyNeural'

      try {
        // 2. Play Ultra-Realistic Neural Speech from Backend
        const params = new URLSearchParams({
          text: text,
          voice: chosenVoice,
          speed: rate.toString(),
        })

        const audioUrl = `${API_BASE_URL}/v1/tts/synthesize?${params.toString()}`
        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio
        let aborted = false  // flag set when we intentionally stop audio

        audio.onplay = () => {
          setIsSpeaking(true)
          isSpeakingRef.current = true
          if (onStart) onStart()
        }

        audio.onended = () => {
          setIsSpeaking(false)
          isSpeakingRef.current = false
          currentAudioRef.current = null
          // Only call onEnd if the audio finished naturally (not aborted by navigation)
          if (!aborted && onEnd) onEnd()
        }

        audio.onpause = () => {
          // Pause can fire when we navigate away — treat as abort
          if (audio.currentTime < audio.duration || isNaN(audio.duration)) {
            aborted = true
          }
        }

        audio.onerror = (e) => {
          if (!aborted) {
            console.warn('Backend neural audio playback failed, falling back to browser speech:', e)
            fallbackBrowserSpeech(text, chosenVoice)
          }
        }

        await audio.play()
      } catch (err: any) {
        // AbortError means we navigated away — don't trigger onEnd/fallback
        if (err?.name === 'AbortError') {
          console.log('[TTS] play() aborted by navigation — suppressing onEnd')
          isSpeakingRef.current = false
          setIsSpeaking(false)
          return
        }
        console.warn('Neural audio stream error, attempting fallback:', err)
        fallbackBrowserSpeech(text, chosenVoice)
      }
    },
    [onStart, onEnd, rate, selectedVoiceId]
  )

  const fallbackBrowserSpeech = (text: string, chosenVoiceName: string) => {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd()
      return
    }

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.pitch = 1.0

    const browserVoices = window.speechSynthesis.getVoices()
    const match = browserVoices.find(v => v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')) ||
                  browserVoices.find(v => v.lang.startsWith('en'))
    if (match) utterance.voice = match

    utterance.onstart = () => {
      setIsSpeaking(true)
      isSpeakingRef.current = true
      if (onStart) onStart()
    }
    utterance.onend = () => {
      setIsSpeaking(false)
      isSpeakingRef.current = false
      if (onEnd) onEnd()
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      isSpeakingRef.current = false
      if (onEnd) onEnd()
    }

    window.speechSynthesis.speak(utterance)
  }

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current.currentTime = 0
      currentAudioRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    isSpeakingRef.current = false
  }, [])

  return {
    isSpeaking,
    speak,
    stop,
    voices,
    selectedVoiceId,
    setSelectedVoiceId,
  }
}
