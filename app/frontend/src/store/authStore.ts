import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/services/api'

export interface User {
  id: string
  email: string
  full_name?: string
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      initialize: async () => {
        const token = get().token
        if (token) {
          try {
            const res = await api.get<User>('/v1/auth/me')
            set({ user: res.data })
          } catch {
            set({ user: null, token: null })
          }
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post<{ access_token: string; user: User }>('/v1/auth/login', {
            email,
            password,
          })
          const { access_token, user } = res.data
          set({ user, token: access_token })
        } catch (err: any) {
          const msg = err.response?.data?.detail || err.message || 'Login failed'
          set({ error: msg })
          throw new Error(msg)
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (email, password, fullName) => {
        set({ isLoading: true, error: null })
        try {
          const res = await api.post<{ access_token: string; user: User }>('/v1/auth/register', {
            email,
            password,
            full_name: fullName,
          })
          const { access_token, user } = res.data
          set({ user, token: access_token })
        } catch (err: any) {
          const msg = err.response?.data?.detail || err.message || 'Registration failed'
          set({ error: msg })
          throw new Error(msg)
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        set({ user: null, token: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'voiceprep_auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
