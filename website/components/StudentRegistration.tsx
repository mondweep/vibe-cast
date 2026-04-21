'use client'

import { useState } from 'react'

export default function StudentRegistration() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
    country: '',
    instrument: '',
    gradeLevel: '',
    experience: '',
    motivation: '',
    parentEmail: '',
    parentName: '',
  })

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // In production, this would send to Supabase
      console.log('Form submitted:', formData)

      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSubmitted(true)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        age: '',
        country: '',
        instrument: '',
        gradeLevel: '',
        experience: '',
        motivation: '',
        parentEmail: '',
        parentName: '',
      })

      setTimeout(() => setSubmitted(false), 5000)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="apply" className="py-20 bg-bmg-cream">
      <div className="container max-w-2xl">
        <h2 className="text-center mb-4">Apply to the Summer School</h2>
        <p className="text-center text-gray-700 mb-12">
          Places are limited to maintain the highest teaching standards. Submit your application to express your interest.
        </p>

        {submitted ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg text-center">
            <p className="font-bold">Thank you for your application!</p>
            <p className="text-sm mt-2">We will review your submission and contact you shortly with next steps.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  placeholder="Your first name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  placeholder="Your last name"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  placeholder="+44 or +91..."
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Age *</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  required
                  min="12"
                  max="20"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  placeholder="12-20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Country *</label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  placeholder="Your country"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Instrument *</label>
                <select
                  name="instrument"
                  value={formData.instrument}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                >
                  <option value="">Select an instrument</option>
                  <option value="violin">Violin</option>
                  <option value="viola">Viola</option>
                  <option value="cello">Cello</option>
                  <option value="double-bass">Double Bass</option>
                  <option value="piano">Piano</option>
                  <option value="voice">Voice</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Grade Level *</label>
                <select
                  name="gradeLevel"
                  value={formData.gradeLevel}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                >
                  <option value="">Select your level</option>
                  <option value="grade-4">Grade 4 (Beginner)</option>
                  <option value="grade-5-6">Grade 5-6 (Intermediate)</option>
                  <option value="grade-7-8">Grade 7-8 (Advanced)</option>
                  <option value="diploma">Diploma Level</option>
                  <option value="professional">Professional/Young Musician</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Years of Experience *</label>
              <input
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                placeholder="Number of years playing this instrument"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">What motivates you to apply? *</label>
              <textarea
                name="motivation"
                value={formData.motivation}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                placeholder="Tell us about your musical journey and why you want to participate..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6 pt-6 border-t">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Parent/Guardian Name (if under 18) *</label>
                <input
                  type="text"
                  name="parentName"
                  value={formData.parentName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  placeholder="Parent/Guardian name"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Parent/Guardian Email (if under 18) *</label>
                <input
                  type="email"
                  name="parentEmail"
                  value={formData.parentEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-bmg-blue"
                  placeholder="Parent/Guardian email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-lg disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Application deadline: July 31, 2026. Selected candidates will be invited for interviews in August.
            </p>
          </form>
        )}

        <div className="mt-12 grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="font-bold text-bmg-blue mb-4">Application Timeline</h3>
            <ul className="text-sm space-y-2 text-gray-700">
              <li><strong>Now:</strong> Submit applications</li>
              <li><strong>July 31:</strong> Application deadline</li>
              <li><strong>August:</strong> Interviews conducted</li>
              <li><strong>August 15:</strong> Final decisions announced</li>
              <li><strong>Late Sept/Early Oct:</strong> Summer School</li>
            </ul>
          </div>
          <div className="bg-white p-6 rounded-lg">
            <h3 className="font-bold text-bmg-blue mb-4">Student Fees</h3>
            <p className="text-sm text-gray-700 mb-4">
              Tiered fee structure based on level (starting from ₹10,000 / approx £100-150). Scholarships available for talented students from underprivileged backgrounds.
            </p>
            <p className="text-xs text-gray-600">
              All-inclusive: accommodation, meals, instruction, performance opportunity
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
