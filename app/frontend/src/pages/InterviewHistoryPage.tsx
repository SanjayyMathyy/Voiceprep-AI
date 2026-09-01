import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { interviewApi, type InterviewSession } from '@/services/api'
import api from '@/services/api'
import {
  History,
  Mic2,
  FileText,
  Download,
  Trash2,
  Play,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Award,
  Loader2,
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }

export default function InterviewHistoryPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'in_progress'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [sessionToDelete, setSessionToDelete] = useState<InterviewSession | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      setIsLoading(true)
      const res = await interviewApi.list()
      setSessions(res.data)
    } catch (e) {
      console.error('Failed to load interview sessions:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const promptDeleteSession = (session: InterviewSession, e: React.MouseEvent) => {
    e.stopPropagation()
    setSessionToDelete(session)
  }

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return
    const id = sessionToDelete.id
    setDeletingId(id)
    try {
      await interviewApi.delete(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      setSessionToDelete(null)
    } catch (e) {
      console.error('Failed to delete session:', e)
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownloadPdf = async (session: InterviewSession, e: React.MouseEvent) => {
    e.stopPropagation()
    setDownloadingId(session.id)
    try {
      const response = await api.get(`/v1/interviews/${session.id}/report/pdf`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `VoicePrep_Report_${session.target_role.replace(/\s+/g, '_')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (e) {
      console.error('Failed to download PDF report:', e)
    } finally {
      setDownloadingId(null)
    }
  }

  // Filter & Search
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.target_role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.interview_type.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    if (filterType === 'completed') return s.state === 'COMPLETED' || s.overall_score != null
    if (filterType === 'in_progress') return s.state !== 'COMPLETED' && s.overall_score == null
    return true
  })

  // Quick stats
  const completedSessions = sessions.filter(s => s.overall_score != null)
  const avgScore = completedSessions.length > 0
    ? (completedSessions.reduce((acc, s) => acc + (s.overall_score || 0), 0) / completedSessions.length).toFixed(1)
    : '—'
  const totalQuestionsPracticed = sessions.reduce((acc, s) => acc + (s.total_questions || 0), 0)

  return (
    <main style={{ minHeight: 'calc(100vh - 4rem)', background: 'var(--color-background)', padding: '2.5rem 0 5rem' }}>
      <div className="container-app" style={{ maxWidth: '1360px', margin: '0 auto', width: '100%' }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          {/* Header */}
          <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <div
                className="section-label"
                style={{
                  background: 'rgba(77, 212, 219, 0.12)',
                  color: '#118288',
                  borderColor: 'rgba(77, 212, 219, 0.35)',
                  marginBottom: '0.75rem',
                }}
              >
                <History size={13} color="#118288" />
                Session History & Analytics
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.375rem', color: 'var(--color-foreground)' }}>
                Interview <span className="gradient-text">History</span>
              </h1>
              <p style={{ color: 'var(--color-muted-foreground)', fontSize: '1.0625rem' }}>
                Review past performance, download official reports, and track your interview readiness over time.
              </p>
            </div>

            <Link to="/interview/setup" className="btn btn-primary" style={{ padding: '0.875rem 1.75rem', fontSize: '0.9375rem' }}>
              <Mic2 size={16} />
              Start New Interview
            </Link>
          </motion.div>

          {/* Overview Metrics Cards */}
          <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {[
              { label: 'Total Sessions', value: sessions.length.toString(), icon: <History size={18} />, color: '#4dd4db' },
              { label: 'Completed', value: completedSessions.length.toString(), icon: <CheckCircle2 size={18} />, color: '#10b981' },
              { label: 'Average Score', value: avgScore !== '—' ? `${avgScore}/10` : '—', icon: <TrendingUp size={18} />, color: '#f59e0b' },
              { label: 'Questions Practiced', value: totalQuestionsPracticed.toString(), icon: <Award size={18} />, color: '#8b5cf6' },
            ].map((st) => (
              <div key={st.label} className="card" style={{ padding: '1.5rem 1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>{st.label}</span>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: `${st.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: st.color }}>
                    {st.icon}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-foreground)' }}>
                  {st.value}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Search & Filter Bar */}
          <motion.div variants={fadeUp} className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
              <Search size={18} color="var(--color-muted-foreground)" />
              <input
                type="text"
                placeholder="Search by job role or type..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ height: '2.5rem', fontSize: '0.875rem', border: 'none', background: 'transparent', boxShadow: 'none' }}
              />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-muted)', padding: '0.25rem', borderRadius: '0.625rem' }}>
              {[
                { id: 'all', label: 'All Sessions' },
                { id: 'completed', label: 'Completed' },
                { id: 'in_progress', label: 'In Progress' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as any)}
                  style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: filterType === f.id ? 'var(--color-card)' : 'transparent',
                    color: filterType === f.id ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                    boxShadow: filterType === f.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Sessions List / Table */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <Loader2 size={36} color="var(--color-accent)" className="animate-spin" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.9375rem' }}>Loading your past interview sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <motion.div variants={fadeUp} className="card-base" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'rgba(77, 212, 219, 0.12)', color: '#118288', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Mic2 size={32} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                No interview sessions found
              </h3>
              <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.9375rem', marginBottom: '1.75rem', maxWidth: '400px', margin: '0 auto 1.75rem' }}>
                {searchQuery ? 'No sessions matched your search query. Try clearing the filter.' : 'Practice your first interview to generate scores and evaluation reports.'}
              </p>
              <Link to="/interview/setup" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
                Start Live Interview
              </Link>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <AnimatePresence>
                {filteredSessions.map((session) => {
                  const isCompleted = session.state === 'COMPLETED' || session.overall_score != null
                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="card card-hover"
                      style={{
                        padding: '1.5rem 1.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1.25rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(isCompleted ? `/interview/${session.id}/report` : `/interview/${session.id}`)}
                    >
                      {/* Left: Role Info & Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '280px' }}>
                        <div style={{
                          width: '3.25rem',
                          height: '3.25rem',
                          borderRadius: '1rem',
                          background: isCompleted ? 'linear-gradient(135deg, #4dd4db, #22b8bf)' : 'var(--color-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isCompleted ? '#072a2c' : 'var(--color-muted-foreground)',
                          flexShrink: 0,
                        }}>
                          <Mic2 size={20} />
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-foreground)', margin: 0 }}>
                              {session.target_role}
                            </h3>
                            <span style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.375rem',
                              background: 'var(--color-muted)',
                              color: 'var(--color-muted-foreground)',
                              border: '1px solid var(--color-border)'
                            }}>
                              {session.difficulty}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>
                            <span style={{ textTransform: 'capitalize' }}>{session.interview_type.replace('_', ' ')}</span>
                            <span>•</span>
                            <span>{session.total_questions} Questions</span>
                            <span>•</span>
                            <span>{new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Score Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        {isCompleted ? (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0e7075' }}>
                                {session.overall_score}
                              </span>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>/ 10</span>
                            </div>
                            <span style={{
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              color: '#10b981',
                              background: 'rgba(16,185,129,0.1)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                            }}>
                              Completed
                            </span>
                          </div>
                        ) : (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#F59E0B',
                            background: 'rgba(245,158,11,0.1)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                          }}>
                            In Progress
                          </span>
                        )}

                        {/* Right: Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {isCompleted ? (
                            <>
                              <button
                                onClick={(e) => handleDownloadPdf(session, e)}
                                disabled={downloadingId === session.id}
                                title="Download PDF Report"
                                className="btn-secondary"
                                style={{ padding: '0.5rem 0.875rem', height: '2.375rem', borderRadius: '0.625rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                              >
                                {downloadingId === session.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                PDF
                              </button>
                              <Link
                                to={`/interview/${session.id}/report`}
                                className="btn-primary"
                                style={{ padding: '0.5rem 1rem', height: '2.375rem', borderRadius: '0.625rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                              >
                                <FileText size={13} />
                                View Report
                              </Link>
                            </>
                          ) : (
                            <Link
                              to={`/interview/${session.id}`}
                              className="btn-primary"
                              style={{ padding: '0.5rem 1rem', height: '2.375rem', borderRadius: '0.625rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                            >
                              <Play size={13} />
                              Resume
                            </Link>
                          )}

                          <button
                            onClick={(e) => promptDeleteSession(session, e)}
                            disabled={deletingId === session.id}
                            title="Delete Session"
                            style={{
                              padding: '0.5rem',
                              borderRadius: '0.625rem',
                              border: '1px solid var(--color-border)',
                              background: 'transparent',
                              color: 'var(--color-muted-foreground)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-muted-foreground)'; e.currentTarget.style.background = 'transparent' }}
                          >
                            {deletingId === session.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(sessionToDelete)}
        title="Delete this interview session?"
        message="Are you sure you want to delete this session? All questions, answers, audio, and report data will be permanently removed."
        itemName={sessionToDelete ? `${sessionToDelete.target_role} (${sessionToDelete.difficulty})` : undefined}
        confirmText="Delete Session"
        isDeleting={Boolean(deletingId)}
        onConfirm={confirmDeleteSession}
        onCancel={() => setSessionToDelete(null)}
      />
    </main>
  )
}
