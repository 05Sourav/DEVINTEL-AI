// Shared TypeScript types for DevIntel AI frontend

export interface User {
  id: string
  email: string
  full_name?: string
  created_at: string
}

export interface Project {
  id: string
  name: string
  github_url: string
  description?: string
  status: 'pending' | 'ingesting' | 'ready' | 'failed'
  total_files: number
  total_chunks: number
  primary_language?: string
  created_at: string
  updated_at: string
}

export interface Chat {
  id: string
  project_id: string
  title?: string
  created_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: string[]
  created_at: string
}

export interface IngestStatus {
  project_id: string
  status: string
  total_files: number
  total_chunks: number
  message?: string
}

export interface ArchitectureSummary {
  project_id: string
  summary: string
  detected_stack: {
    frontend?: string
    backend?: string
    database?: string
    auth?: string
    caching?: string
    deployment?: string
    languages?: string[]
    frameworks?: string[]
  }
}
