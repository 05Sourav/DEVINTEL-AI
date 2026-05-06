'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BrainCircuit,
  GitBranch,
  Search,
  Zap,
  Shield,
  ArrowRight,
  Code2,
  FileText,
  Database,
  ChevronRight,
  Star,
} from 'lucide-react'

const FEATURES = [
  {
    icon: GitBranch,
    title: 'GitHub Ingestion',
    desc: 'Import any public GitHub repository. We parse, classify, and index every relevant file automatically.',
  },
  {
    icon: Search,
    title: 'Hybrid Search',
    desc: 'Semantic vector search + keyword matching fused together for maximum retrieval precision.',
  },
  {
    icon: Zap,
    title: 'Intelligent Reranking',
    desc: 'LLM-powered reranker selects the most relevant chunks before generating answers.',
  },
  {
    icon: FileText,
    title: 'File Citations',
    desc: 'Every answer is grounded in your code with exact file paths — no hallucinations.',
  },
  {
    icon: BrainCircuit,
    title: 'Architecture Insights',
    desc: 'One click to understand the full stack: frontend, backend, database, auth, caching.',
  },
  {
    icon: Shield,
    title: 'Conversation Memory',
    desc: 'Ask follow-up questions naturally. DevIntel remembers context across your session.',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Import Repository', desc: 'Paste any GitHub URL and click Analyze.' },
  { step: '02', title: 'AI Indexing', desc: 'We fetch files, chunk by function/section, embed them into a vector store.' },
  { step: '03', title: 'Ask Anything', desc: 'Type a question. Get a precise, cited answer in seconds.' },
]

const STACK_BADGES = ['FastAPI', 'Qdrant', 'OpenAI', 'Next.js', 'PostgreSQL', 'RAG']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 overflow-x-hidden">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0f1117]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-[0_0_20px_rgba(98,114,241,0.5)]">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">DevIntel AI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-slate-100 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-100 transition-colors">How it works</a>
            <a href="#stack" className="hover:text-slate-100 transition-colors">Stack</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link href="/login?tab=register" className="btn-primary text-sm">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-6 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-brand-600/10 rounded-full blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-8">
            <Star className="w-3 h-3 fill-brand-400 text-brand-400" />
            RAG-Powered Engineering Intelligence
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Understand any{' '}
            <span className="gradient-text">codebase</span>
            <br />in minutes, not days.
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            DevIntel AI ingests GitHub repositories, builds a semantic index,
            and answers your architecture questions with{' '}
            <span className="text-slate-200 font-medium">precise file-level citations</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login?tab=register" className="btn-primary px-8 py-3.5 text-base">
              Analyze Your First Repo <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary px-8 py-3.5 text-base"
            >
              <Code2 className="w-4 h-4" /> View on GitHub
            </a>
          </div>
        </motion.div>

        {/* Hero terminal mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative max-w-3xl mx-auto mt-20"
        >
          <div className="glass-card p-1 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
            {/* Terminal chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-slate-500 text-xs font-mono">DevIntel Chat</span>
            </div>
            <div className="p-6 text-left space-y-4 font-mono text-sm">
              <div>
                <p className="text-slate-400 text-xs mb-2">You</p>
                <p className="text-slate-100">How does authentication work in this codebase?</p>
              </div>
              <div className="border-l-2 border-brand-500/50 pl-4">
                <p className="text-slate-400 text-xs mb-2">DevIntel AI</p>
                <p className="text-slate-200 leading-relaxed">
                  Authentication is handled via <span className="text-brand-300">JWT tokens</span>.
                  The login flow starts in <span className="text-emerald-400">src/routes/auth.ts</span>,
                  where credentials are validated against the database.
                  A signed JWT is returned and stored in httpOnly cookies.
                  Subsequent requests are verified by the middleware in{' '}
                  <span className="text-emerald-400">src/middleware/auth.ts</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['src/routes/auth.ts', 'src/middleware/auth.ts', 'src/services/jwt.ts'].map((f) => (
                    <span key={f} className="badge badge-info font-mono text-[10px]">
                      📄 {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for real engineering work
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Not a toy chatbot. A precision retrieval system with production-grade accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                viewport={{ once: true }}
                className="glass-card-hover p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center mb-4">
                  <feat.icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-semibold text-slate-100 mb-2">{feat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-surface-1/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">From URL to insight in seconds</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-5xl font-black gradient-text mb-4">{step.step}</div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stack ──────────────────────────────────────────── */}
      <section id="stack" className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Production-grade AI stack</h2>
          <p className="text-slate-400 mb-10">Every component chosen for correctness, speed, and scalability.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {STACK_BADGES.map((b) => (
              <span key={b} className="badge badge-info text-sm px-4 py-2">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-violet-600/5" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-4">Ready to explore your codebase?</h2>
              <p className="text-slate-400 mb-8">
                Import your first repository — it takes under 2 minutes.
              </p>
              <Link href="/login?tab=register" className="btn-primary px-8 py-3.5 text-base">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-500 text-sm">
        <p>© 2026 DevIntel AI · Built by Sourav Singh · Powered by RAG + OpenAI</p>
      </footer>
    </div>
  )
}
