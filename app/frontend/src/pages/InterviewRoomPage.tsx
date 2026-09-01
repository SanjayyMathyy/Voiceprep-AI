import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useInterviewSocket, type WebSocketEvent } from '@/hooks/useInterviewSocket'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import VoiceWaveform from '@/components/interview/VoiceWaveform'
import QuestionDisplay from '@/components/interview/QuestionDisplay'
import LiveTranscriptBox from '@/components/interview/LiveTranscriptBox'
import {
  Volume2,
  VolumeX,
  PhoneOff,
  Award,
  Sparkles,
  AlertCircle,
  Settings2,
  FileText,
  Radio,
  Mic,
  Loader2,
  MicOff,
} from 'lucide-react'

type TurnState = 'IDLE' | 'PREPARING' | 'ASKING' | 'LISTENING' | 'EVALUATING' | 'COMPLETED'

export default function InterviewRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { token } = useAuthStore()

  const [state, setState] = useState<TurnState>('IDLE')
  const [currentQuestion, setCurrentQuestion] = useState<{
    id: string
    text: string
    intent?: string
    orderIndex: number
    totalQuestions: number
    isFollowup: boolean
  } | null>(null)

  const [serverTranscript, setServerTranscript] = useState('')
  const [latestEvaluation, setLatestEvaluation] = useState<any>(null)
  const [completedSummary, setCompletedSummary] = useState<any>(null)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [isPushToTalk, setIsPushToTalk] = useState(false)
  const [isHoldingSpace, setIsHoldingSpace] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const hasStartedRef = useRef(false)

  // ── Refs for stable callbacks ──────────────────────────────────────────
  const notifyTtsCompletedRef = useRef<() => void>(() => {})
  const beginRecordingRef = useRef<() => Promise<void>>(async () => {})
  const submitRecordingRef = useRef<(overrideText?: string) => Promise<void>>(async () => {})

  // ── 1. Real-time Live Speech Recognition (Browser Web Speech API) ──────
  const {
    startListening,
    stopListening,
    transcript: liveSpeechTranscript,
    interimTranscript: liveInterimTranscript,
    resetTranscript,
    setTranscript,
  } = useSpeechRecognition()

  // ── 2. MediaRecorder (Real microphone bytes → Groq Whisper API) ─────────
  const {
    startRecording,
    stopRecording,
    isRecording,
    frequencies: liveFrequencies,
  } = useMediaRecorder({ barCount: 32 })

  // ── 3. Neural TTS ───────────────────────────────────────────────────────
  const {
    speak,
    stop: stopSpeaking,
    voices,
    selectedVoiceId,
    setSelectedVoiceId,
  } = useSpeechSynthesis({
    rate: speechRate,
    onEnd: useCallback(() => {
      notifyTtsCompletedRef.current()
      beginRecordingRef.current()
      setState('LISTENING')
    }, []),
  })

  // ── 4. WebSocket ────────────────────────────────────────────────────────
  const handleSocketEvent = useCallback(
    (event: WebSocketEvent) => {
      switch (event.type) {
        case 'interview_started':
          setState('PREPARING')
          break

        case 'question':
          setServerTranscript('')
          resetTranscript()
          setCurrentQuestion({
            id: event.question_id || '',
            text: event.question_text || '',
            intent: event.intent,
            orderIndex: event.order_index || 1,
            totalQuestions: event.total_questions || 5,
            isFollowup: !!event.is_followup,
          })
          setState('ASKING')

          if (ttsEnabled && event.question_text) {
            speak(event.question_text)
          } else {
            notifyTtsCompletedRef.current()
            beginRecordingRef.current()
            setState('LISTENING')
          }
          break

        case 'listening_started':
          setState('LISTENING')
          if (!isPushToTalk) beginRecordingRef.current()
          break

        case 'transcript':
          if (event.text) {
            setServerTranscript(event.text)
            setTranscript(event.text)
          }
          setIsTranscribing(false)
          break

        case 'stt_processing':
          setIsTranscribing(true)
          break

        case 'stt_error':
          setIsTranscribing(false)
          // If we had a live transcript, don't revert to error
          if (!liveSpeechTranscript) {
            setState('LISTENING')
            if (!isPushToTalk) beginRecordingRef.current()
          }
          break

        case 'evaluation_started':
          setState('EVALUATING')
          break

        case 'evaluation_complete':
          setLatestEvaluation(event.evaluation)
          break

        case 'interview_completed':
          setState('COMPLETED')
          stopSpeaking()
          stopListening()
          stopRecording()
          setCompletedSummary(event)
          break

        default:
          break
      }
    },
    [ttsEnabled, speak, stopSpeaking, stopListening, stopRecording, isPushToTalk, resetTranscript, setTranscript, liveSpeechTranscript]
  )

  const {
    isConnected,
    error: wsError,
    startInterview,
    notifyTtsCompleted,
    sendAnswer,
    sendAudioForTranscription,
  } = useInterviewSocket({
    sessionId: sessionId || '',
    token,
    onEvent: handleSocketEvent,
  })

  useEffect(() => {
    notifyTtsCompletedRef.current = notifyTtsCompleted
  }, [notifyTtsCompleted])

  useEffect(() => {
    if (isConnected && !hasStartedRef.current) {
      hasStartedRef.current = true
      startInterview()
    }
  }, [isConnected, startInterview])

  // ── 5. Recording Helpers (Dual STT: Web Speech API + Whisper) ───────────
  const hasSpokenRef = useRef(false)
  const recordingStartTimeRef = useRef(0)

  const beginRecording = useCallback(async () => {
    if (isRecording) return
    setMicError(null)
    setServerTranscript('')
    resetTranscript()
    hasSpokenRef.current = false
    recordingStartTimeRef.current = Date.now()

    try {
      startListening()
      await startRecording()
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone in your browser settings.'
        : err?.name === 'NotFoundError'
        ? 'No microphone found. Please connect a microphone and try again.'
        : 'Could not access microphone. Please check your browser settings.'
      setMicError(msg)
      setIsPushToTalk(true)
    }
  }, [startRecording, isRecording, startListening, resetTranscript])

  const submitRecording = useCallback(async (overrideText?: string) => {
    // Stop live speech recognition first
    const speechFinal = stopListening()
    const currentLiveText = (overrideText || speechFinal || liveSpeechTranscript || serverTranscript || '').trim()

    // 1. If manual override text provided, submit directly
    if (overrideText && overrideText.trim()) {
      setState('EVALUATING')
      setIsTranscribing(false)
      if (isRecording) await stopRecording()
      sendAnswer(overrideText.trim(), 5)
      return
    }

    const result = await stopRecording()
    const durationSeconds = result ? Math.max(1, Math.round(result.durationMs / 1000)) : 5
    setState('EVALUATING')
    setIsTranscribing(true)

    // 2. If valid audio blob captured, send to Whisper with live transcript as fallback
    if (result && result.blob && result.blob.size > 200) {
      await sendAudioForTranscription(
        result.blob,
        result.mimeType,
        result.durationMs,
        currentLiveText
      )
    } else if (currentLiveText) {
      // Audio capture had an issue but real-time speech recognition captured text
      sendAnswer(currentLiveText, durationSeconds)
    } else {
      setIsTranscribing(false)
      setState('LISTENING')
    }
  }, [stopRecording, stopListening, sendAudioForTranscription, sendAnswer, liveSpeechTranscript, serverTranscript, isRecording])

  useEffect(() => { beginRecordingRef.current = beginRecording }, [beginRecording])
  useEffect(() => { submitRecordingRef.current = submitRecording }, [submitRecording])

  // ── 6. Silence VAD ──────────────────────────────────────────────────────
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volumeRef = useRef(0)
  const SILENCE_THRESHOLD = 0.02
  const SILENCE_DURATION_MS = 2500

  const avgVolume = liveFrequencies.reduce((a, b) => a + b, 0) / Math.max(1, liveFrequencies.length)
  volumeRef.current = avgVolume

  // Mark as spoken if there is ANY audio above a low noise floor
  if (avgVolume > 0.01 || liveSpeechTranscript.length > 0) {
    hasSpokenRef.current = true
  }

  useEffect(() => {
    if (isPushToTalk || !isRecording || state !== 'LISTENING') return

    const id = setInterval(() => {
      const elapsed = Date.now() - recordingStartTimeRef.current
      // After 1.5s of recording, check for silence (lowered from 2.5s)
      if (elapsed >= 1500) {
        if (volumeRef.current < SILENCE_THRESHOLD) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              submitRecordingRef.current()
              silenceTimerRef.current = null
            }, SILENCE_DURATION_MS)
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }
          // Any volume means user is speaking — mark as spoken
          hasSpokenRef.current = true
        }
      }
    }, 100)

    return () => {
      clearInterval(id)
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    }
  }, [isPushToTalk, isRecording, state])

  // ── 7. Push-to-Talk Spacebar ────────────────────────────────────────────
  useEffect(() => {
    if (!isPushToTalk || state !== 'LISTENING') return

    const handleKeyDown = async (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.code === 'Space' && !e.repeat && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        setIsHoldingSpace(true)
        if (!isRecording) await beginRecordingRef.current()
      }
    }

    const handleKeyUp = async (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault()
        setIsHoldingSpace(false)
        if (isRecording) await submitRecordingRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isPushToTalk, state, isRecording])

  // Ensure all recording, speech recognition, and TTS halt when interview completes
  useEffect(() => {
    if (state === 'COMPLETED') {
      stopSpeaking()
      stopListening()
      if (isRecording) {
        stopRecording().catch(() => {})
      }
    }
  }, [state, stopSpeaking, stopListening, stopRecording, isRecording])

  // General unmount cleanup
  useEffect(() => {
    return () => {
      stopSpeaking()
      stopListening()
      stopRecording().catch(() => {})
    }
  }, [stopSpeaking, stopListening, stopRecording])

  const handleEndInterview = () => {
    stopSpeaking()
    stopListening()
    if (isRecording) stopRecording()
    navigate('/history')
  }

  // Active display transcript (prefers server refined transcript, otherwise live real-time speech)
  const displayTranscript = serverTranscript || liveSpeechTranscript
  const displayInterim = isTranscribing ? 'Transcribing...' : liveInterimTranscript

  return (
    <main style={{ minHeight: 'calc(100vh - 4rem)', background: 'var(--color-background)', padding: '2rem 0 3.5rem' }}>
      <div className="container-main" style={{ maxWidth: '1080px', margin: '0 auto', width: '100%' }}>

        {/* Top Control Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              width: '0.625rem', height: '0.625rem', borderRadius: '9999px',
              background: isConnected ? '#10B981' : '#EF4444',
              animation: isConnected ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-foreground)' }}>
              {isConnected ? 'Live Session Active' : 'Connecting…'}
            </span>
            {isTranscribing && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--color-accent)' }}>
                <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                Transcribing…
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', position: 'relative' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                padding: '0.5rem 0.75rem', borderRadius: '0.625rem', cursor: 'pointer',
                background: showSettings ? 'rgba(77,212,219,0.15)' : 'var(--color-muted)',
                border: showSettings ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                color: showSettings ? 'var(--color-accent)' : 'var(--color-foreground)',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                fontSize: '0.8125rem', fontWeight: 600,
              }}
            >
              <Settings2 size={15} />
              Audio Settings
            </button>

            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
              style={{
                padding: '0.5rem', borderRadius: '0.625rem',
                background: 'var(--color-muted)', border: '1px solid var(--color-border)',
                cursor: 'pointer',
                color: ttsEnabled ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
              }}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              onClick={handleEndInterview}
              style={{
                padding: '0.5rem 0.875rem', borderRadius: '0.625rem',
                background: 'none', border: '1px solid rgba(239,68,68,0.3)',
                cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
                color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.375rem',
              }}
            >
              <PhoneOff size={14} />
              End Session
            </button>

            {/* Settings Dropdown */}
            {showSettings && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, width: '300px',
                background: 'var(--color-card)', border: '1px solid var(--color-border)',
                borderRadius: '1rem', padding: '1.25rem',
                boxShadow: '0 12px 32px rgba(0,0,0,0.15)', zIndex: 100,
              }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-foreground)' }}>
                  Audio & Voice Controls
                </h4>

                <div style={{ marginBottom: '1.125rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-foreground)', marginBottom: '0.375rem' }}>
                    Microphone Input Mode
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
                    {[
                      { label: 'Hands-Free (VAD)', value: false, icon: <Mic size={13} /> },
                      { label: 'Push-to-Talk', value: true, icon: <Radio size={13} /> },
                    ].map(opt => (
                      <button key={String(opt.value)} type="button" onClick={() => setIsPushToTalk(opt.value)} style={{
                        padding: '0.5rem', borderRadius: '0.5rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                        fontSize: '0.75rem', fontWeight: 600,
                        border: isPushToTalk === opt.value ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                        background: isPushToTalk === opt.value ? 'rgba(77,212,219,0.15)' : 'var(--color-muted)',
                        color: isPushToTalk === opt.value ? 'var(--color-accent)' : 'var(--color-foreground)',
                      }}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-foreground)', marginBottom: '0.375rem' }}>
                    Interviewer Voice
                  </label>
                  <select value={selectedVoiceId || 'en-US-JennyNeural'} onChange={e => setSelectedVoiceId(e.target.value)} style={{
                    width: '100%', padding: '0.5rem', borderRadius: '0.5rem',
                    border: '1px solid var(--color-border)', background: 'var(--color-muted)',
                    color: 'var(--color-foreground)', fontSize: '0.8125rem', outline: 'none',
                  }}>
                    {voices.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-foreground)', marginBottom: '0.375rem' }}>
                    Speaking Speed: {speechRate}x
                  </label>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {[0.9, 1.0, 1.15].map(r => (
                      <button key={r} type="button" onClick={() => setSpeechRate(r)} style={{
                        flex: 1, padding: '0.375rem', borderRadius: '0.375rem',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        border: speechRate === r ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                        background: speechRate === r ? 'rgba(77,212,219,0.15)' : 'var(--color-muted)',
                        color: speechRate === r ? 'var(--color-accent)' : 'var(--color-foreground)',
                      }}>{r}x</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Microphone Error Banner */}
        {micError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '0.75rem', padding: '0.875rem 1.25rem', marginBottom: '1.5rem',
          }}>
            <MicOff size={16} color="#EF4444" />
            <span style={{ fontSize: '0.875rem', color: '#EF4444', flex: 1 }}>{micError}</span>
            <button onClick={() => setMicError(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#EF4444', fontSize: '1.25rem', lineHeight: 1,
            }}>×</button>
          </div>
        )}

        {/* WebSocket error */}
        {wsError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '0.75rem', padding: '0.75rem 1.25rem', marginBottom: '1.5rem',
            fontSize: '0.8125rem', color: '#D97706',
          }}>
            <AlertCircle size={16} />
            WebSocket connection error. Please refresh the page.
          </div>
        )}

        {/* Main Interview Content */}
        <AnimatePresence mode="wait">
          {state === 'COMPLETED' ? (
            <motion.div key="completed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="card-base" style={{ padding: '3rem 2rem', textAlign: 'center' }}
            >
              <div style={{
                width: '4.5rem', height: '4.5rem', borderRadius: '1.25rem',
                background: 'rgba(77, 212, 219, 0.15)', color: 'var(--color-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}>
                <Award size={36} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                Interview Complete!
              </h2>
              <p style={{ color: 'var(--color-muted-foreground)', fontSize: '1rem', marginBottom: '2rem' }}>
                You have finished all questions. Here is your overall performance score:
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'baseline', gap: '0.25rem',
                background: 'rgba(77, 212, 219, 0.10)', border: '1.5px solid rgba(77, 212, 219, 0.35)',
                borderRadius: '1.25rem', padding: '1.25rem 2.5rem', marginBottom: '2.5rem',
              }}>
                <span style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--color-accent)' }}>
                  {completedSummary?.overall_score ?? '—'}
                </span>
                <span style={{ fontSize: '1.25rem', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>/10</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button onClick={() => navigate(`/interview/${sessionId}/report`)} className="btn btn-primary"
                  style={{ padding: '0.875rem 2rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} />View Detailed Report
                </button>
                <button onClick={() => navigate('/history')} className="btn btn-secondary"
                  style={{ padding: '0.875rem 1.75rem', borderRadius: '0.75rem' }}>
                  View All Sessions
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="active-room" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
            >
              {/* Live FFT Waveform */}
              <VoiceWaveform
                state={state}
                liveFrequencies={isRecording ? liveFrequencies : []}
                isPushToTalk={isPushToTalk}
                isHoldingSpace={isHoldingSpace}
              />

              {/* Question Display */}
              {currentQuestion && (
                <QuestionDisplay
                  questionText={currentQuestion.text}
                  intent={currentQuestion.intent}
                  orderIndex={currentQuestion.orderIndex}
                  totalQuestions={currentQuestion.totalQuestions}
                  isFollowup={currentQuestion.isFollowup}
                />
              )}

              {/* Push-to-Talk Button */}
              {isPushToTalk && state === 'LISTENING' && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onMouseDown={beginRecording}
                    onMouseUp={() => submitRecordingRef.current()}
                    onTouchStart={beginRecording}
                    onTouchEnd={() => submitRecordingRef.current()}
                    style={{
                      width: '5rem', height: '5rem', borderRadius: '9999px',
                      background: isRecording
                        ? 'linear-gradient(135deg, #10B981, #059669)'
                        : 'linear-gradient(135deg, #4dd4db, #22b8bf)',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: isRecording ? '0 0 24px rgba(16,185,129,0.5)' : '0 4px 20px rgba(77,212,219,0.4)',
                      transition: 'all 0.15s ease',
                      animation: isRecording ? 'pulse 1s ease-in-out infinite' : 'none',
                    }}
                  >
                    <Mic size={28} color="#fff" />
                  </button>
                </div>
              )}

              {/* Live Transcript Box (Dual Real-Time + Server STT) */}
              <LiveTranscriptBox
                transcript={displayTranscript}
                interimTranscript={displayInterim}
                isListening={state === 'LISTENING'}
                isTranscribing={isTranscribing}
                micVolume={avgVolume}
                isRecording={isRecording}
                isPushToTalk={isPushToTalk}
                onSubmit={(overrideText) => submitRecordingRef.current(overrideText)}
                disabled={state !== 'LISTENING'}
              />

              {/* Evaluation Feedback */}
              {latestEvaluation && state !== 'LISTENING' && state !== 'ASKING' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="card-base"
                  style={{ padding: '1.25rem 1.5rem', background: 'rgba(77, 212, 219, 0.04)', border: '1px solid rgba(77, 212, 219, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Sparkles size={15} color="var(--color-accent)" />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-foreground)' }}>
                      Evaluation ({latestEvaluation.overall_score}/10)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)', lineHeight: '1.5', margin: 0 }}>
                    {latestEvaluation.feedback}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
