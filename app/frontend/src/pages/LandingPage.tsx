import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/store/themeStore'
import { Mic2, ArrowRight, Sparkles, Zap, Shield, Target, Sun, Moon } from 'lucide-react'

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }

export default function LandingPage() {
  const { theme, toggleTheme } = useThemeStore()
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-foreground)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Navbar ──────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'rgba(250,250,250,0.9)',
        backdropFilter: 'blur(16px)',
      }}>
        <div className="container-app" style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: '4rem',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '0.625rem',
              background: 'linear-gradient(135deg, #4dd4db, #22b8bf)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Mic2 size={14} color="#072a2c" />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.125rem',
              color: 'var(--color-foreground)',
              letterSpacing: '-0.01em',
            }}>
              VoicePrep
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={toggleTheme}
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.625rem',
                border: '1px solid var(--color-border)',
                background: 'var(--color-muted)',
                color: 'var(--color-foreground)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Moon size={15} color="#4dd4db" /> : <Sun size={15} color="#F59E0B" />}
            </button>
            <Link to="/login" className="btn btn-ghost" style={{
              fontSize: '0.875rem',
              color: 'var(--color-muted-foreground)',
              padding: '0.5rem 1rem',
              height: 'auto',
            }}>
              Sign in
            </Link>
            <Link to="/register" className="btn btn-primary" style={{
              fontSize: '0.875rem',
              height: '2.5rem',
              padding: '0 1.25rem',
              borderRadius: '0.75rem',
            }}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '4rem',
      }}>
        <div style={{ width: '100%' }}>
          {/* Subtle top glow */}
          <div style={{
            position: 'fixed', top: 0, left: '50%',
            transform: 'translateX(-50%)',
            width: '800px', height: '400px',
            background: 'radial-gradient(ellipse at top, rgba(77,212,219,0.14) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }} />

          <div className="container-app" style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', textAlign: 'center',
            padding: '6rem 2rem 5rem',
          }}>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              style={{ maxWidth: '780px', width: '100%' }}
            >
              {/* Live badge */}
              <motion.div variants={fadeUp} style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(77,212,219,0.12)',
                  border: '1.5px solid rgba(77,212,219,0.35)',
                  borderRadius: '9999px',
                  padding: '0.35rem 1rem 0.35rem 0.6rem',
                }}>
                  <div style={{
                    width: '1.5rem', height: '1.5rem', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4dd4db, #22b8bf)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Zap size={11} color="#072a2c" fill="#072a2c" />
                  </div>
                  <span style={{
                    fontSize: '0.8125rem', fontWeight: 700,
                    color: '#0e7075',
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: '0.01em',
                  }}>
                    AI-powered live voice interviews
                  </span>
                </div>
              </motion.div>

              {/* Headline */}
              <motion.h1 variants={fadeUp} style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
                letterSpacing: '-0.03em',
                lineHeight: 1.08,
                color: 'var(--color-foreground)',
                marginBottom: '1.25rem',
              }}>
                Welcome to{' '}
                <span className="gradient-text">VoicePrep</span>
              </motion.h1>

              {/* Subtext */}
              <motion.p variants={fadeUp} style={{
                fontSize: '1.125rem',
                color: 'var(--color-muted-foreground)',
                lineHeight: 1.7,
                marginBottom: '2.5rem',
                maxWidth: '620px',
                margin: '0 auto 2.5rem',
              }}>
                Upload your resume, choose your target role, and practice real-time voice interviews with an AI that evaluates STAR rubrics and gives instant actionable feedback.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={fadeUp} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '3.5rem',
              }}>
                <Link to="/register" className="btn btn-primary" style={{
                  height: '3.25rem',
                  padding: '0 2rem',
                  fontSize: '1rem',
                  borderRadius: '0.875rem',
                  gap: '0.5rem',
                }}>
                  Start practicing free
                  <ArrowRight size={17} />
                </Link>
                <Link to="/login" className="btn btn-secondary" style={{
                  height: '3.25rem',
                  padding: '0 1.75rem',
                  fontSize: '1rem',
                  borderRadius: '0.875rem',
                }}>
                  Sign in
                </Link>
              </motion.div>

              {/* Feature pills */}
              <motion.div variants={fadeUp} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2rem',
                flexWrap: 'wrap',
                paddingTop: '2rem',
                borderTop: '1px solid var(--color-border)',
              }}>
                {[
                  { icon: <Sparkles size={16} color="#118288" />, text: 'Resume-tailored questions' },
                  { icon: <Target size={16} color="#118288" />, text: 'STAR rubric evaluation' },
                  { icon: <Shield size={16} color="#118288" />, text: 'Zero latency voice loop' },
                ].map(item => (
                  <div key={item.text} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontSize: '0.875rem', color: 'var(--color-muted-foreground)',
                    fontWeight: 500,
                  }}>
                    {item.icon}
                    <span>{item.text}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '1.5rem 0',
        textAlign: 'center',
      }}>
        <div className="container-app">
          <p style={{
            fontSize: '0.8125rem',
            color: 'var(--color-muted-foreground)',
          }}>
            VoicePrep © {new Date().getFullYear()} · AI Voice Interview Platform
          </p>
        </div>
      </footer>
    </div>
  )
}
