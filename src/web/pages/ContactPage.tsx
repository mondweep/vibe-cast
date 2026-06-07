import React from 'react';
import { Linkedin, Github, Heart, BookOpen } from 'lucide-react';

const LINKEDIN_URL = 'https://www.linkedin.com/in/mondweepchakravorty/';
const PAYPAL_URL = 'https://www.paypal.com/paypalme/mondweep';
const REPO_URL = 'https://github.com/mondweep/vibe-cast';

export function ContactPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Contact</h1>
      <p className="text-gray-500 text-sm mb-8">We'd love to hear from you.</p>

      <p className="text-gray-700 text-sm leading-relaxed mb-8">
        <strong>learn-ruflo</strong> is built and curated by <strong>Mondweep Chakravorty</strong> as
        a free, build-in-public project. For questions, data-export or deletion requests, bug reports,
        feedback, or collaboration, the best ways to reach out are below.
      </p>

      <div className="space-y-4">
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/40 transition"
        >
          <Linkedin className="text-primary-600 flex-shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-semibold text-gray-900">LinkedIn — Mondweep Chakravorty</p>
            <p className="text-gray-600 text-sm">
              The fastest way to reach me — questions, feedback, data requests, or collaboration.
            </p>
          </div>
        </a>

        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:bg-primary-50/40 transition"
        >
          <Github className="text-gray-800 flex-shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-semibold text-gray-900">GitHub — open an issue or pull request</p>
            <p className="text-gray-600 text-sm">
              Bug reports, content corrections, and contributions welcome (branch{' '}
              <code>ruflo-demonstration</code>).
            </p>
          </div>
        </a>

        <a
          href={PAYPAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-4 p-4 border border-pink-200 rounded-xl hover:border-pink-300 hover:bg-pink-50/50 transition"
        >
          <Heart className="text-pink-500 flex-shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-semibold text-gray-900">Support the work — PayPal</p>
            <p className="text-gray-600 text-sm">
              The platform is free and ad-free. Contributions cover hosting and the time spent
              building and verifying course content.
            </p>
          </div>
        </a>
      </div>

      <div className="mt-8 flex items-start gap-3 text-sm text-gray-600">
        <BookOpen className="text-gray-400 flex-shrink-0 mt-0.5" size={18} />
        <p>
          Contributions especially welcome: new or improved lessons, knowledge-graph accuracy fixes,
          accessibility improvements, and the planned Skill Lab, Community, and Metrics features.
        </p>
      </div>
    </div>
  );
}

export default ContactPage;
