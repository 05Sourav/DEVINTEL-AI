'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BrainCircuit, ArrowLeft, MessageSquare, Layers,
  FileCode, GitBranch, CheckCircle, Loader2, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsApi, ingestApi, chatApi } from '@/lib/api'
import type { Project, Chat, ArchitectureSummary } from '@/types'

const LANG_COLOR: Record<string, string> = {
  python: 'text-blue-400', typescript: 'text-sky-400', javascript: 'text-yellow-400',
  java: 'text-orange-400', go: 'text-cyan-400', rust: 'text-red-400', default: 'text-slate-400',
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [arch, setArch] = useState<ArchitectureSummary | null>(null)
  const [archLoading, setArchLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [projRes, chatsRes] = await Promise.all([
        projectsApi.get(projectId),
        chatApi.listByProject(projectId),
      ])
      setProject(projRes.data)
      setChats(chatsRes.data)
    } catch {
      toast.error('Failed to load project')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function startNewChat() {
    try {
      const { data } = await chatApi.create(projectId, 'New Chat')
      router.push(`/chat/${data.id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create chat')
    }
  }

  async function loadArchitecture() {
    setArchLoading(true)
    try {
      const { data } = await ingestApi.architecture(projectId)
      setArch(data)
    } catch {
      toast.error('Failed to generate architecture summary')
    } finally {
      setArchLoading(false)
    }
  }

  if (loading || !project) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  const langColor = LANG_COLOR[project.primary_language?.toLowerCase() || 'default'] || LANG_COLOR.default

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      {/* Nav */}
      <nav className="border-b border-white/5 bg-surface-1/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <Link href="/dashboard" className="btn-ghost">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <span className="font-medium text-slate-200">{project.name}</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Project info card */}
            <div className="glass-card p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
                  <GitBranch className="w-5 h-5 text-brand-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-bold text-lg leading-tight">{project.name}</h1>
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-400 hover:underline truncate block"
                  >
                    {project.github_url}
                  </a>
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-slate-400 mb-4">{project.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Files', value: project.total_files },
                  { label: 'Chunks', value: project.total_chunks.toLocaleString() },
                  { label: 'Language', value: <span className={langColor}>{project.primary_language || '—'}</span> },
                  { label: 'Status', value: <span className="badge-success badge capitalize">{project.status}</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-2 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className="text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Architecture button */}
            <button
              onClick={loadArchitecture}
              disabled={archLoading}
              className="btn-secondary w-full justify-center py-3"
            >
              {archLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              ) : (
                <><Sparkles className="w-4 h-4 text-violet-400" /> Explain Architecture</>
              )}
            </button>

            {/* Architecture summary */}
            {arch && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6"
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400" /> Architecture
                </h3>
                <p className="text-sm text-slate-300 mb-4 leading-relaxed">{arch.summary}</p>
                <div className="space-y-2">
                  {Object.entries(arch.detected_stack)
                    .filter(([, v]) => v && !Array.isArray(v))
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 capitalize">{key}</span>
                        <span className="text-slate-200 font-medium">{value as string}</span>
                      </div>
                    ))}
                  {arch.detected_stack.languages && arch.detected_stack.languages.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Languages</span>
                      <span className="text-slate-200">{arch.detected_stack.languages.join(', ')}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right column — chats */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-400" />
                Chat Sessions
              </h2>
              <button onClick={startNewChat} className="btn-primary">
                <MessageSquare className="w-4 h-4" /> New Chat
              </button>
            </div>

            {chats.length === 0 ? (
              <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare className="w-10 h-10 text-brand-400/50 mb-4" />
                <h3 className="font-medium text-slate-300 mb-2">No chats yet</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Start asking questions about this codebase.
                </p>
                <button onClick={startNewChat} className="btn-primary">
                  <MessageSquare className="w-4 h-4" /> Start First Chat
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat, i) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={`/chat/${chat.id}`}
                      className="glass-card-hover p-4 flex items-center gap-4 block"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{chat.title || 'Chat'}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(chat.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-slate-500 text-sm">→</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
