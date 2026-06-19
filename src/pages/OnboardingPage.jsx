import { useState } from 'react';
import { Building2, LogOut } from 'lucide-react';
import { createCompany } from '../api/profiles';
import { useAuth } from '../context/auth';

export default function OnboardingPage() {
  const { user, refreshProfile, signOut } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createCompany(companyName.trim(), fullName.trim());
      await refreshProfile();
    } catch (err) {
      setError(err.message || 'Could not create company.');
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-icon">
          <Building2 size={28} strokeWidth={2.25} />
        </div>
        <p className="login-eyebrow">Welcome, {user?.email}</p>
        <h1>Set up your company</h1>
        <p className="login-subtitle">
          Create your company workspace. You'll be its owner and can invite teammates later.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="company">Company name</label>
          <div className="login-input">
            <Building2 size={18} />
            <input
              id="company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Skyline Constructions"
              required
            />
          </div>

          <label htmlFor="fullname">Your name</label>
          <div className="login-input">
            <input
              id="fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create company'}
          </button>
        </form>

        <p className="login-toggle">
          <button type="button" className="login-toggle-btn" onClick={signOut}>
            <LogOut size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Sign out
          </button>
        </p>
      </section>
    </main>
  );
}
