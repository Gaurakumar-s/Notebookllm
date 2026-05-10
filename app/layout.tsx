import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'NotebookLM — Chat with your Documents',
  description:
    'Upload any PDF or text file and have a grounded AI conversation with it. Powered by RAG — Retrieval Augmented Generation.',
  keywords: ['RAG', 'NotebookLM', 'AI', 'document chat', 'PDF chat'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                    console.log('Unregistered stale service worker:', registration);
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
