import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { interviewApi, type InterviewReport, type InterviewDetail } from '@/services/api'
import api from '@/services/api'
import {
  Award,
  Download,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  MessageSquare,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }

export default function InterviewReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const [report, setReport] = useState<InterviewReport | null>(null)
  const [detail, setDetail] = useState<InterviewDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const loadData = async () => {
      try {
        setIsLoading(true)
        const [repRes, detRes] = await Promise.all([
          interviewApi.getReport(sessionId),
          interviewApi.getDetail(sessionId),
        ])
        setReport(repRes.data)
        setDetail(detRes.data)
        if (detRes.data.questions.length > 0) {
          setExpandedQuestionId(detRes.data.questions[0].id)
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to generate interview evaluation report')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [sessionId])

  const handleDownloadPdf = async () => {
    if (!sessionId) return
    setIsDownloading(true)
    try {
      const response = await api.get(`/v1/interviews/${sessionId}/report/pdf`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `VoicePrep_Report_${detail?.target_role?.replace(/\s+/g, '_') || 'Session'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (e) {
      console.error('Failed to download PDF report:', e)
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <main style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={36} color="var(--color-accent)" className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600 }}>
            Analyzing interview session...
          </h3>
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Compiling rubric breakdown, STAR analysis, and generating recommendations.
          </p>
        </div>
      </main>
    )
  }

  if (error || !report) {
    return (
      <main style={{ minHeight: 'calc(100vh - 4rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)', padding: '2rem' }}>
        <div className="card-base" style={{ padding: '2.5rem', maxWidth: '32rem', textAlign: 'center', margin: '0 auto' }}>
          <AlertCircle size={36} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Could not load report
          </h3>
          <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {error || 'No report found for this session.'}
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary" style={{ padding: '0.625rem 1.25rem', margin: '0 auto' }}>
            Return to Dashboard
          </button>
        </div>
      </main>
    )
  }

  const score = report.overall_score
  const getHireStatus = () => {
    if (score >= 8.5) return { text: 'Strong Hire', color: '#0e7075', bg: 'rgba(77, 212, 219, 0.18)' }
    if (score >= 7.0) return { text: 'Hire / Proficient', color: '#118288', bg: 'rgba(77, 212, 219, 0.12)' }
    if (score >= 5.5) return { text: 'Lean Hire', color: '#D97706', bg: 'rgba(245,158,11,0.12)' }
    return { text: 'Needs Improvement', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' }
  }
  const hireBadge = getHireStatus()

  return (
    <main style={{ minHeight: 'calc(100vh - 4rem)', background: 'var(--color-background)', padding: '2.5rem 0 5rem' }}>
      <div className="container-app" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>

          {/* Navigation Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-ghost"
              style={{ padding: '0.5rem 0.875rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <ArrowLeft size={16} />
              Dashboard
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Download PDF Report
              </button>
              <button
                onClick={() => navigate('/interview/setup')}
                className="btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Sparkles size={15} />
                Practice Again
              </button>
            </div>
          </div>

          {/* Executive Overview Card */}
          <div
            className="card-base"
            style={{
              padding: '2.5rem',
              marginBottom: '2rem',
              background: 'linear-gradient(180deg, rgba(77, 212, 219, 0.04) 0%, var(--color-card) 100%)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', marginBottom: '1.75rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#118288',
                    background: 'rgba(77, 212, 219, 0.15)',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '0.5rem',
                    display: 'inline-block',
                    marginBottom: '0.75rem',
                  }}
                >
                  Post-Interview Evaluation
                </span>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-foreground)', marginBottom: '0.375rem' }}>
                  {detail?.target_role || 'Software Engineer'} Interview Report
                </h1>
                <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.9375rem' }}>
                  {detail?.interview_type?.toUpperCase()} · {detail?.difficulty?.toUpperCase()} DIFFICULTY · {detail?.questions?.length || 0} QUESTIONS EVALUATED
                </p>
              </div>

              {/* Overall Score Badge */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '1.5rem 2.25rem',
                  borderRadius: '1.25rem',
                  background: 'var(--color-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                  <span style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--color-foreground)' }}>
                    {report.overall_score}
                  </span>
                  <span style={{ fontSize: '1.25rem', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>
                    / 10
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: hireBadge.color,
                    background: hireBadge.bg,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    marginTop: '0.25rem',
                  }}
                >
                  {hireBadge.text}
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-foreground)', marginBottom: '0.5rem' }}>
                Executive Summary
              </h4>
              <p style={{ fontSize: '1rem', color: 'var(--color-muted-foreground)', lineHeight: '1.65' }}>
                {report.summary}
              </p>
            </div>
          </div>

          {/* Category Scores Breakdown */}
          {report.category_scores && (
            <div className="card-base" style={{ padding: '2rem 2.25rem', marginBottom: '2rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} color="var(--color-accent)" />
                Competency Breakdown
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                {Object.entries(report.category_scores).map(([category, val]) => (
                  <div key={category} style={{ padding: '1.25rem', borderRadius: '0.875rem', background: 'var(--color-muted)' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'capitalize', color: 'var(--color-foreground)', marginBottom: '0.5rem' }}>
                      {category.replace('_', ' ')}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.625rem' }}>
                      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0e7075' }}>
                        {val}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>/ 10</span>
                    </div>
                    {/* Mini Progress Bar */}
                    <div style={{ height: '0.45rem', width: '100%', background: 'var(--color-border)', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(val / 10) * 100}%`, background: 'linear-gradient(90deg, #4dd4db, #22b8bf)', borderRadius: '9999px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Improvement Areas Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', marginBottom: '2rem' }}>
            {/* Strengths */}
            <div className="card-base" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={20} color="#10B981" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-foreground)' }}>Key Strengths</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {(report.strengths || []).map((str, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--color-muted-foreground)', lineHeight: '1.5' }}>
                    <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#10B981', marginTop: '0.45rem', flexShrink: 0 }} />
                    {str}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvement Areas */}
            <div className="card-base" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <AlertCircle size={20} color="#F59E0B" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-foreground)' }}>Areas for Growth</h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {(report.improvement_areas || []).map((imp, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.9375rem', color: 'var(--color-muted-foreground)', lineHeight: '1.5' }}>
                    <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '50%', background: '#F59E0B', marginTop: '0.45rem', flexShrink: 0 }} />
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Question-by-Question Deep Dive */}
          <div className="card-base" style={{ padding: '2.25rem', marginBottom: '2rem' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="var(--color-accent)" />
              Question-by-Question Analysis
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(detail?.questions || []).map((q, idx) => {
                const isExpanded = expandedQuestionId === q.id
                return (
                  <div
                    key={q.id}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '1rem',
                      overflow: 'hidden',
                      background: 'var(--color-muted)',
                    }}
                  >
                    {/* Accordion Header */}
                    <div
                      onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                      style={{
                        padding: '1.125rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(77, 212, 219, 0.06)' : 'transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, paddingRight: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0e7075', background: 'rgba(77, 212, 219, 0.16)', padding: '0.25rem 0.625rem', borderRadius: '0.5rem' }}>
                          Q{q.order_index || idx + 1}
                        </span>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-foreground)' }}>
                          {q.question_text}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {q.evaluation && (
                          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0e7075' }}>
                            {q.evaluation.overall_score}/10
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {/* Accordion Expanded Content */}
                    {isExpanded && (
                      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-card)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Spoken Answer */}
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted-foreground)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                            Your Spoken Answer
                          </p>
                          <p style={{ fontSize: '0.9375rem', color: 'var(--color-foreground)', lineHeight: '1.6', fontStyle: 'italic', background: 'var(--color-muted)', padding: '1rem 1.25rem', borderRadius: '0.75rem' }}>
                            "{q.answer || 'No transcript available.'}"
                          </p>
                        </div>

                        {/* Feedback & Evaluation */}
                        {q.evaluation && (
                          <div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted-foreground)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                              AI Coach Feedback
                            </p>
                            <p style={{ fontSize: '0.9375rem', color: 'var(--color-foreground)', lineHeight: '1.6' }}>
                              {q.evaluation.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem' }}>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ padding: '0.875rem 2rem', borderRadius: '0.875rem', fontSize: '0.9375rem' }}>
              Return to Dashboard
            </button>
            <button onClick={() => navigate('/interview/setup')} className="btn-primary" style={{ padding: '0.875rem 2.25rem', borderRadius: '0.875rem', fontSize: '0.9375rem' }}>
              Start Another Interview
            </button>
          </div>

        </motion.div>
      </div>
    </main>
  )
}
