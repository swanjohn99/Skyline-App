import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { resetPassword } from '../api/auth';
import { usePageTitle } from '../hooks/usePageTitle';

function getToken() {
  return new URLSearchParams(window.location.search).get('token') || '';
}

// Path back to the app root (respects the /app base path).
function appHome() {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : base + '/';
}

export default function ResetPasswordPage() {
  usePageTitle('Reset password');
  const [token] = useState(getToken);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        {done ? (
          <>
            <h1>Password updated</h1>
            <p className="login-subtitle">You can now sign in with your new password.</p>
            <a href={appHome()} className="btn btn-primary login-submit" style={{ textAlign: 'center' }}>
              Go to sign in
            </a>
          </>
        ) : !token ? (
          <>
            <h1>Invalid link</h1>
            <p className="login-subtitle">This password reset link is missing or malformed.</p>
            <a href={appHome()} className="btn btn-primary login-submit" style={{ textAlign: 'center' }}>
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <h1>Set a new password</h1>
            <p className="login-subtitle">Choose a new password for your account.</p>

            <form onSubmit={handleSubmit} className="login-form">
              <label htmlFor="password">New password</label>
              <div className="login-input">
                <LockKeyhole size={18} />
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  required
                  minLength={6}
                />
              </div>

              <label htmlFor="confirm">Confirm password</label>
              <div className="login-input">
                <LockKeyhole size={18} />
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                />
              </div>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
                {submitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
