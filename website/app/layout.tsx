import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bernardi Music Group - Summer School, Assam',
  description: 'An international music education initiative inspired by Zubeen Garg. World-class training with leading musicians from the Bernardi Music Group.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-white">{children}</body>
    </html>
  )
}
