export default function Footer() {
  return (
    <footer className="bg-bmg-navy text-white py-12">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="font-bold mb-4 text-bmg-gold">About</h4>
            <ul className="text-sm space-y-2 text-gray-300">
              <li><a href="#vision" className="hover:text-white">The Initiative</a></li>
              <li><a href="#faculty" className="hover:text-white">Faculty</a></li>
              <li><a href="#programme" className="hover:text-white">Programme</a></li>
              <li><a href="/">Home</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-bmg-gold">Participate</h4>
            <ul className="text-sm space-y-2 text-gray-300">
              <li><a href="#apply" className="hover:text-white">Apply as Student</a></li>
              <li><a href="#fundraising" className="hover:text-white">Sponsor</a></li>
              <li><a href="#faculty" className="hover:text-white">Join as Faculty</a></li>
              <li><a href="/" className="hover:text-white">Volunteer</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-bmg-gold">Resources</h4>
            <ul className="text-sm space-y-2 text-gray-300">
              <li><a href="/" className="hover:text-white">FAQ</a></li>
              <li><a href="/" className="hover:text-white">Travel Guide</a></li>
              <li><a href="/" className="hover:text-white">Logistics</a></li>
              <li><a href="/" className="hover:text-white">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-bmg-gold">Connect</h4>
            <ul className="text-sm space-y-2 text-gray-300">
              <li><a href="mailto:info@bgm-summerschool.com" className="hover:text-white">Email</a></li>
              <li><a href="/" className="hover:text-white">Facebook</a></li>
              <li><a href="/" className="hover:text-white">Instagram</a></li>
              <li><a href="/" className="hover:text-white">LinkedIn</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8 mt-8">
          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-400 mb-6">
            <div>
              <p className="font-bold text-white mb-2">Partners</p>
              <p>
                In partnership with Bernardi Music Group (UK), National Conservatoire of Music at Mount Carmel Schools,
                and supported by members close to Late Zubeen Garg, aligned with his artistic vision.
              </p>
            </div>
            <div>
              <p className="font-bold text-white mb-2">Location</p>
              <p>
                Royal Global University, Assam, India
              </p>
              <p className="mt-4">
                Dates: End of September - Early October 2026
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 border-t border-gray-700 pt-6">
            <p>&copy; 2026 Bernardi Music Group - Summer School, Assam. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="/" className="hover:text-gray-300">Privacy Policy</a>
              <a href="/" className="hover:text-gray-300">Terms of Service</a>
              <a href="/" className="hover:text-gray-300">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
