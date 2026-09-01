import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { interviewApi, resumeApi, type Resume } from '@/services/api'
import {
  Sparkles,
  ArrowRight,
  Briefcase,
  Layers,
  Sliders,
  FileText,
  Clock,
  Loader2,
  CheckCircle2
} from 'lucide-react'

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }

const POPULAR_ROLES = [
  'Senior Software Engineer',
  'Full Stack Developer',
  'Backend Engineer (Python / Go)',
  'Frontend Engineer (React / TypeScript)',
  'AI / Machine Learning Engineer',
  'DevOps & Cloud Architect',
  'Product Manager'
]

export default function InterviewSetupPage() {
  const navigate = useNavigate()
  const [targetRole, setTargetRole] = useState('Senior Software Engineer')
  const [customRole, setCustomRole] = useState('')
  const [interviewType, setInterviewType] = useState<'technical' | 'behavioral' | 'role_specific'>('technical')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [totalQuestions, setTotalQuestions] = useState(3)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    resumeApi.list().then((res) => {
      setResumes(res.data)
      if (res.data.length > 0) {
        setSelectedResumeId(res.data[0].id)
      }
    }).catch(console.error)
  }, [])

  const handleStart = async () => {
    setIsLoading(true)
    setError(null)
    const finalRole = customRole.trim() || targetRole

    try {
      const res = await interviewApi.create({
        target_role: finalRole,
        interview_type: interviewType,
        difficulty: difficulty,
        total_questions: totalQuestions,
        resume_id: selectedResumeId || undefined,
      })
      navigate(`/interview/${res.data.id}`)
    } catch (err: any) {
      console.error('Interview setup error:', err)
      const detail = err.response?.data?.detail
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : 'Failed to initialize interview session')
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 4rem)', background: 'var(--color-background)', padding: '2.5rem 0 4rem' }}>
      <div className="container-main" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div
              className="section-label"
              style={{
                background: 'rgba(77, 212, 219, 0.12)',
                color: '#118288',
                borderColor: 'rgba(77, 212, 219, 0.35)',
                margin: '0 auto 1rem',
              }}
            >
              <Sparkles size={13} color="#118288" />
              Session Configurator
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>
              Set up your <span className="gradient-text">voice interview</span>
            </h1>
            <p style={{ color: 'var(--color-muted-foreground)', fontSize: '1.0625rem' }}>
              Choose your target role, depth, and resume to generate tailored questions.
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '0.875rem',
              padding: '0.875rem 1.25rem',
              marginBottom: '1.5rem',
              color: '#EF4444',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {/* Form Card */}
          <div className="card-base" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
            
            {/* 1. Target Role */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.875rem', color: 'var(--color-foreground)' }}>
                <Briefcase size={17} color="var(--color-accent)" />
                Target Role
              </label>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '1rem' }}>
                {POPULAR_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => { setTargetRole(role); setCustomRole('') }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.75rem',
                      fontSize: '0.875rem',
                      fontWeight: targetRole === role && !customRole ? 700 : 500,
                      cursor: 'pointer',
                      border: targetRole === role && !customRole ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                      background: targetRole === role && !customRole ? 'rgba(77, 212, 219, 0.15)' : 'var(--color-muted)',
                      color: targetRole === role && !customRole ? 'var(--color-accent)' : 'var(--color-foreground)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Or type custom role (e.g. Lead SRE / Security Engineer)..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.9375rem', height: '3.25rem' }}
              />
            </div>

            {/* 2. Interview Type */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.875rem', color: 'var(--color-foreground)' }}>
                <Layers size={17} color="var(--color-accent)" />
                Interview Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                  { id: 'technical', label: 'Technical Depth', desc: 'Architecture, system design, and coding concepts' },
                  { id: 'behavioral', label: 'Behavioral (STAR)', desc: 'Leadership, conflicts, and past achievements' },
                  { id: 'role_specific', label: 'Domain Specific', desc: 'Focused scenarios for this specific role' },
                ].map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setInterviewType(t.id as any)}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '1rem',
                      cursor: 'pointer',
                      border: interviewType === t.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                      background: interviewType === t.id ? 'rgba(77, 212, 219, 0.12)' : 'var(--color-muted)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <p style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: interviewType === t.id ? 'var(--color-accent)' : 'var(--color-foreground)',
                      marginBottom: '0.375rem'
                    }}>
                      {t.label}
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)', lineHeight: '1.45' }}>
                      {t.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Difficulty & Questions Count */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.875rem', color: 'var(--color-foreground)' }}>
                  <Sliders size={17} color="var(--color-accent)" />
                  Difficulty Level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setDifficulty(diff)}
                      style={{
                        padding: '0.625rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: difficulty === diff ? 700 : 600,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        border: difficulty === diff ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                        background: difficulty === diff ? 'rgba(77, 212, 219, 0.15)' : 'var(--color-muted)',
                        color: difficulty === diff ? 'var(--color-accent)' : 'var(--color-foreground)',
                      }}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.875rem', color: 'var(--color-foreground)' }}>
                  <Clock size={17} color="var(--color-accent)" />
                  Number of Questions
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
                  {[3, 5, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setTotalQuestions(count)}
                      style={{
                        padding: '0.625rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        fontWeight: totalQuestions === count ? 700 : 600,
                        cursor: 'pointer',
                        border: totalQuestions === count ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                        background: totalQuestions === count ? 'rgba(77, 212, 219, 0.15)' : 'var(--color-muted)',
                        color: totalQuestions === count ? 'var(--color-accent)' : 'var(--color-foreground)',
                      }}
                    >
                      {count} Questions
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Select Resume */}
            {resumes.length > 0 && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.875rem', color: 'var(--color-foreground)' }}>
                  <FileText size={17} color="var(--color-accent)" />
                  Resume Context
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {resumes.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedResumeId(r.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.875rem 1.25rem',
                        borderRadius: '0.875rem',
                        cursor: 'pointer',
                        border: selectedResumeId === r.id ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                        background: selectedResumeId === r.id ? 'rgba(77, 212, 219, 0.08)' : 'var(--color-muted)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileText size={18} color={selectedResumeId === r.id ? 'var(--color-accent)' : 'var(--color-muted-foreground)'} />
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-foreground)' }}>
                          {r.extracted_data?.name ? `${r.extracted_data.name}'s Resume` : r.original_filename}
                        </span>
                      </div>
                      {selectedResumeId === r.id && <CheckCircle2 size={18} color="var(--color-accent)" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleStart}
              disabled={isLoading}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.0625rem',
                fontWeight: 700,
                borderRadius: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.5rem',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  Start Live Voice Interview
                  <ArrowRight size={20} />
                </>
              )}
            </button>

          </div>

        </motion.div>
      </div>
    </main>
  )
}
