'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BrainCircuit, Send, ArrowLeft, FileCode,
  User, Loader2, Copy, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { chatApi } from '@/lib/api'
import type { Message, Chat } from '@/types'

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-surface-2 rounded-2xl rounded-bl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-brand-400 rounded-full typing-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  )
}

// ── Citation pill ─────────────────────────────────────────────────────────────
function CitationPill({ path }: { path: string }) {
  const name = path.split('/').pop() || path
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
      <FileCode className="w-3 h-3" />
      {path}
    </span>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const copyContent = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
          isUser ? 'bg-brand-600' : 'bg-surface-3 border border-white/10'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <BrainCircuit className="w-4 h-4 text-brand-400" />
        )}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm relative group ${
            isUser
              ? 'bg-brand-600 text-white rounded-tr-sm'
              : 'bg-surface-2 border border-white/5 text-slate-200 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="ai-response">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark as any}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ borderRadius: '10px', fontSize: '0.8rem' }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Copy button */}
          {!isUser && (
            <button
              onClick={copyContent}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-surface-3 border border-white/10"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
            </button>
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c) => (
              <CitationPill key={c} path={c} />
            ))}
          </div>
        )}

        <span className="text-[10px] text-slate-600">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  )
}

// ── Main Chat Page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const chatId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [chat, setChat] = useState<Chat | null>(null)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadChat()
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function loadChat() {
    try {
      const [msgsRes] = await Promise.all([
        chatApi.messages(chatId),
      ])
      setMessages(msgsRes.data)
    } catch {
      toast.error('Failed to load chat')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    const q = input.trim()
    if (!q || thinking) return

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: q,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setThinking(true)

    try {
      const { data } = await chatApi.ask(chatId, q)
      const assistantMsg: Message = {
        id: data.message_id,
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to get answer')
    } finally {
      setThinking(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const SUGGESTIONS = [
    'How does authentication work?',
    'Where is the database connection configured?',
    'Explain the main architecture of this codebase',
    'What API routes are available?',
  ]

  return (
    <div className="h-screen bg-[#0f1117] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/5 bg-surface-1/60 backdrop-blur-xl shrink-0">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <BrainCircuit className="w-3.5 h-3.5 text-white" />
          </div>
          <Link href="/dashboard" className="btn-ghost text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <span className="text-slate-600 text-xs">/</span>
          <span className="text-sm text-slate-300 font-medium truncate">Chat</span>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            RAG Active
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center mb-5">
                <BrainCircuit className="w-8 h-8 text-brand-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Ask anything about the codebase</h2>
              <p className="text-slate-400 mb-8 max-w-md">
                DevIntel will search the entire repository, find relevant code, and cite exact files.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); textareaRef.current?.focus() }}
                    className="text-sm px-3 py-2 rounded-xl bg-surface-2 border border-white/10
                               hover:border-brand-500/30 hover:text-brand-300 transition-all duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {thinking && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center shrink-0 mt-1">
                    <BrainCircuit className="w-4 h-4 text-brand-400" />
                  </div>
                  <TypingIndicator />
                </motion.div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/5 bg-surface-1/60 backdrop-blur-xl shrink-0 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-3 bg-surface-2 border border-white/10 rounded-2xl p-3
                          focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/20
                          transition-all duration-200">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={thinking}
              rows={1}
              placeholder="Ask about architecture, auth, APIs, data flow…"
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm resize-none
                         focus:outline-none min-h-[24px] max-h-[200px] leading-relaxed py-1"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 200) + 'px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || thinking}
              className="w-9 h-9 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40
                         disabled:cursor-not-allowed flex items-center justify-center shrink-0
                         transition-all duration-200 shadow-[0_0_15px_rgba(98,114,241,0.4)]
                         hover:shadow-[0_0_25px_rgba(98,114,241,0.6)]"
            >
              {thinking ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-slate-600 text-center mt-2">
            Press Enter to send · Shift+Enter for new line · Answers cite exact file paths
          </p>
        </div>
      </div>
    </div>
  )
}
