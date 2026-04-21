export default function Programme() {
  return (
    <section id="programme" className="py-20 bg-white">
      <div className="container">
        <h2 className="text-center mb-12">Programme Overview</h2>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            <h3 className="text-xl mb-6">Programme Features</h3>
            <ul className="space-y-4 text-gray-700">
              <li className="flex gap-3">
                <span className="text-bmg-gold font-bold">✓</span>
                <span><strong>Individual Instrumental Lessons</strong> - Tailored to your level and goals</span>
              </li>
              <li className="flex gap-3">
                <span className="text-bmg-gold font-bold">✓</span>
                <span><strong>Ensemble & Chamber Music</strong> - Learn collaboration and artistry</span>
              </li>
              <li className="flex gap-3">
                <span className="text-bmg-gold font-bold">✓</span>
                <span><strong>Daily Rehearsals & Workshops</strong> - Intensive, structured learning</span>
              </li>
              <li className="flex gap-3">
                <span className="text-bmg-gold font-bold">✓</span>
                <span><strong>Performance Prep & Interpretation</strong> - Develop confidence and presence</span>
              </li>
              <li className="flex gap-3">
                <span className="text-bmg-gold font-bold">✓</span>
                <span><strong>Professional Mentoring</strong> - Guidance from world-class musicians</span>
              </li>
              <li className="flex gap-3">
                <span className="text-bmg-gold font-bold">✓</span>
                <span><strong>Graduation Concert</strong> - Perform on a prestigious stage</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl mb-6">Who Can Apply?</h3>
            <p className="text-gray-700 mb-6">
              We welcome motivated young musicians aged 12-20 studying:
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-bmg-cream p-4 rounded">Violin</div>
              <div className="bg-bmg-cream p-4 rounded">Viola</div>
              <div className="bg-bmg-cream p-4 rounded">Cello</div>
              <div className="bg-bmg-cream p-4 rounded">Double Bass</div>
              <div className="bg-bmg-cream p-4 rounded">Piano</div>
              <div className="bg-bmg-cream p-4 rounded">Voice</div>
            </div>
            <p className="text-gray-600 text-sm">
              Applicants should normally have achieved Grade 4 or above (or equivalent proficiency). Advanced musicians and young professionals are also welcome and may benefit from professional development sessions and teaching observation opportunities.
            </p>
          </div>
        </div>

        <div className="bg-bmg-cream p-8 rounded-lg">
          <h3 className="text-xl mb-6">All-Inclusive Experience</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="font-bold text-bmg-blue mb-2">Accommodation</p>
              <p className="text-gray-700">Comfortable residential campus with twin/shared rooms, designed for a supportive learning environment</p>
            </div>
            <div>
              <p className="font-bold text-bmg-blue mb-2">Meals</p>
              <p className="text-gray-700">Nutritious meals included - Western, traditional Indian, and vegetarian options available</p>
            </div>
            <div>
              <p className="font-bold text-bmg-blue mb-2">Activities</p>
              <p className="text-gray-700">Beyond lessons: swimming, nature hikes, cultural exchanges, and team-building experiences</p>
            </div>
            <div>
              <p className="font-bold text-bmg-blue mb-2">Support</p>
              <p className="text-gray-700">Structured daily schedule, dedicated staff support, and a welcoming artistic community</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
