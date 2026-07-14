import { useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import { requestPasswordReset } from '../api/auth';
import { useAuth } from '../context/auth';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';

  usePageTitle(isForgot ? 'Reset password' : isSignUp ? 'Sign up' : 'Sign in');

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (isForgot) {
        await requestPasswordReset(email);
        setMessage('If an account exists for that email, a reset link is on its way.');
      } else if (isSignUp) {
        await signUp(email, password, rememberMe);
      } else {
        await signIn(email, password, rememberMe);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError('');
    setMessage('');
  }

  const title = isForgot ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back';
  const subtitle = isForgot
    ? "Enter your email and we'll send you a reset link."
    : isSignUp
      ? 'Create your account with email and password.'
      : 'Sign in to manage your projects, expenses, and payments.';

  return (
    <main className="login-page">
      <section className="login-card">
        <h1>{title}</h1>
        <p className="login-subtitle">{subtitle}</p>

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

          {!isForgot && (
            <>
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
            </>
          )}

          {!isForgot && (
            <div className="login-remember-row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this device (30 days)</span>
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  className="login-toggle-btn"
                  onClick={() => switchMode('forgot')}
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}

          {error && <p className="login-error">{error}</p>}
          {message && <p className="login-message">{message}</p>}

          <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
            {submitting
              ? 'Please wait…'
              : isForgot
                ? 'Send reset link'
                : isSignUp
                  ? 'Sign up'
                  : 'Sign in'}
          </button>
        </form>

        <p className="login-toggle">
          {isForgot ? (
            <>
              Remembered it?{' '}
              <button type="button" className="login-toggle-btn" onClick={() => switchMode('signin')}>
                Back to sign in
              </button>
            </>
          ) : (
            <>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="login-toggle-btn"
                onClick={() => switchMode(isSignUp ? 'signin' : 'signup')}
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </>
          )}
        </p>
      </section>
    </main>
  );
}
