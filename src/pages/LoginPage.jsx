import { useState } from 'react';
import { Building2, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogleSignIn() {
    setOauthSubmitting(true);
    setError('');

    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (signInError) {
      setError(signInError.message);
      setOauthSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }
    setSubmitting(false);
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-icon">
          <Building2 size={28} strokeWidth={2.25} />
        </div>
        <p className="login-eyebrow">Skyline Constructions</p>
        <h1>Welcome back</h1>
        <p className="login-subtitle">Sign in to manage your projects, expenses, and payments.</p>

        <button
          type="button"
          className="google-sign-in"
          onClick={handleGoogleSignIn}
          disabled={oauthSubmitting || submitting}
        >
          <GoogleIcon />
          {oauthSubmitting ? 'Connecting to Google…' : 'Continue with Google'}
        </button>

        <div className="login-divider">
          <span>or sign in with email</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="email">Email address</label>
          <div className="login-input">
            <Mail size={18} />
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="login-input">
            <LockKeyhole size={18} />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={submitting || oauthSubmitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
      <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path fill="#34a853" d="M12 22c2.7 0 4.98-.9 6.63-2.37l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#fbbc05" d="M6.39 13.92A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.92V7.46H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.54l3.35-2.62Z" />
      <path fill="#ea4335" d="M12 5.95c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.46l3.35 2.62C7.18 7.71 9.39 5.95 12 5.95Z" />
    </svg>
  );
}
