'use client'

import { useState } from 'react'

export default function Contact() {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setContactForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Contact form:', contactForm)
    setSubmitted(true)
    setContactForm({ name: '', email: '', subject: '', message: '' })
    setTimeout(() => setSubmitted(false), 5000)
  }

  return (
    <section className="py-20 bg-white">
      <div className="container max-w-4xl">
        <h2 className="text-center mb-12">Get in Touch</h2>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="text-3xl mb-4">📧</div>
            <h3 className="font-bold text-bmg-blue mb-2">Email</h3>
            <p className="text-gray-700 text-sm">
              <a href="mailto:info@bgm-summerschool.com" className="text-bmg-blue hover:underline">
                info@bgm-summerschool.com
              </a>
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-4">📱</div>
            <h3 className="font-bold text-bmg-blue mb-2">Phone</h3>
            <p className="text-gray-700 text-sm">
              <a href="tel:+441234567890" className="text-bmg-blue hover:underline">
                +44 1234 567 890
              </a>
              <br />
              (UK) / Assam team available
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-4">📍</div>
            <h3 className="font-bold text-bmg-blue mb-2">Location</h3>
            <p className="text-gray-700 text-sm">
              Royal Global University<br />
              Assam, India
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold text-bmg-blue mb-6">Inquiry Enquiries</h3>
            {submitted ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <p className="font-bold">Thank you!</p>
                <p className="text-sm">We'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={contactForm.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={contactForm.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Subject</label>
                  <select
                    name="subject"
                    value={contactForm.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  >
                    <option value="">Select subject</option>
                    <option value="application">Application Question</option>
                    <option value="sponsorship">Sponsorship Inquiry</option>
                    <option value="logistics">Logistics Question</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                  <textarea
                    name="message"
                    value={contactForm.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  />
                </div>
                <button type="submit" className="w-full btn-primary">
                  Send Message
                </button>
              </form>
            )}
          </div>

          <div className="bg-bmg-cream p-8 rounded-lg">
            <h3 className="text-xl font-bold text-bmg-blue mb-6">Quick Info</h3>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <p className="font-bold text-bmg-blue">Application Queries</p>
                <p>Reach out for questions about the application process, requirements, or timelines.</p>
              </div>
              <div>
                <p className="font-bold text-bmg-blue">Sponsorship Opportunities</p>
                <p>Contact us for corporate sponsorships, partnerships, and fundraising collaborations.</p>
              </div>
              <div>
                <p className="font-bold text-bmg-blue">Logistics & Travel</p>
                <p>Questions about accommodation, transportation, visas? We're here to help.</p>
              </div>
              <div>
                <p className="font-bold text-bmg-blue">Media & Press</p>
                <p>Interested in covering the initiative? Contact our communications team.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-bmg-navy text-white p-8 rounded-lg text-center">
          <h3 className="text-xl font-bold mb-4">Stay Connected</h3>
          <p className="mb-6">Subscribe to updates and announcements about the summer school</p>
          <form className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 px-4 py-2 rounded text-gray-900"
            />
            <button type="submit" className="bg-bmg-gold text-white px-6 py-2 rounded font-bold hover:bg-yellow-600">
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
