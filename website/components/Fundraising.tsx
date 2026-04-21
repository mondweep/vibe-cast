'use client'

import { useState } from 'react'

export default function Fundraising() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null)

  const tiers = [
    {
      id: 'platinum',
      name: 'Platinum',
      amount: '£5,000',
      benefits: [
        'Naming recognition on website & materials',
        'Logo display in event programme',
        'Dedicated page with sponsor story',
        'VIP invitation to graduation concert',
        '4 student scholarships fully funded',
        'Annual newsletter feature'
      ]
    },
    {
      id: 'gold',
      name: 'Gold',
      amount: '£2,000',
      benefits: [
        'Recognition on website',
        'Logo in graduation concert programme',
        'Invitation to graduation concert',
        '2 student scholarships',
        'Quarterly updates'
      ]
    },
    {
      id: 'silver',
      name: 'Silver',
      amount: '£1,000',
      benefits: [
        'Recognition on website',
        'Logo in concert programme',
        '1 student scholarship',
        'Event updates'
      ]
    },
    {
      id: 'supporter',
      name: 'Supporter',
      amount: '£500+',
      benefits: [
        'Name listed on website',
        'Impact report',
        'Thank you from the team'
      ]
    },
    {
      id: 'friend',
      name: 'Friend',
      amount: '£50+',
      benefits: [
        'Contribution to the programme',
        'Thank you message',
        'Progress updates'
      ]
    },
    {
      id: 'contributor',
      name: 'Contributor',
      amount: '£25+',
      benefits: [
        'Help make world-class music education possible in India'
      ]
    }
  ]

  const handleDonate = (tier: string) => {
    setSelectedTier(tier)
    // This would integrate with Stripe or another payment gateway
    alert(`Redirecting to donation for ${tier} tier...`)
  }

  return (
    <section id="fundraising" className="py-20 bg-white">
      <div className="container">
        <h2 className="text-center mb-4">Support This Initiative</h2>
        <p className="text-center text-gray-700 max-w-2xl mx-auto mb-12">
          We are raising £15,000 to bring world-class music education to India. Your support directly funds scholarships for talented but underprivileged students, covers international faculty travel, and ensures the highest standards of instruction and accommodation.
        </p>

        <div className="bg-bmg-navy text-white p-6 rounded-lg mb-12 text-center">
          <p className="text-lg mb-2">Funding Target: <span className="font-bold">£15,000</span></p>
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div className="bg-bmg-gold h-full" style={{ width: '0%' }}></div>
          </div>
          <p className="text-sm text-gray-300 mt-2">Help us reach our goal!</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-bmg-cream p-6 rounded-lg text-center">
            <p className="text-2xl font-bold text-bmg-blue mb-2">100%</p>
            <p className="text-sm text-gray-700">Funds go directly to the programme</p>
          </div>
          <div className="bg-bmg-cream p-6 rounded-lg text-center">
            <p className="text-2xl font-bold text-bmg-blue mb-2">Charity Status</p>
            <p className="text-sm text-gray-700">Transparent, mission-driven initiative</p>
          </div>
          <div className="bg-bmg-cream p-6 rounded-lg text-center">
            <p className="text-2xl font-bold text-bmg-blue mb-2">Impact</p>
            <p className="text-sm text-gray-700">Direct scholarships for underprivileged talent</p>
          </div>
        </div>

        <h3 className="text-center text-xl mb-8">Sponsorship Tiers</h3>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`border-2 rounded-lg p-6 transition cursor-pointer ${
                selectedTier === tier.id
                  ? 'border-bmg-blue bg-blue-50'
                  : 'border-gray-300 hover:border-bmg-blue'
              }`}
              onClick={() => setSelectedTier(tier.id)}
            >
              <h3 className="text-xl font-bold text-bmg-blue mb-2">{tier.name}</h3>
              <p className="text-2xl font-bold text-bmg-gold mb-6">{tier.amount}</p>
              <ul className="space-y-2 text-sm text-gray-700 mb-6">
                {tier.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-bmg-gold">•</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleDonate(tier.id)}
                className="w-full btn-primary text-sm"
              >
                Donate {tier.amount}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-bmg-cream p-8 rounded-lg">
          <h3 className="text-xl mb-4">Multiple Ways to Support</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="font-bold text-bmg-blue mb-2">💳 Corporate Sponsorship</p>
              <p className="text-sm text-gray-700">Large-scale partnership opportunities for businesses and foundations</p>
            </div>
            <div>
              <p className="font-bold text-bmg-blue mb-2">🎁 Individual Donations</p>
              <p className="text-sm text-gray-700">Support from music lovers and philanthropists worldwide</p>
            </div>
            <div>
              <p className="font-bold text-bmg-blue mb-2">📜 Endowments</p>
              <p className="text-sm text-gray-700">Create lasting impact with planned giving or endowed scholarships</p>
            </div>
          </div>
          <p className="text-center text-gray-700 mt-6 text-sm">
            <strong>Contact us</strong> for sponsorship enquiries, bulk donations, or to discuss custom partnership opportunities.
          </p>
        </div>
      </div>
    </section>
  )
}
