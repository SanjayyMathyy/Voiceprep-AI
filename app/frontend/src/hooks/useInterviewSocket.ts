import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'

export interface WebSocketEvent {
  type: string
  state?: string
  question_id?: string
  question_text?: string
  intent?: string
  order_index?: number
  total_questions?: number
  is_followup?: boolean
  evaluation?: any
  current_score?: number
  overall_score?: number
  message?: string
  text?: string       // For "transcript" events from Whisper STT
  [key: string]: any
}

interface UseInterviewSocketProps {
  sessionId: string
  token: string | null
  onEvent: (event: WebSocketEvent) => void
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

function getWebSocketBase(): string {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL.replace(/\/+$/, '')
  }
  if (API_BASE_URL.startsWith('/')) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}`
  }
  return API_BASE_URL
    .replace(/^https:\/\//i, 'wss://')
    .replace(/^http:\/\//i, 'ws://')
    .replace(/\/api\/?$/i, '')
    .replace(/\/+$/, '')
}

export function useInterviewSocket({ sessionId, token, onEvent }: UseInterviewSocketProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const { token: authToken } = useAuthStore()

  useEffect(() => {
    if (!sessionId) return

    const wsBase = getWebSocketBase()
    const wsUrl = `${wsBase}/api/v1/interviews/${sessionId}/ws${token ? `?token=${token}` : ''}`
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.binaryType = 'arraybuffer' // ensure binary frames come back as ArrayBuffer

    socket.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    socket.onmessage = (event) => {
      // Only handle text (JSON) messages here; binary would be handled elsewhere if needed
      if (typeof event.data === 'string') {
        try {
          const data: WebSocketEvent = JSON.parse(event.data)
          onEventRef.current(data)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }
    }

    socket.onerror = (e) => {
      console.error('WebSocket error:', e)
      setError('Connection error')
    }

    socket.onclose = () => {
      setIsConnected(false)
    }

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close()
      }
    }
  }, [sessionId, token])

  const sendEvent = useCallback((type: string, payload: Record<string, any> = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, ...payload }))
    }
  }, [])

  /**
   * Transcribe audio via HTTP POST to /api/v1/stt/transcribe.
   *
   * WHY HTTP instead of WebSocket binary frames:
   *   - WebSocket binary frames have ordering/timing race conditions
   *   - WebSocket connections drop during TTS playback → audio lost
   *   - HTTP multipart upload is universally reliable for file data
   *   - On success we send the transcript as an `answer` event over the WS
   */
  const sendAudioForTranscription = useCallback(
    async (
      audioBlob: Blob,
      mimeType: string,
      durationMs: number,
      fallbackTranscript?: string
    ) => {
      const socket = socketRef.current

      // Guard: don't bother sending tiny blobs that are clearly empty
      if (audioBlob.size < 200) {
        console.warn('[STT] Audio blob too small (%d bytes) — skipping', audioBlob.size)
        if (fallbackTranscript && socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'answer',
            transcript: fallbackTranscript,
            duration_seconds: Math.max(1, Math.round(durationMs / 1000)),
          }))
        }
        return
      }

      const durationSeconds = Math.max(1, Math.round(durationMs / 1000))

      // Build multipart form data
      const form = new FormData()
      const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm'
      form.append('audio', new File([audioBlob], `recording.${ext}`, { type: mimeType }))
      form.append('mime_type', mimeType)

      // Use the JWT from the auth store for the Authorization header
      const jwt = authToken || token || ''

      console.log(`[STT] POSTing ${audioBlob.size} bytes (${mimeType}, ${durationMs}ms) to HTTP endpoint`)

      try {
        const sttUrl = `${API_BASE_URL}/v1/stt/transcribe`
        const resp = await fetch(sttUrl, {
          method: 'POST',
          headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
          body: form,
        })

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}: ${await resp.text()}`)
        }

        const data = await resp.json()
        const transcript: string | null = data.transcript

        console.log('[STT] HTTP response:', data)

        if (transcript && transcript.trim()) {
          // Echo transcript back to own event handler so UI updates immediately
          onEventRef.current({ type: 'transcript', text: transcript })

          // Now tell the backend WebSocket to evaluate this answer
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'answer',
              transcript: transcript.trim(),
              duration_seconds: durationSeconds,
            }))
          }
        } else if (fallbackTranscript && fallbackTranscript.trim()) {
          // Whisper returned empty — use browser speech recognition fallback
          console.log('[STT] Whisper empty, using browser SR fallback:', fallbackTranscript)
          onEventRef.current({ type: 'transcript', text: fallbackTranscript })

          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'answer',
              transcript: fallbackTranscript.trim(),
              duration_seconds: durationSeconds,
            }))
          }
        } else {
          onEventRef.current({
            type: 'stt_error',
            message: data.error || 'Could not transcribe audio. Please speak clearly and try again.',
          })
        }
      } catch (err: any) {
        console.error('[STT] HTTP transcription failed:', err)

        // If network fails but we have browser SR text, use it
        if (fallbackTranscript && fallbackTranscript.trim()) {
          onEventRef.current({ type: 'transcript', text: fallbackTranscript })
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'answer',
              transcript: fallbackTranscript.trim(),
              duration_seconds: durationSeconds,
            }))
          }
        } else {
          onEventRef.current({
            type: 'stt_error',
            message: 'Transcription request failed. Please check your connection.',
          })
        }
      }
    },
    [sendEvent]
  )

  const startInterview = useCallback(() => {
    sendEvent('start_interview')
  }, [sendEvent])

  const notifyTtsCompleted = useCallback(() => {
    sendEvent('tts_completed')
  }, [sendEvent])

  // Legacy text-mode answer (used as fallback when Whisper unavailable)
  const sendAnswer = useCallback((transcript: string, durationSeconds: number = 0) => {
    sendEvent('answer', { transcript, duration_seconds: durationSeconds })
  }, [sendEvent])

  return {
    isConnected,
    error,
    startInterview,
    notifyTtsCompleted,
    sendAnswer,
    sendAudioForTranscription,
  }
}
