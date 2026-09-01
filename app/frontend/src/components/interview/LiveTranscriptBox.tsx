import { useState, useEffect } from 'react'
import { Mic, Send, Edit3, Volume2, CheckCircle2, Loader2, Sparkles } from 'lucide-react'

interface LiveTranscriptBoxProps {
  transcript: string
  interimTranscript?: string
  isListening: boolean
  isTranscribing?: boolean
  micVolume?: number
  isRecording?: boolean
  isPushToTalk?: boolean
  onSubmit: (overrideText?: string) => void
  disabled?: boolean
}

export default function LiveTranscriptBox({
  transcript,
  interimTranscript = '',
  isListening,
  isTranscribing = false,
  micVolume = 0,
  isRecording = false,
  isPushToTalk = false,
  onSubmit,
  disabled = false,
}: LiveTranscriptBoxProps) {
  const [editedText, setEditedText] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Sync textarea when transcript changes
  useEffect(() => {
    if (transcript) {
      setEditedText(transcript)
    }
  }, [transcript])

  const fullText = (transcript + ' ' + (isTranscribing ? '' : interimTranscript)).trim()
  const submitText = isEditing ? editedText.trim() : fullText
  const normalizedVolume = Math.min(100, Math.max(4, Math.round(micVolume * 300)))

  return (
    <div
      className="card-base"
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'var(--color-card)',
        border: isListening
          ? '1.5px solid rgba(77, 212, 219, 0.4)'
          : fullText
          ? '1.5px solid rgba(16, 185, 129, 0.3)'
          : '1px solid var(--color-border)',
        boxShadow: isListening && isRecording
          ? '0 0 24px rgba(77, 212, 219, 0.12)'
          : 'var(--shadow-card)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '1.875rem',
              height: '1.875rem',
              borderRadius: '50%',
              background: isListening
                ? 'rgba(77, 212, 219, 0.15)'
                : fullText
                ? 'rgba(16, 185, 129, 0.15)'
                : 'var(--color-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            {isTranscribing ? (
              <Loader2 size={15} color="var(--color-accent)" style={{ animation: 'spin 1s linear infinite' }} />
            ) : fullText && !isListening ? (
              <CheckCircle2 size={15} color="#10B981" />
            ) : (
              <Mic size={15} color={isListening ? 'var(--color-accent)' : 'var(--color-muted-foreground)'} />
            )}
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-foreground)' }}>
            {isTranscribing
              ? 'Transcribing Your Speech...'
              : fullText && !isListening
              ? 'Your Transcribed Answer'
              : isListening
              ? 'Candidate Voice Input (Live)'
              : 'Candidate Transcript'}
          </span>
        </div>

        {/* Live Mic Level Indicator when listening */}
        {isListening && isRecording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Volume2 size={14} color="var(--color-accent)" />
            <div style={{ width: '80px', height: '6px', background: 'var(--color-muted)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${normalizedVolume}%`,
                  background: 'linear-gradient(to right, #4dd4db, #22b8bf)',
                  borderRadius: '9999px',
                  transition: 'width 0.08s ease-out',
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 600 }}>
              {isPushToTalk ? 'Push-to-Talk' : 'Listening...'}
            </span>
          </div>
        )}
      </div>

      {/* Transcript Presentation Area */}
      <div
        style={{
          minHeight: '5.5rem',
          maxHeight: '12rem',
          overflowY: 'auto',
          padding: '1.125rem 1.25rem',
          borderRadius: '0.75rem',
          background: 'var(--color-muted)',
          fontSize: '0.9375rem',
          lineHeight: '1.6',
          color: fullText ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
          border: '1px solid var(--color-border)',
        }}
      >
        {isTranscribing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--color-accent)', fontWeight: 600 }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Converting voice to text via Whisper STT...</span>
          </div>
        ) : fullText ? (
          <div>
            <span style={{ fontWeight: 500 }}>"{fullText}"</span>
          </div>
        ) : (
          <span style={{ fontStyle: 'italic', opacity: 0.8 }}>
            {isListening
              ? isPushToTalk
                ? 'Hold Spacebar (or click mic) to speak your answer...'
                : 'Start speaking when ready. Click the submit button when you are done speaking.'
              : 'No speech recorded yet.'}
          </span>
        )}
      </div>

      {/* Manual textarea edit mode */}
      {isEditing && (
        <textarea
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          placeholder="Edit your answer before submitting..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--color-accent)',
            background: 'var(--color-card)',
            color: 'var(--color-foreground)',
            fontSize: '0.9375rem',
            lineHeight: '1.5',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* Single Unified Action Area */}
      {isListening && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {fullText ? (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.625rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: isEditing ? 'rgba(77,212,219,0.15)' : 'var(--color-muted)',
                border: isEditing ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                color: isEditing ? 'var(--color-accent)' : 'var(--color-muted-foreground)',
                transition: 'all 0.15s ease',
              }}
            >
              <Edit3 size={13} />
              {isEditing ? 'Done Editing' : 'Edit Text'}
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)' }}>
              🎙️ Speak clearly into your mic
            </span>
          )}

          {/* THE SINGLE SUBMIT BUTTON */}
          <button
            type="button"
            onClick={() => onSubmit(isEditing ? editedText.trim() : undefined)}
            disabled={disabled}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.75rem',
              height: 'auto',
              fontSize: '0.9375rem',
              fontWeight: 700,
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 16px rgba(77,212,219,0.35)',
              cursor: 'pointer',
            }}
          >
            <Send size={15} />
            Done Speaking → Submit Answer
          </button>
        </div>
      )}
    </div>
  )
}

