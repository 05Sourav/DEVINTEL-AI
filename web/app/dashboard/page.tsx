'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BrainCircuit, Plus, GitBranch, Clock, Loader2,
  CheckCircle, AlertCircle, FolderOpen, LogOut, BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/hooks/useAuth'
import { projectsApi, ingestApi } from '@/lib/api'
import type { Project } from '@/types'

function StatusBadge({ status }: { status: Project['status'] }) {
  const map = {
    pending: { cls: 'badge-pending', label: 'Pending', icon: Clock },
    ingesting: { cls: 'badge-warning', label: 'Ingesting…', icon: Loader2 },
    ready: { cls: 'badge-success', label: 'Ready', icon: CheckCircle },
    failed: { cls: 'badge-error', label: 'Failed', icon: AlertCircle },
  }
  const { cls, label, icon: Icon } = map[status] || map.pending
  return (
    <span className={`badge ${cls}`}>
      <Icon className={`w-3 h-3 ${status === 'ingesting' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  )
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', github_url: '', description: '' })
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: project } = await projectsApi.create(form)
      toast.success('Project created! Starting ingestion…')
      await ingestApi.start(project.id)
      onCreated()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md glass-card p-6 z-10"
      >
        <h2 className="text-xl font-bold mb-5">New Project</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Project Name</label>
            <input
              className="input-field"
              placeholder="My Awesome Repo"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">GitHub URL</label>
            <input
              className="input-field"
              placeholder="https://github.com/owner/repo"
              required
              value={form.github_url}
              onChange={(e) => setForm({ ...form, github_url: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Description (optional)</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Brief description…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Create & Analyze</>}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, token, fetchMe, logout } = useAuthStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    fetchMe()
    loadProjects()
  }, [])

  // Poll ingesting projects
  useEffect(() => {
    const ingesting = projects.filter((p) => p.status === 'ingesting')
    if (ingesting.length === 0) return
    const interval = setInterval(loadProjects, 5000)
    return () => clearInterval(interval)
  }, [projects])

  async function loadProjects() {
    try {
      const { data } = await projectsApi.list()
      setProjects(data)
    } catch {
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-surface-1/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">DevIntel AI</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user?.email}</span>
            <button onClick={logout} className="btn-ghost">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Developer'} 👋
            </h1>
            <p className="text-slate-400">Your indexed repositories</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Projects', value: projects.length, icon: FolderOpen },
            { label: 'Ready to Query', value: projects.filter((p) => p.status === 'ready').length, icon: CheckCircle },
            { label: 'Total Chunks', value: projects.reduce((a, p) => a + p.total_chunks, 0).toLocaleString(), icon: BarChart3 },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Projects grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
              <GitBranch className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-slate-400 mb-6">Import your first GitHub repository to get started.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card-hover p-6 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate mb-1">{project.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{project.github_url}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>

                {project.description && (
                  <p className="text-sm text-slate-400 line-clamp-2">{project.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{project.total_files} files</span>
                  <span>{project.total_chunks.toLocaleString()} chunks</span>
                  {project.primary_language && <span>{project.primary_language}</span>}
                </div>

                <div className="flex gap-2 mt-auto">
                  {project.status === 'ready' ? (
                    <Link
                      href={`/project/${project.id}`}
                      className="btn-primary flex-1 justify-center text-sm py-2"
                    >
                      Open Workspace →
                    </Link>
                  ) : project.status === 'failed' ? (
                    <button
                      onClick={async () => {
                        await ingestApi.start(project.id)
                        loadProjects()
                        toast.success('Re-ingestion started')
                      }}
                      className="btn-secondary flex-1 justify-center text-sm py-2"
                    >
                      Retry Ingestion
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 text-sm text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Processing…
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={loadProjects}
        />
      )}
    </div>
  )
}
