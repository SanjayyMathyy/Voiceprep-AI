import { motion } from 'framer-motion'
import { Radio } from 'lucide-react'

interface VoiceWaveformProps {
  state: 'IDLE' | 'PREPARING' | 'ASKING' | 'LISTENING' | 'EVALUATING' | 'COMPLETED'
  liveFrequencies?: number[]
  isPushToTalk?: boolean
  isHoldingSpace?: boolean
}

export default function VoiceWaveform({
  state,
  liveFrequencies = [],
  isPushToTalk = false,
  isHoldingSpace = false
}: VoiceWaveformProps) {
  const isListening = state === 'LISTENING'
  const isSpeaking = state === 'ASKING'
  const isEvaluating = state === 'EVALUATING'

  const barCount = 32

  const getStatusText = () => {
    switch (state) {
      case 'PREPARING':
        return 'AI is preparing the question...'
      case 'ASKING':
        return 'AI Interviewer is speaking...'
      case 'LISTENING':
        if (isPushToTalk) {
          return isHoldingSpace ? '🎙️ Recording your voice... (Release to submit)' : 'Hold Spacebar (or click mic) to answer'
        }
        return 'Listening to you... (speak naturally)'
      case 'EVALUATING':
        return 'AI is evaluating your response...'
      case 'COMPLETED':
        return 'Interview completed!'
      default:
        return 'Ready'
    }
  }

  const getStatusBadgeColor = () => {
    switch (state) {
      case 'ASKING':
        return { bg: 'rgba(77, 212, 219, 0.15)', text: '#0e7075', border: 'rgba(77, 212, 219, 0.4)' }
      case 'LISTENING':
        if (isPushToTalk && !isHoldingSpace) {
          return { bg: 'rgba(77, 212, 219, 0.10)', text: '#118288', border: 'rgba(77, 212, 219, 0.3)' }
        }
        return { bg: 'rgba(16,185,129,0.12)', text: '#10B981', border: 'rgba(16,185,129,0.25)' }
      case 'EVALUATING':
        return { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', border: 'rgba(245,158,11,0.25)' }
      default:
        return { bg: 'var(--color-muted)', text: 'var(--color-muted-foreground)', border: 'var(--color-border)' }
    }
  }

  const badge = getStatusBadgeColor()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
      {/* Status Pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 1.125rem',
          borderRadius: '9999px',
          background: badge.bg,
          border: `1.5px solid ${badge.border}`,
          fontSize: '0.875rem',
          fontWeight: 700,
          color: badge.text,
          transition: 'all 0.3s ease',
          boxShadow: isListening && isHoldingSpace ? '0 0 16px rgba(16,185,129,0.3)' : 'none',
        }}
      >
        <span
          style={{
            width: '0.55rem',
            height: '0.55rem',
            borderRadius: '9999px',
            background: badge.text,
            animation: isListening || isSpeaking || isEvaluating ? 'pulse 1.5s infinite' : 'none',
          }}
        />
        {getStatusText()}
      </div>

      {/* Waveform Bars */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35rem',
          height: '5rem',
          width: '100%',
          maxWidth: '32rem',
        }}
      >
        {Array.from({ length: barCount }).map((_, i) => {
          const delay = (i % 8) * 0.08

          // Live FFT value if listening and has frequency data
          const liveFreq = liveFrequencies[i] ?? 0
          const hasLiveAudio = isListening && liveFreq > 0.02

          // Dynamic height calculation
          let height = 8
          if (isListening && hasLiveAudio) {
            height = Math.max(8, Math.min(56, 8 + liveFreq * 48))
          } else if (isListening) {
            height = 8
          }

          let heightAnim = [8, 8]
          if (isSpeaking) {
            heightAnim = [8, 30 + ((i * 7) % 26), 8]
          } else if (isEvaluating) {
            heightAnim = [8, 18 + ((i * 5) % 16), 8]
          }

          return (
            <motion.div
              key={i}
              animate={
                isSpeaking || isEvaluating
                  ? { height: heightAnim }
                  : { height: height }
              }
              transition={
                isSpeaking || isEvaluating
                  ? { duration: 0.6, repeat: Infinity, delay: delay, ease: 'easeInOut' }
                  : { duration: 0.08, ease: 'easeOut' }
              }
              style={{
                width: '0.3rem',
                borderRadius: '9999px',
                background: isListening
                  ? hasLiveAudio
                    ? 'linear-gradient(180deg, #10B981 0%, #059669 100%)'
                    : 'var(--color-border)'
                  : isSpeaking
                  ? 'linear-gradient(180deg, #4dd4db 0%, #169aa0 100%)'
                  : isEvaluating
                  ? 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)'
                  : 'var(--color-border)',
                boxShadow: isListening && hasLiveAudio ? '0 0 8px rgba(16,185,129,0.4)' : 'none',
                transition: 'background 0.2s ease, box-shadow 0.2s ease',
              }}
            />
          )
        })}
      </div>

      {/* Push-to-Talk Hint */}
      {isPushToTalk && isListening && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--color-muted-foreground)',
          background: 'var(--color-muted)',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          border: '1px solid var(--color-border)',
        }}>
          <Radio size={12} color="var(--color-accent)" />
          <span>Push-to-Talk active: Press and hold <strong>Spacebar</strong> to speak</span>
        </div>
      )}
    </div>
  )
}
