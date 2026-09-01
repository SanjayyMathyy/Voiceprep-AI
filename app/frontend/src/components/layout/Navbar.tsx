import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { Mic2, LayoutDashboard, FileText, LogOut, ChevronDown, Sun, Moon } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const rawName = user?.full_name || (user as any)?.user_metadata?.full_name
  const initials = rawName
    ? rawName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'VP'

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-card)',
      backdropFilter: 'blur(12px)',
    }}>
      <div className="container-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>
        {/* Logo */}
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
          <div style={{
            width: '2rem', height: '2rem', borderRadius: '0.625rem',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic2 size={14} color="#072a2c" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--color-foreground)', fontWeight: 700 }}>
            VoicePrep
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link to="/dashboard" className="btn btn-ghost" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={15} />
            Dashboard
          </Link>
          <Link to="/resumes" className="btn btn-ghost" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={15} />
            Resumes
          </Link>
          <Link to="/interview/setup" className="btn btn-ghost" style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mic2 size={15} />
            Interview
          </Link>
        </div>

        {/* Actions & User menu */}
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

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'none', border: '1px solid var(--color-border)',
                borderRadius: '9999px', padding: '0.25rem 0.75rem 0.25rem 0.25rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#072a2c', fontSize: '0.6875rem', fontWeight: 700,
              }}>
                {initials}
              </div>
              <ChevronDown size={13} color="var(--color-muted-foreground)" />
            </button>

            {menuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                background: 'var(--color-card)', border: '1px solid var(--color-border)',
                borderRadius: '0.875rem', padding: '0.375rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                minWidth: '180px', zIndex: 100,
              }}>
                <div style={{ padding: '0.5rem 0.75rem 0.625rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.25rem' }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-foreground)' }}>
                    {rawName ?? 'User'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', marginTop: '0.125rem' }}>
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.75rem', background: 'none', border: 'none',
                    borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem',
                    color: 'var(--color-destructive)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
