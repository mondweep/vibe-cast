import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Send, CheckCircle2, AlertCircle, MessageSquare, Lightbulb, Star } from 'lucide-react';
import { submitFeedback, type FeedbackKind } from '../contexts/library/services/feedbackClient';
import { useAuth } from '../contexts/auth/hooks/useAuth';

interface KindMeta {
  value: FeedbackKind;
  label: string;
  Icon: typeof MessageSquare;
  blurb: string;
}

const KIND_META: KindMeta[] = [
  {
    value: 'comment',
    label: 'Comment',
    Icon: MessageSquare,
    blurb: 'Anything you want to say about the library — what worked, what didn\'t, a song that moved you.',
  },
  {
    value: 'suggestion',
    label: 'Product suggestion',
    Icon: Lightbulb,
    blurb: 'A feature you\'d like to see, a fix that would help your learning, a song or genre we should add.',
  },
  {
    value: 'curator_application',
    label: 'Become a curator',
    Icon: Star,
    blurb: 'Apply to help expand the verified library. Please read what curation involves first.',
  },
];

export function FeedbackPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Allow pre-selecting kind via ?kind=curator_application (linked from /curate)
  const initialKindParam = searchParams.get('kind') as FeedbackKind | null;
  const initialKind: FeedbackKind =
    initialKindParam && KIND_META.some((k) => k.value === initialKindParam)
      ? initialKindParam
      : 'comment';

  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Curator-application specific
  const [sanskritBackground, setSanskritBackground] = useState('');
  const [traditions, setTraditions] = useState('');
  const [weeklyHours, setWeeklyHours] = useState<string>('');
  const [motivation, setMotivation] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    kind: 'ok' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Sync the kind state with the URL param when it changes (e.g. user navigates
  // back to /feedback?kind=curator_application from /curate).
  useEffect(() => {
    if (initialKindParam && KIND_META.some((k) => k.value === initialKindParam)) {
      setKind(initialKindParam);
    }
  }, [initialKindParam]);

  const isCuratorApp = kind === 'curator_application';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bodyText.trim() || submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await submitFeedback({
        kind,
        subject: subject.trim() || undefined,
        body: bodyText.trim(),
        applicant_name: displayName.trim() || undefined,
        email: email.trim() || user?.email || undefined,
        display_name: displayName.trim() || undefined,
        sanskrit_background: isCuratorApp ? sanskritBackground.trim() || undefined : undefined,
        traditions_familiar: isCuratorApp ? traditions.trim() || undefined : undefined,
        weekly_hours: isCuratorApp && weeklyHours ? Number(weeklyHours) : undefined,
        motivation: isCuratorApp ? motivation.trim() || undefined : undefined,
        // Curator applications are never public regardless of the toggle
        is_public: !isCuratorApp && isPublic,
      });

      if (res.status === 'created') {
        setResult({
          kind: 'ok',
          message: isCuratorApp
            ? "Thanks — your application has been received. We'll reach out via email shortly."
            : "Thanks — your feedback has been received. The curator reads every one.",
        });
        // Reset the body but keep contact details so a second submission is easier
        setSubject('');
        setBodyText('');
        setMotivation('');
        if (!isCuratorApp) setIsPublic(false);
      } else if (res.status === 'rate-limited') {
        setResult({
          kind: 'info',
          message:
            res.message ||
            "You've reached the daily submission limit. Sign in to submit more, or try again tomorrow.",
        });
      } else {
        setResult({
          kind: 'error',
          message: res.message || 'Could not submit. Please check the fields and try again.',
        });
      }
    } catch (err) {
      setResult({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Submission failed.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-1 py-6 space-y-6 text-gray-200">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-amber-400">Feedback &amp; contact</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          Comments, suggestions, and curator applications all land in the same inbox.
          The curator reads every one and replies when an email is provided.
        </p>
      </header>

      {/* Kind selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {KIND_META.map((k) => {
          const Icon = k.Icon;
          const isSelected = k.value === kind;
          return (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                  : 'border-gray-800 bg-gray-900/40 text-gray-400 hover:border-gray-700 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} />
                <span className="text-sm font-medium">{k.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        {KIND_META.find((k) => k.value === kind)!.blurb}
      </p>

      {isCuratorApp && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200/80">
          Before applying, please read{' '}
          <Link to="/curate" className="text-amber-300 underline hover:text-amber-200">
            what curation involves
          </Link>{' '}
          — time commitment, quality standards, the trial process.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject (always optional) */}
        <Field
          label="Subject"
          optional
          value={subject}
          onChange={setSubject}
          placeholder={
            isCuratorApp ? 'e.g. "Application — fluent reader, 2hr/week"' : 'A one-line summary'
          }
        />

        {/* Body */}
        <Field
          label={isCuratorApp ? 'In your own words: why apply?' : 'Your message'}
          required
          textarea
          rows={isCuratorApp ? 3 : 6}
          maxLength={4000}
          value={bodyText}
          onChange={setBodyText}
          placeholder={
            isCuratorApp
              ? 'A few sentences about your interest in the library and what kinds of songs you\'d want to help curate.'
              : 'Tell us what\'s on your mind…'
          }
        />

        {/* Contact — required for curator applications, optional for others */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Name"
            value={displayName}
            onChange={setDisplayName}
            required={isCuratorApp}
            optional={!isCuratorApp}
            placeholder="Your name"
            maxLength={200}
          />
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            required={isCuratorApp && !user?.email}
            optional={!isCuratorApp && !user?.email}
            placeholder={user?.email || 'you@example.com'}
            type="email"
            disabled={!!user?.email && !isCuratorApp}
            help={user?.email ? `Signed in as ${user.email}` : undefined}
          />
        </div>

        {/* Curator-application-only fields */}
        {isCuratorApp && (
          <>
            <Field
              label="Sanskrit background"
              value={sanskritBackground}
              onChange={setSanskritBackground}
              optional
              placeholder="e.g. self-taught 3 years, MA Sanskrit, fluent reader of stotras…"
              maxLength={500}
            />
            <Field
              label="Traditions you're familiar with"
              value={traditions}
              onChange={setTraditions}
              optional
              placeholder="Vedic, Vaiṣṇava bhakti, Yoga Sūtras, Upaniṣads, Pāli…"
              maxLength={500}
            />
            <Field
              label="Availability (hours per week)"
              value={weeklyHours}
              onChange={setWeeklyHours}
              optional
              placeholder="e.g. 2"
              type="number"
              maxLength={3}
            />
            <Field
              label="Motivation"
              textarea
              rows={3}
              value={motivation}
              onChange={setMotivation}
              optional
              placeholder="What draws you to this — and what would you most want to contribute?"
              maxLength={4000}
            />
          </>
        )}

        {/* Public opt-in (not for curator applications) */}
        {!isCuratorApp && (
          <label className="flex items-start gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-0.5 accent-amber-500"
            />
            <span>
              Allow this to appear publicly on the library's feedback wall once reviewed. Your
              name (if provided) will be shown; your email will not.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={!bodyText.trim() || submitting}
          className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-gray-950 hover:bg-amber-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          {submitting ? 'Submitting…' : isCuratorApp ? 'Submit application' : 'Send feedback'}
        </button>

        {result && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              result.kind === 'ok'
                ? 'border-emerald-700 bg-emerald-950/40 text-emerald-200'
                : result.kind === 'info'
                  ? 'border-amber-700 bg-amber-950/40 text-amber-200'
                  : 'border-red-800 bg-red-950/40 text-red-200'
            }`}
          >
            {result.kind === 'ok' ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        )}
      </form>
    </div>
  );
}

/** Tiny labelled form field. Used for both text and textarea inputs to keep
 *  styling consistent across the form. */
function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  type?: string;
  maxLength?: number;
  disabled?: boolean;
  help?: string;
}) {
  const baseClass =
    'w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-amber-500 focus:outline-none disabled:opacity-60';
  return (
    <div>
      <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
        {props.label}
        {props.optional && <span className="text-gray-700 normal-case ml-1">(optional)</span>}
      </label>
      {props.textarea ? (
        <textarea
          rows={props.rows ?? 3}
          required={props.required}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className={baseClass + ' resize-none'}
        />
      ) : (
        <input
          type={props.type ?? 'text'}
          required={props.required}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          disabled={props.disabled}
          autoComplete={props.type === 'email' ? 'email' : 'off'}
          className={baseClass}
        />
      )}
      {props.help && <p className="text-[10px] text-gray-600 mt-1">{props.help}</p>}
    </div>
  );
}
