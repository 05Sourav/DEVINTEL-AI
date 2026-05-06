import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'DevIntel AI — Engineering Intelligence Platform',
  description:
    'Understand any GitHub codebase instantly. RAG-powered semantic search, hybrid retrieval, and file-level citations for engineering teams.',
  keywords: ['AI', 'codebase analysis', 'RAG', 'developer tools', 'GitHub'],
  openGraph: {
    title: 'DevIntel AI',
    description: 'Engineering Intelligence Platform for Repositories',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1d2535',
              color: '#e2e8f0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
