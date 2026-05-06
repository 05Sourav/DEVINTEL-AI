import { create } from 'zustand'
import type { User, Project, Chat, Message } from '@/types'
import { authApi } from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  setToken: (token: string) => void
  setUser: (user: User) => void
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('devintel_token') : null,

  setToken: (token) => {
    localStorage.setItem('devintel_token', token)
    set({ token })
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('devintel_token')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  fetchMe: async () => {
    try {
      const { data } = await authApi.me()
      set({ user: data })
    } catch {
      localStorage.removeItem('devintel_token')
      set({ user: null, token: null })
    }
  },
}))
