import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ON Nutrition Price Dashboard',
  description: 'Optimum Nutrition product price-to-protein analysis dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
