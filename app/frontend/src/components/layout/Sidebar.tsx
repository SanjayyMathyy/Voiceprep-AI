import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import {
  Mic2,
  LayoutDashboard,
  FileText,
  History,
  LogOut,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react'

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const rawName = user?.full_name || (user as any)?.user_metadata?.full_name
  const initials = rawName
    ? rawName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'VP'

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Resumes', path: '/resumes', icon: FileText },
    { label: 'Practice Interview', path: '/interview/setup', icon: Mic2 },
    { label: 'Session History', path: '/history', icon: History },
  ]

  return (
    <aside style={{
      width: '260px',
      minWidth: '260px',
      height: '100vh',
      position: 'sticky',
      top: 0,
      background: 'var(--color-card)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.5rem 1.25rem',
      zIndex: 40,
      transition: 'background 0.25s ease, border-color 0.25s ease',
    }}>
      {/* Top Section: Brand + Navigation */}
      <div>
        {/* Brand Logo */}
        <Link to="/dashboard" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          textDecoration: 'none',
          marginBottom: '2rem',
          padding: '0.25rem 0.5rem',
        }}>
          <div style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, #4dd4db, #22b8bf)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(77,212,219,0.3)',
          }}>
            <Mic2 size={16} color="#072a2c" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.1875rem',
              color: 'var(--color-foreground)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              VoicePrep
            </div>
            <span style={{
              fontSize: '0.6875rem',
              color: 'var(--color-accent)',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              AI Interview Coach
            </span>
          </div>
        </Link>

        {/* Quick Action: Start Voice Interview */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link
            to="/interview/setup"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              borderRadius: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Sparkles size={15} />
            Start Interview
          </Link>
        </div>

        {/* Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6875rem 0.875rem',
                  borderRadius: '0.75rem',
                  textDecoration: 'none',
                  fontSize: '0.9375rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--color-accent)' : 'var(--color-muted-foreground)',
                  background: isActive ? 'rgba(77, 212, 219, 0.14)' : 'transparent',
                  border: isActive ? '1px solid rgba(77, 212, 219, 0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--color-muted)'
                    e.currentTarget.style.color = 'var(--color-foreground)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--color-muted-foreground)'
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={18} color={isActive ? 'var(--color-accent)' : 'currentColor'} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight size={14} color="var(--color-accent)" />}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Bottom Section: Theme Toggle + User Profile & Logout */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.625rem',
            border: '1px solid var(--color-border)',
            background: 'var(--color-muted)',
            color: 'var(--color-foreground)',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {theme === 'dark' ? <Moon size={15} color="#4dd4db" /> : <Sun size={15} color="#F59E0B" />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Toggle
          </span>
        </button>

        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.5rem',
          borderRadius: '0.75rem',
          background: 'var(--color-muted)',
        }}>
          <div style={{
            width: '2.25rem',
            height: '2.25rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4dd4db, #22b8bf)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#072a2c',
            fontSize: '0.75rem',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--color-foreground)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0,
            }}>
              {rawName || 'User'}
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--color-muted-foreground)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: 0,
            }}>
              {user?.email}
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.5rem 0.75rem',
            background: 'none',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: 'var(--color-destructive)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
