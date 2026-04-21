export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-bmg-navy to-bmg-blue text-white py-20 md:py-32">
      <div className="container text-center">
        <h1 className="text-4xl md:text-5xl font-serif mb-6">
          Bernardi Music Group
        </h1>
        <h2 className="text-2xl md:text-3xl font-light mb-8 text-bmg-cream">
          Summer School, Assam
        </h2>
        <p className="text-lg md:text-xl mb-8 text-gray-200 max-w-2xl mx-auto">
          Inspired by Zubeen Garg • World-Class Training • International Faculty
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <a href="https://bernardimusicgroup.com/student-application/" target="_blank" rel="noopener noreferrer" className="btn-primary">
            Apply Now
          </a>
          <a href="#vision" className="btn-secondary">
            Learn More
          </a>
        </div>
        <div className="mt-12 text-sm text-bmg-cream">
          <p className="mb-2">End of September - Early October 2026</p>
          <p>Royal Global University, Assam, India</p>
        </div>
      </div>

      {/* Placeholder for hero image */}
      <div className="container mt-12 bg-gray-700 rounded-lg h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">
            [Hero Image - Musicians Performing]
          </p>
        </div>
      </div>
    </section>
  )
}
