import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { Mic2, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

const perks = [
  'AI interviews tailored to your resume',
  'Behavioral & technical question types',
  'Detailed scored feedback report',
  'Track progress over time',
]

export default function RegisterPage() {
  const { register, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }))
    clearError()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(form.email, form.password, form.name)
      navigate('/dashboard')
    } catch { /* shown from store */ }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--color-background)' }}>
      {/* Left — Form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 4rem' }}>
        <motion.div
          initial="hidden" animate="visible" variants={stagger}
          style={{ width: '100%', maxWidth: '420px' }}
        >
          <motion.div variants={fadeUp} style={{ marginBottom: '0.5rem' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '2rem', width: 'fit-content' }}>
              <div style={{
                width: '2rem', height: '2rem', borderRadius: '0.625rem',
                background: 'linear-gradient(135deg, #4dd4db, #22b8bf)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mic2 size={13} color="#072a2c" />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--color-foreground)' }}>VoicePrep</span>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '0.5rem' }}>
              Create your account
            </h1>
            <p style={{ color: 'var(--color-muted-foreground)', fontSize: '0.9375rem', marginBottom: '2rem' }}>
              Free to start. No credit card required.
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
            {[
              { key: 'name' as const, label: 'Full Name', type: 'text', placeholder: 'Jane Doe', Icon: User },
              { key: 'email' as const, label: 'Email', type: 'email', placeholder: 'you@example.com', Icon: Mail },
            ].map(({ key, label, type, placeholder, Icon }) => (
              <motion.div key={key} variants={fadeUp} style={{ marginBottom: '1.125rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <Icon size={15} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted-foreground)' }} />
                  <input
                    type={type} required value={form[key]}
                    onChange={set(key)}
                    className="input" style={{ paddingLeft: '2.75rem' }}
                    placeholder={placeholder}
                  />
                </div>
              </motion.div>
            ))}

            <motion.div variants={fadeUp} style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted-foreground)' }} />
                <input
                  type={showPassword ? 'text' : 'password'} required minLength={8}
                  value={form.password} onChange={set('password')}
                  className="input" style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }}
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: 'var(--color-muted-foreground)' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={fadeUp}>
              <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg" style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }}>
                {isLoading ? 'Creating account…' : (<>Create Account <ArrowRight size={17} /></>)}
              </button>
            </motion.div>
          </form>

          <motion.p variants={fadeUp} style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--color-muted-foreground)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-accent)', fontWeight: 500, textDecoration: 'none' }}>
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>

      {/* Right — Brand Panel */}
      <div style={{
        background: 'var(--color-foreground)', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem 3.5rem',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.03 }} />
        <div style={{ position: 'absolute', top: '-6rem', right: '-6rem', width: '28rem', height: '28rem', borderRadius: '50%', background: 'radial-gradient(circle, rgba(77,212,219,0.2) 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <div style={{ position: 'relative' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', color: 'white', lineHeight: 1.2, marginBottom: '1.5rem' }}>
            Everything you need<br />
            <span style={{ background: 'linear-gradient(to right, #4dd4db, #22b8bf)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              to ace the interview.
            </span>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {perks.map((p) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'rgba(77,212,219,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={12} color="#4dd4db" />
                </div>
                <span style={{ fontSize: '0.9375rem', color: 'rgba(255,255,255,0.65)' }}>{p}</span>
              </div>
            ))}
          </div>

          {/* Preview card */}
          <div style={{
            marginTop: '2.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem', padding: '1.25rem 1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'linear-gradient(135deg, #4dd4db, #22b8bf)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic2 size={14} color="#072a2c" />
              </div>
              <div>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'white' }}>AI Interviewer</p>
                <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)' }}>Technical Interview — Senior SWE</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4dd4db' }} className="animate-activity" />
                <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>LIVE</span>
              </div>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>
              "Tell me about a distributed system you've designed and the tradeoffs you made..."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
