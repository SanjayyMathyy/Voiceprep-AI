import { useState, useEffect, useRef, useCallback } from 'react'

interface UseSpeechRecognitionProps {
  onTranscriptComplete?: (transcript: string) => void
}

export function useSpeechRecognition({
  onTranscriptComplete,
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)
  const transcriptRef = useRef('')
  const onTranscriptCompleteRef = useRef(onTranscriptComplete)

  onTranscriptCompleteRef.current = onTranscriptComplete
  transcriptRef.current = transcript

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.warn('[SpeechRec] Web Speech API not supported in this browser.')
      setIsSupported(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        console.log('[SpeechRec] Started listening')
      }

      recognition.onresult = (event: any) => {
        let currentFinal = ''
        let currentInterim = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i]
          if (item.isFinal) {
            currentFinal += item[0].transcript + ' '
          } else {
            currentInterim += item[0].transcript
          }
        }

        if (currentFinal) {
          setTranscript(prev => {
            const updated = (prev + ' ' + currentFinal).trim()
            console.log('[SpeechRec] Final transcript:', updated)
            return updated
          })
        }
        setInterimTranscript(currentInterim)
      }

      recognition.onerror = (event: any) => {
        if (event.error === 'network' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          console.warn('[SpeechRec] Browser speech recognition unavailable (' + event.error + '). Seamlessly using backend Groq Whisper.')
          isListeningRef.current = false
        } else if (event.error !== 'no-speech') {
          console.warn('[SpeechRec] Error:', event.error)
        }
      }

      recognition.onend = () => {
        console.log('[SpeechRec] Ended. isListeningRef:', isListeningRef.current)
        // Auto-restart if we are supposed to be listening
        if (isListeningRef.current) {
          try {
            recognition.start()
          } catch {
            // Already started or busy
          }
        }
      }

      recognitionRef.current = recognition
    } catch (e) {
      console.error('[SpeechRec] Failed to initialize SpeechRecognition:', e)
      setIsSupported(false)
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {}
      }
    }
  }, [])

  const startListening = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setIsListening(true)
    isListeningRef.current = true

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch {
        // Ignored if already started or active
      }
    }
  }, [])

  const stopListening = useCallback((): string => {
    setIsListening(false)
    isListeningRef.current = false

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }

    const finalResult = transcriptRef.current
    if (finalResult && onTranscriptCompleteRef.current) {
      onTranscriptCompleteRef.current(finalResult)
    }
    return finalResult
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  }
}
