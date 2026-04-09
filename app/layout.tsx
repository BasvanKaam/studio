import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nerdio Content Studio',
  description: 'L&D content generation for Nerdio University',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
