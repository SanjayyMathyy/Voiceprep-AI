import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { Mic2, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch { /* error shown from store */ }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr',
      background: 'var(--color-background)',
    }}>
      {/* Left — Brand Panel */}
      <div style={{
        background: 'var(--color-foreground)', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem',
      }}>
        {/* Dot texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '32px 32px', opacity: 0.03, pointerEvents: 'none',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute', bottom: '-8rem', left: '-4rem',
          width: '32rem', height: '32rem', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(77,212,219,0.2) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #4dd4db, #22b8bf)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic2 size={17} color="#072a2c" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'white' }}>
            VoicePrep
          </span>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            letterSpacing: '-0.03em',
            color: 'white', lineHeight: 1.2, marginBottom: '1.25rem',
          }}>
            Practice until<br />
            <span style={{
              background: 'linear-gradient(to right, #4dd4db, #22b8bf)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              you can't fail.
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9375rem', lineHeight: 1.7, maxWidth: '320px' }}>
            AI-powered voice interviews tailored to your resume and target role. Get honest feedback. Land the offer.
          </p>

          {/* Mini stats */}
          <div style={{ display: 'flex', gap: '2rem', marginTop: '2.5rem' }}>
            {[['50K+', 'Interviews'], ['94%', 'Satisfaction'], ['3×', 'Offer Rate']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'white' }}>{v}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.125rem' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 4rem' }}>
        <motion.div
          initial="hidden" animate="visible" variants={stagger}
          style={{ width: '100%', maxWidth: '420px' }}
        >
          <motion.div variants={fadeUp}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
              Welcome back
            </h1>
            <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.9375rem', marginBottom: '2.5rem' }}>
              Sign in to continue your interview practice.
            </p>
          </motion.div>

          {error && (
            <motion.div variants={fadeUp} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '0.75rem', padding: '0.875rem 1rem', marginBottom: '1.5rem',
            }}>
              <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontSize: '0.875rem', color: '#EF4444' }}>{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <motion.div variants={fadeUp} style={{ marginBottom: '1.125rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-muted-foreground)',
                }} />
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '2.75rem' }}
                  placeholder="you@example.com"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUp} style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--color-muted-foreground)',
                }} />
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                    color: 'var(--color-muted-foreground)',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? 'Signing in…' : (
                  <>Sign in <ArrowRight size={17} /></>
                )}
              </button>
            </motion.div>
          </form>

          <motion.p variants={fadeUp} style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--color-muted-foreground)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-accent)', fontWeight: 500, textDecoration: 'none' }}>
              Create one free
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
