import { motion } from 'framer-motion'
import { Sparkles, HelpCircle } from 'lucide-react'

interface QuestionDisplayProps {
  questionText: string
  intent?: string
  orderIndex: number
  totalQuestions: number
  isFollowup?: boolean
}

export default function QuestionDisplay({
  questionText,
  intent,
  orderIndex,
  totalQuestions,
  isFollowup = false,
}: QuestionDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card-base"
      style={{
        padding: '2rem',
        border: isFollowup ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--color-border)',
        background: isFollowup
          ? 'linear-gradient(180deg, rgba(245,158,11,0.03) 0%, var(--color-card) 100%)'
          : 'var(--color-card)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header Tags */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#0e7075',
              background: 'rgba(77, 212, 219, 0.16)',
              padding: '0.3rem 0.75rem',
              borderRadius: '0.5rem',
            }}
          >
            Question {orderIndex} of {totalQuestions}
          </span>

          {isFollowup && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#D97706',
                background: 'rgba(245,158,11,0.12)',
                padding: '0.25rem 0.625rem',
                borderRadius: '0.5rem',
              }}
            >
              <Sparkles size={12} />
              Adaptive Follow-up
            </span>
          )}
        </div>

        {intent && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-muted-foreground)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <HelpCircle size={13} />
            {intent}
          </span>
        )}
      </div>

      {/* Question Main Text */}
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.375rem',
          lineHeight: '1.45',
          fontWeight: 600,
          color: 'var(--color-foreground)',
          margin: 0,
        }}
      >
        "{questionText || 'Loading next question...'}"
      </p>
    </motion.div>
  )
}
