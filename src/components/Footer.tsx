import { Github, Linkedin, Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-black/50 backdrop-blur-md border-t border-white/10 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Credits */}
          <div className="text-center md:text-left">
            <p className="text-gray-300 text-sm mb-2">
              Based on the{' '}
              <a
                href="https://www.linkedin.com/pulse/standing-under-machine-what-simple-task-revealed-how-rodrigo-1cmee/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors underline"
              >
                article
              </a>{' '}
              by{' '}
              <span className="font-semibold text-white">
                Rodrigo Mazorra Blanco, PhD, CQF, MBA
              </span>{' '}
              and{' '}
              <span className="font-semibold text-white">
                Raghavendra Datta PALLETI
              </span>
            </p>
            <p className="text-gray-400 text-xs flex items-center justify-center md:justify-start gap-1">
              Built with <Sparkles className="w-3 h-3 text-blue-400" /> by{' '}
              <a
                href="https://www.linkedin.com/in/mondweepchakravorty/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                Mondweep Chakravorty
              </a>
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/in/mondweepchakravorty/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
            >
              <Linkedin className="w-4 h-4" />
              <span>Connect</span>
            </a>
            <a
              href="https://github.com/mondweep/vibe-cast/tree/claude/ai-architecture-analysis-01TJ3tNZF6g4Wpu3Ux8NpUCe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm font-medium"
            >
              <Github className="w-4 h-4" />
              <span>View Code</span>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Vibe Cast. An interactive exploration of AI architecture.
          </p>
        </div>
      </div>
    </footer>
  )
}
