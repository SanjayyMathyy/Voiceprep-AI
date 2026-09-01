import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import ResumeUploadPage from '@/pages/ResumeUploadPage'
import InterviewSetupPage from '@/pages/InterviewSetupPage'
import InterviewRoomPage from '@/pages/InterviewRoomPage'
import InterviewReportPage from '@/pages/InterviewReportPage'
import InterviewHistoryPage from '@/pages/InterviewHistoryPage'
import AppLayout from '@/components/layout/AppLayout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={<PublicRoute><LoginPage /></PublicRoute>}
      />
      <Route
        path="/register"
        element={<PublicRoute><RegisterPage /></PublicRoute>}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/resumes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ResumeUploadPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/setup"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InterviewSetupPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:sessionId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InterviewRoomPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/interview/:sessionId/report"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InterviewReportPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AppLayout>
              <InterviewHistoryPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
