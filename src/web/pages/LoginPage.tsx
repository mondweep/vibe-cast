import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/constants';

type Mode = 'signin' | 'signup';

export function LoginPage() {
  const { user, isLoading, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  // Already signed in — send them to the dashboard.
  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'signin') {
        await signIn(email, password);
        navigate('/', { replace: true });
      } else {
        await signUp(email, password);
        // Supabase may require email confirmation before a session exists.
        setNotice(
          'Account created. Check your email to confirm your address, then sign in.',
        );
        setMode('signin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email) {
      setError('Enter your email above, then click "Forgot password?".');
      return;
    }
    try {
      setSubmitting(true);
      await resetPassword(email);
      setNotice('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {mode === 'signin' ? 'Sign In' : 'Create Account'}
      </h1>
      <p className="text-gray-600 mb-6">
        {mode === 'signin'
          ? 'Sign in to continue to learn-ruflo'
          : 'Sign up to start learning with learn-ruflo'}
      </p>

      {!supabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-yellow-800 text-sm">
            Supabase is not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> in your environment, then restart
            the dev server. Sign-in will fail until then.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start space-x-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {notice && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start space-x-3">
          <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-green-800 text-sm">{notice}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              id="password"
              type="password"
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>
        </div>

        {mode === 'signin' && (
          <div className="text-right">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={submitting}
              className="text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {submitting && <Loader className="animate-spin" size={18} />}
          {submitting
            ? 'Please wait...'
            : mode === 'signin'
              ? 'Sign In'
              : 'Create Account'}
        </button>
      </form>

      <p className="text-sm text-gray-600 mt-6 text-center">
        {mode === 'signin'
          ? "Don't have an account?"
          : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setNotice(null);
          }}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}

export default LoginPage;
