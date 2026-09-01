import axios from 'axios'

function getNormalizedApiUrl(): string {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
  url = url.trim().replace(/\/+$/, '')
  // If user entered backend root e.g. https://voiceprep-api.onrender.com without /api
  if (!url.endsWith('/api') && !url.endsWith('/api/v1')) {
    url = `${url}/api`
  }
  return url
}

export const API_BASE_URL = getNormalizedApiUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT from localStorage to every request
api.interceptors.request.use((config) => {
  try {
    const rawAuth = localStorage.getItem('voiceprep_auth')
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth)
      if (parsed?.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`
      }
    }
  } catch (e) {
    console.error('Error reading auth token:', e)
  }
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('voiceprep_auth')
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// Resume API
export const resumeApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Resume>('/v1/resumes', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: () => api.get<Resume[]>('/v1/resumes'),
  get: (id: string) => api.get<Resume>(`/v1/resumes/${id}`),
  delete: (id: string) => api.delete(`/v1/resumes/${id}`),
  streamProgress: (jobId: string) =>
    new EventSource(`${API_BASE_URL}/v1/resumes/stream/${jobId}`),
}

// Interview API
export const interviewApi = {
  create: (payload: CreateSessionPayload) =>
    api.post<InterviewSession>('/v1/interviews', payload),
  list: () => api.get<InterviewSession[]>('/v1/interviews'),
  get: (id: string) => api.get<InterviewSession>(`/v1/interviews/${id}`),
  getDetail: (id: string) => api.get<InterviewDetail>(`/v1/interviews/${id}/detail`),
  getReport: (id: string) => api.get<InterviewReport>(`/v1/interviews/${id}/report`),
  delete: (id: string) => api.delete(`/v1/interviews/${id}`),
  downloadPdfUrl: (id: string) => `${API_BASE_URL}/v1/interviews/${id}/report/pdf`,
}

export default api

// Types
export interface Resume {
  id: string
  original_filename: string
  status: 'processing' | 'ready' | 'error'
  created_at: string
  extracted_data: {
    name: string
    summary?: string
    skills: string[]
    technical_skills?: string[]
    experience: WorkExperience[]
    education: Education[]
    projects: Project[]
    certifications: string[]
    achievements: string[]
  } | null
}

export interface WorkExperience {
  company: string
  role: string
  duration: string
  highlights: string[]
}

export interface Education {
  institution: string
  degree: string
  year?: string
}

export interface Project {
  name: string
  description: string
  technologies: string[]
}

export interface InterviewSession {
  id: string
  target_role: string
  interview_type: string
  difficulty: string
  total_questions: number
  state: string
  overall_score: number | null
  created_at: string
}

export interface CreateSessionPayload {
  resume_id?: string
  target_role: string
  interview_type: 'behavioral' | 'technical' | 'role_specific'
  difficulty: 'easy' | 'medium' | 'hard'
  total_questions: number
}

export interface InterviewQuestionDetail {
  id: string
  question_text: string
  intent?: string
  order_index: number
  is_followup: boolean
  answer?: string
  evaluation?: {
    overall_score: number
    strengths?: string[]
    weaknesses?: string[]
    feedback: string
  }
}

export interface InterviewDetail {
  id: string
  target_role: string
  interview_type: string
  difficulty: string
  total_questions: number
  state: string
  overall_score: number | null
  started_at: string
  completed_at?: string
  questions: InterviewQuestionDetail[]
}

export interface InterviewReport {
  id: string
  session_id: string
  overall_score: number
  category_scores?: Record<string, number>
  strengths?: string[]
  improvement_areas?: string[]
  summary: string
  recommendations?: string
  created_at: string
}
