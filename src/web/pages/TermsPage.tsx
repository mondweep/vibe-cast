import React from 'react';

const LINKEDIN_URL = 'https://www.linkedin.com/in/mondweepchakravorty/';
const PAYPAL_URL = 'https://www.paypal.com/paypalme/mondweep';
const RUFLO_URL = 'https://github.com/ruvnet/ruflo';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-700 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export function TermsPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Terms of Service</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: 7 June 2026</p>

      <p className="text-gray-700 text-sm leading-relaxed mb-8">
        These terms cover your use of <strong>learn-ruflo</strong>, a free educational platform for
        learning Ruflo agent orchestration. By creating an account or using the platform, you agree
        to them. If you don't agree, please don't use the service.
      </p>

      <Section title="1. What the service is">
        <p>
          learn-ruflo provides learning paths, lessons, progress tracking, and an AI tutor to help
          you learn <strong>Ruflo</strong>, an open-source agentic-AI orchestration project. It is a
          free, build-in-public educational project. Course content is for learning purposes and is
          provided on an "as is" basis.
        </p>
      </Section>

      <Section title="2. Not affiliated with Ruflo">
        <p>
          learn-ruflo is an independent educational project. It is <strong>not affiliated with,
          sponsored by, or endorsed by</strong> the authors of Ruflo (ruvnet) or any related project.
          "Ruflo" and any related names belong to their respective owners. The official Ruflo source
          lives at{' '}
          <a className="text-primary-600 hover:text-primary-700 font-medium" href={RUFLO_URL} target="_blank" rel="noopener noreferrer">github.com/ruvnet/ruflo</a>.
          We make every effort to keep lesson content accurate to the real Ruflo source, but always
          verify commands and APIs against the official project before relying on them.
        </p>
      </Section>

      <Section title="3. Your account">
        <p>
          You're responsible for keeping your login credentials secure and for activity under your
          account. Provide a valid email so you can recover access. Don't impersonate others or share
          your account in ways that abuse the service.
        </p>
      </Section>

      <Section title="4. Bring-your-own AI key">
        <p>
          The AI tutor can use your own language-model provider key (Anthropic, OpenAI, Requesty, or
          Google Gemini). If you supply a key, <strong>you are responsible for it and for any usage
          charges</strong> your provider bills you. The key stays in your browser and is used only to
          answer your questions; see the Privacy Policy. Never share keys you are not authorised to
          use.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <ul className="list-disc pl-5 space-y-2">
          <li>Don't attempt to break, probe, or bypass authentication, rate limits, or access controls.</li>
          <li>Don't scrape, overload, or disrupt the service or its infrastructure.</li>
          <li>Don't use the platform for unlawful purposes or to submit malicious content.</li>
          <li>Respect the open-source licences of any code referenced in the lessons.</li>
        </ul>
      </Section>

      <Section title="6. No warranty & limitation of liability">
        <p>
          The platform and its content are provided "as is", without warranties of any kind, express
          or implied. Educational content may contain errors or become out of date. To the maximum
          extent permitted by law, the project owner is not liable for any loss or damage arising from
          your use of the platform, the tutor's output, or any third-party provider you connect.
        </p>
      </Section>

      <Section title="7. Contributions & donations">
        <p>
          Voluntary donations (e.g. via{' '}
          <a className="text-pink-600 hover:text-pink-700 font-medium" href={PAYPAL_URL} target="_blank" rel="noopener noreferrer">PayPal</a>)
          are non-refundable and grant no special access, ownership, or entitlement — they simply
          support the work. Code and content contributions are welcome via the public repository under
          its licence.
        </p>
      </Section>

      <Section title="8. Intellectual property">
        <p>
          Platform code is open source under the repository's MIT licence. Original course content is
          © Mondweep Chakravorty. Third-party names, marks, and source code referenced for teaching
          (including Ruflo) remain the property of their respective owners.
        </p>
      </Section>

      <Section title="9. Changes & termination">
        <p>
          We may update these terms or the service over time; material changes will be reflected by
          the "last updated" date above. We may suspend access that abuses the service. You can stop
          using the platform and request account deletion at any time (see{' '}
          <a className="text-primary-600 hover:text-primary-700 font-medium" href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">Contact</a>).
        </p>
      </Section>
    </div>
  );
}

export default TermsPage;
