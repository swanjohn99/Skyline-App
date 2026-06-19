import { useState } from 'react';
import { Building2, LockKeyhole, Mail } from 'lucide-react';
import { signInWithPassword, signUpWithPassword } from '../api/auth';

export default function LoginPage() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isSignUp = mode === 'signup';

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    if (isSignUp) {
      const { data, error: signUpError } = await signUpWithPassword(email, password);
      if (signUpError) {
        setError(signUpError.message);
      } else if (!data.session) {
        setMessage('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
      }
    } else {
      const { error: signInError } = await signInWithPassword(email, password);
      if (signInError) setError(signInError.message);
    }
    setSubmitting(false);
  }

  function toggleMode() {
    setMode(isSignUp ? 'signin' : 'signup');
    setError('');
    setMessage('');
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-icon">
          <Building2 size={28} strokeWidth={2.25} />
        </div>
        <p className="login-eyebrow">Skyline Constructions</p>
        <h1>{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
        <p className="login-subtitle">
          {isSignUp
            ? 'Sign up to create or join a company workspace.'
            : 'Sign in to manage your projects, expenses, and payments.'}
        </p>

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
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
              required
              minLength={6}
            />
          </div>

          {error && <p className="login-error">{error}</p>}
          {message && <p className="login-message">{message}</p>}

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={submitting}
          >
            {submitting
              ? (isSignUp ? 'Creating account…' : 'Signing in…')
              : (isSignUp ? 'Sign up' : 'Sign in')}
          </button>
        </form>

        <p className="login-toggle">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="login-toggle-btn" onClick={toggleMode}>
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </section>
    </main>
  );
}
