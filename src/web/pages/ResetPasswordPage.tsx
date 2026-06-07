import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader, Lock } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { supabase } from '@/auth/AuthContext';

/**
 * Password recovery landing page (PRD auth flow).
 *
 * Supabase's reset email links here with a `#access_token=…&type=recovery`
 * fragment. supabase-js parses that fragment on load and establishes a
 * temporary session + fires a PASSWORD_RECOVERY event, after which
 * `updateUser({ password })` applies to the recovering user. We render a
 * "set a new password" form and surface any error the link carries (e.g.
 * an expired/invalid token arrives as `#error=…&error_description=…`).
 */
export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Surface an error carried in the URL hash (expired/invalid recovery link).
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const errDesc = params.get('error_description') || params.get('error');
    if (errDesc) {
      setLinkError(errDesc.replace(/\+/g, ' '));
    }

    // Confirm a recovery session exists (supabase-js processes the hash async
    // on load). If none and no token in the URL, the link is invalid/expired.
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session && !params.get('access_token')) {
        setLinkError(
          (prev) =>
            prev ||
            'This reset link is invalid or has expired. Request a new one from the sign-in page.',
        );
      }
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setSubmitting(true);
      await updatePassword(password);
      setDone(true);
      // Clear the recovery hash, then continue into the app after a beat.
      window.history.replaceState(null, '', window.location.pathname);
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a new password</h1>
      <p className="text-gray-600 mb-6">Choose a new password for your account.</p>

      {linkError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-red-800 text-sm">
            {linkError}
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="block mt-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              Back to sign in
            </button>
          </div>
        </div>
      )}

      {done ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-green-800 text-sm">
            Password updated. Signing you in…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting || !!linkError}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm new password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={submitting || !!linkError}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !ready || !!linkError}
            className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {submitting && <Loader className="animate-spin" size={18} />}
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </div>
  );
}

export default ResetPasswordPage;
