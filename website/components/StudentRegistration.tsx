export default function StudentRegistration() {
  return (
    <section id="apply" className="py-20 bg-bmg-cream">
      <div className="container max-w-2xl">
        <h2 className="text-center mb-4">Apply to the Summer School</h2>
        <p className="text-center text-gray-700 mb-12">
          Places are limited to maintain the highest teaching standards. Submit your application to express your interest.
        </p>

        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <p className="text-lg text-gray-700 mb-6">
            Ready to join this transformational musical journey? Apply now through the Bernardi Music Group application portal.
          </p>

          <a
            href="https://bernardimusicgroup.com/student-application/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block btn-primary text-lg mb-6"
          >
            → Open Application Form
          </a>

          <p className="text-gray-600 mb-8">
            The application form will collect all necessary information about your musical background, experience, and motivation.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-bmg-cream p-6 rounded-lg">
              <h3 className="font-bold text-bmg-blue mb-4">Application Timeline</h3>
              <ul className="text-sm space-y-2 text-gray-700 text-left">
                <li><strong>Now:</strong> Submit applications</li>
                <li><strong>July 31:</strong> Application deadline</li>
                <li><strong>August:</strong> Interviews conducted</li>
                <li><strong>August 15:</strong> Final decisions announced</li>
                <li><strong>Late Sept/Early Oct:</strong> Summer School</li>
              </ul>
            </div>

            <div className="bg-bmg-cream p-6 rounded-lg">
              <h3 className="font-bold text-bmg-blue mb-4">What We Ask</h3>
              <ul className="text-sm space-y-2 text-gray-700 text-left">
                <li>✓ Personal & contact information</li>
                <li>✓ Musical background & experience</li>
                <li>✓ Instrument & grade level</li>
                <li>✓ Your musical motivation</li>
                <li>✓ Parent/guardian info (if under 18)</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t">
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
