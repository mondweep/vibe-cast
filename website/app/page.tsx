'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Vision from '@/components/Vision'
import Programme from '@/components/Programme'
import Faculty from '@/components/Faculty'
import Fundraising from '@/components/Fundraising'
import StudentRegistration from '@/components/StudentRegistration'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'

export default function Home() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  return (
    <main className="bg-white">
      <Header />
      <Hero />
      <Vision />
      <Programme />
      <Faculty />
      <Fundraising />
      <StudentRegistration />
      <Contact />
      <Footer />
    </main>
  )
}
