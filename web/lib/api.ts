import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('devintel_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('devintel_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

// ── Projects ──────────────────────────────────────────────
export const projectsApi = {
  list: () => api.get('/projects/'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: { name: string; github_url: string; description?: string }) =>
    api.post('/projects/', data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}

// ── Ingestion ─────────────────────────────────────────────
export const ingestApi = {
  start: (project_id: string) => api.post('/ingest/repo', { project_id }),
  status: (project_id: string) => api.get(`/ingest/status/${project_id}`),
  architecture: (project_id: string) => api.get(`/ingest/architecture/${project_id}`),
}

// ── Chat ──────────────────────────────────────────────────
export const chatApi = {
  create: (project_id: string, title?: string) =>
    api.post('/chat/', { project_id, title }),
  listByProject: (project_id: string) => api.get(`/chat/project/${project_id}`),
  messages: (chat_id: string) => api.get(`/chat/${chat_id}/messages`),
  ask: (chat_id: string, question: string) =>
    api.post('/chat/ask', { chat_id, question }),
}

export default api
