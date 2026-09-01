import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { interviewApi, resumeApi, type InterviewSession } from '@/services/api'
import { Mic2, FileText, BarChart3, Plus, ArrowRight, Clock, TrendingUp } from 'lucide-react'

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const rawName = user?.full_name || (user as any)?.user_metadata?.full_name
  const firstName = rawName ? rawName.split(' ')[0] : 'there'

  const [interviews, setInterviews] = useState<InterviewSession[]>([])
  const [resumeCount, setResumeCount] = useState(0)

  useEffect(() => {
    interviewApi.list().then((res) => {
      setInterviews(res.data)
    }).catch(console.error)

    resumeApi.list().then((res) => {
      setResumeCount(res.data.length)
    }).catch(console.error)
  }, [])

  const completed = interviews.filter((i) => i.overall_score != null)
  const avgScore = completed.length > 0
    ? (completed.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / completed.length).toFixed(1)
    : '—'

  const quickStats = [
    { label: 'Interviews', value: interviews.length.toString(), icon: <Mic2 size={18} />, color: '#4dd4db' },
    { label: 'Avg. Score', value: avgScore !== '—' ? `${avgScore}/10` : '—', icon: <TrendingUp size={18} />, color: '#10b981' },
    { label: 'Resumes', value: resumeCount.toString(), icon: <FileText size={18} />, color: '#8b5cf6' },
    { label: 'Streak', value: interviews.length > 0 ? `${interviews.length} sessions` : '0 days', icon: <Clock size={18} />, color: '#f59e0b' },
  ]

  return (
    <main style={{ minHeight: 'calc(100vh - 4rem)', background: 'var(--color-background)', padding: '2.5rem 0 4rem' }}>
      <div className="container-app" style={{ maxWidth: '1360px', margin: '0 auto', width: '100%' }}>
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          {/* Header */}
          <motion.div variants={fadeUp} style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '0.375rem', fontWeight: 700 }}>
              Good evening, <span className="gradient-text">{firstName}</span> 👋
            </h1>
            <p style={{ color: 'var(--color-muted-foreground)', fontSize: '1.0625rem' }}>
              Ready to practice? Your next voice interview is waiting.
            </p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {quickStats.map((s) => (
              <div key={s.label} className="card" style={{ padding: '1.5rem 1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-muted-foreground)', fontWeight: 600 }}>{s.label}</span>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                    {s.icon}
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-foreground)' }}>{s.value}</div>
              </div>
            ))}
          </motion.div>

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.75rem' }}>

            {/* Start Interview CTA */}
            <motion.div variants={fadeUp}>
              <div style={{
                background: 'linear-gradient(135deg, #0A0A0C 0%, #141418 100%)',
                border: '1px solid rgba(77,212,219,0.3)',
                borderRadius: '1.5rem',
                padding: '2.75rem', position: 'relative', overflow: 'hidden', height: '100%',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
              }}>
                <div style={{ position: 'absolute', top: '-4rem', right: '-4rem', width: '22rem', height: '22rem', borderRadius: '50%', background: 'radial-gradient(circle, rgba(77,212,219,0.25) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.03, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4dd4db' }} className="animate-activity" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4dd4db', fontWeight: 700 }}>
                      AI Interviewer Active
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', color: '#F3F4F6', lineHeight: 1.2, marginBottom: '0.875rem', fontWeight: 700 }}>
                    Start your next<br />
                    <span style={{ background: 'linear-gradient(to right, #4dd4db, #22b8bf)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                      voice interview
                    </span>
                  </h2>
                  <p style={{ fontSize: '1rem', color: 'rgba(243, 244, 246, 0.75)', marginBottom: '2.25rem', lineHeight: 1.6, maxWidth: '480px' }}>
                    Select your target role, difficulty, and practice with an AI that listens, evaluates STAR criteria, and adapts in real time.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    <Link to="/interview/setup" className="btn btn-primary" style={{ gap: '0.5rem', padding: '0.875rem 2rem', fontWeight: 700 }}>
                      <Mic2 size={17} /> Start Interview
                    </Link>
                    <Link
                      to="/resumes"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.875rem 1.75rem',
                        borderRadius: 'var(--radius-xl)',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1.5px solid rgba(255, 255, 255, 0.25)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        textDecoration: 'none',
                        backdropFilter: 'blur(8px)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(77, 212, 219, 0.18)'
                        e.currentTarget.style.borderColor = 'var(--color-accent)'
                        e.currentTarget.style.color = 'var(--color-accent)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                        e.currentTarget.style.color = '#FFFFFF'
                      }}
                    >
                      <Plus size={16} /> Upload Resume
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Recent Interviews */}
            <motion.div variants={fadeUp}>
              <div className="card" style={{ padding: '2rem', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>Recent Interviews</h3>
                  <Link to="/interview/setup" className="btn btn-ghost" style={{ fontSize: '0.8125rem', padding: '0.25rem 0.625rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    New <ArrowRight size={13} />
                  </Link>
                </div>

                {interviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                    <Mic2 size={36} color="var(--color-border)" style={{ margin: '0 auto 0.75rem' }} />
                    <p style={{ fontSize: '0.9375rem', color: 'var(--color-muted-foreground)' }}>No interviews yet.<br />Start your first session!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {interviews.slice(0, 5).map((iv) => (
                      <div
                        key={iv.id}
                        onClick={() => navigate(iv.overall_score != null ? `/interview/${iv.id}/report` : `/interview/${iv.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.875rem',
                          padding: '0.875rem 1rem', borderRadius: '0.875rem',
                          background: 'var(--color-muted)', cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(77,212,219,0.1)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-muted)' }}
                      >
                        <div style={{
                          width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', flexShrink: 0,
                          background: 'linear-gradient(135deg, #4dd4db, #22b8bf)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Mic2 size={15} color="#072a2c" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{iv.target_role}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', textTransform: 'capitalize' }}>
                            {iv.interview_type} · {new Date(iv.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 700,
                          color: (iv.overall_score ?? 0) >= 8 ? '#10b981' : (iv.overall_score ?? 0) >= 6.5 ? '#118288' : '#f59e0b',
                        }}>
                          {iv.overall_score != null ? `${iv.overall_score}/10` : 'In Progress'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

          </div>

        </motion.div>
      </div>
    </main>
  )
}
