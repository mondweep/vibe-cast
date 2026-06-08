import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, Lightbulb, AlertTriangle, Send, CheckCircle, Loader, LucideIcon } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { feedbackApi, FeedbackCategory } from '@/api/feedback';

interface CategoryMeta {
  id: FeedbackCategory;
  label: string;
  icon: LucideIcon;
  blurb: string;
  placeholder: string;
}

// The three categories most relevant to learn-ruflo. "Report a content error"
// ties to the accuracy-first principle — anyone can flag a command, lesson,
// tutor answer, or knowledge-graph node that looks wrong.
const CATEGORIES: CategoryMeta[] = [
  {
    id: 'comment',
    label: 'Comment',
    icon: MessageSquare,
    blurb: "Anything you want to say about the platform — what worked, what didn't, a lesson that finally made it click.",
    placeholder: "Tell us what's on your mind…",
  },
  {
    id: 'suggestion',
    label: 'Feature suggestion',
    icon: Lightbulb,
    blurb: 'An idea for a feature, a lesson, or a topic you wish learn-ruflo covered.',
    placeholder: "I'd love it if learn-ruflo could…",
  },
  {
    id: 'content_error',
    label: 'Report a content error',
    icon: AlertTriangle,
    blurb: 'Spotted a command, lesson, tutor answer, or knowledge-graph node that looks wrong? Accuracy matters to us — tell us where and what.',
    placeholder: 'Which lesson / command / node, and what looks off…',
  },
];

export function FeedbackForm() {
  const { user } = useAuth();
  const location = useLocation();

  const [category, setCategory] = useState<FeedbackCategory>('comment');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [allowPublic, setAllowPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = CATEGORIES.find((c) => c.id === category)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await feedbackApi.submit({
        category,
        subject: subject.trim() || undefined,
        message: message.trim(),
        name: name.trim() || undefined,
        // Signed-in users submit under their account email; otherwise the typed one.
        email: user?.email || email.trim() || undefined,
        pageContext: location.pathname,
        allowPublic,
      });
      setDone(true);
    } catch {
      setError('Sorry — we couldn\'t send that just now. Please try again, or reach out via the links below.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
        <h2 className="text-xl font-semibold text-gray-900">Thank you — feedback received</h2>
        <p className="text-gray-600 text-sm mt-2 max-w-md mx-auto">
          Every comment, suggestion, and content-error report is read. If you left an email, you may
          hear back. This is build-in-public — your input shapes what ships next.
        </p>
        <button
          onClick={() => {
            setDone(false);
            setSubject('');
            setMessage('');
            setName('');
            setEmail('');
            setAllowPublic(false);
          }}
          className="mt-5 px-4 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Send more feedback
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Feedback &amp; contact</h1>
      <p className="text-gray-500 text-sm mb-6">
        Comments, suggestions, and content-error reports all land in the same inbox. Mondweep reads
        every one and replies when an email is provided.
      </p>

      {/* Category tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const on = c.id === category;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${
                on
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
              aria-pressed={on}
            >
              <Icon size={16} className={on ? 'text-primary-600' : 'text-gray-400'} />
              {c.label}
            </button>
          );
        })}
      </div>

      <p className="text-gray-500 text-sm mb-6">{active.blurb}</p>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Subject <span className="font-normal text-gray-400 normal-case">(optional)</span>
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="A one-line summary"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Your message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            maxLength={5000}
            rows={6}
            placeholder={active.placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Name <span className="font-normal text-gray-400 normal-case">(optional)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Your name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Email{' '}
              <span className="font-normal text-gray-400 normal-case">
                {user ? '' : '(optional — for a reply)'}
              </span>
            </label>
            {user ? (
              <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500">
                {user.email}
                <span className="block text-xs text-gray-400 mt-0.5">Signed in as {user.email}</span>
              </div>
            ) : (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            )}
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={allowPublic}
            onChange={(e) => setAllowPublic(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            Allow this to appear publicly on a learn-ruflo feedback wall once reviewed. Your name (if
            provided) may be shown; your email never will.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy || !message.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {busy ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
          {busy ? 'Sending…' : 'Send feedback'}
        </button>
      </form>
    </div>
  );
}

export default FeedbackForm;
