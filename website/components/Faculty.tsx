export default function Faculty() {
  const faculty = [
    {
      name: 'Andrew Bernardi',
      role: 'Director, Violin & Viola',
      bio: 'Leading UK violinist, festival director, and music entrepreneur. Founded the Bernardi Music Group in 1991. Former Trinity Laban tutor, recognized for using music as a force for social impact.',
      image: '[Faculty Photo 1]'
    },
    {
      name: 'Maria Marchant',
      role: 'Piano',
      bio: 'Multi award-winning London-based pianist and conductor. BBC Radio 3 broadcaster, featured on TV programmes. Pianist-in-Residence at Shipley Arts Festival. Expert music educator and conductor.',
      image: '[Faculty Photo 2]'
    },
    {
      name: 'Jonathan Few',
      role: 'Cello',
      bio: 'Successful freelance cellist touring internationally with major orchestras. Chamber musician with Piano Trio Triptych. Regular performer at Shipley Arts Festival. Rigorous yet supportive pedagogue.',
      image: '[Faculty Photo 3]'
    },
    {
      name: 'Anando Mukerjee',
      role: 'Tenor & Vocals',
      bio: 'India\'s finest tenor (The Statesman). Internationally recognized operatic voice. Trained in England, mentored by legendary tenor Nicolai Gedda. Operatic debuts at leading venues across UK and Europe.',
      image: '[Faculty Photo 4]'
    }
  ]

  return (
    <section id="faculty" className="py-20 bg-bmg-cream">
      <div className="container">
        <h2 className="text-center mb-12">Meet the Faculty</h2>
        <p className="text-center text-gray-700 max-w-2xl mx-auto mb-12">
          Experience world-class tuition from internationally respected musicians who have performed on major world stages and are committed to nurturing the next generation of talent.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {faculty.map((member, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gray-300 h-64 flex items-center justify-center text-gray-500">
                {member.image}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-bmg-blue mb-1">{member.name}</h3>
                <p className="text-bmg-gold font-semibold text-sm mb-4">{member.role}</p>
                <p className="text-gray-700 text-sm">{member.bio}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white p-8 rounded-lg text-center">
          <p className="text-gray-700 text-lg">
            <strong>Additional Guest Workshops</strong> from visiting international musicians and specialists in ethnomusicology will be announced as we approach the programme dates.
          </p>
        </div>
      </div>
    </section>
  )
}
