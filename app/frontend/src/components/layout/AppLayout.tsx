import React from 'react'
import Sidebar from './Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      background: 'var(--color-background)',
    }}>
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area: Expansive Left-to-Right */}
      <div style={{
        flex: 1,
        minWidth: 0,
        overflowY: 'auto',
        minHeight: '100vh',
      }}>
        {children}
      </div>
    </div>
  )
}
