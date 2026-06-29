import { useEffect, useState } from 'react';
import { Building2, LogOut, Search } from 'lucide-react';
import { createCompany, joinCompany, searchCompanies, skipCompanySetup } from '../api/profiles';
import { useAuth } from '../context/auth';
import { usePageTitle } from '../hooks/usePageTitle';

export default function OnboardingPage({ allowSkip = true, onDone }) {
  usePageTitle(allowSkip ? 'Get started' : 'Setup');
  const { user, refreshProfile, signOut } = useAuth();
  const [mode, setMode] = useState('join'); // 'join' | 'create'
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);

  const isCreate = mode === 'create';

  useEffect(() => {
    if (isCreate) return;
    if (selected && selected.name === query) return;
    const q = query.trim();
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      if (q.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchCompanies(q)
        .then((data) => { if (active) setResults(data); })
        .catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query, isCreate, selected]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (isCreate) {
        await createCompany(companyName.trim(), fullName.trim());
      } else {
        if (!selected) {
          setError('Pick a company from the list.');
          setSubmitting(false);
          return;
        }
        await joinCompany(selected.id, fullName.trim());
      }
      await refreshProfile();
      onDone?.();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    setSubmitting(true);
    setError('');
    try {
      await skipCompanySetup();
      await refreshProfile();
      onDone?.();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSubmitting(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-icon">
          <Building2 size={28} strokeWidth={2.25} />
        </div>
        <p className="login-eyebrow">Welcome, {user?.email}</p>
        <h1>{isCreate ? 'Set up your company' : 'Join your company'}</h1>
        <p className="login-subtitle">
          {isCreate
            ? "Create your company workspace. You'll be its owner and can invite teammates later."
            : 'Find your company and request access. An owner will approve you before you can add data.'}
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="fullname">Your name <span className="form-optional">(optional)</span></label>
          <div className="login-input">
            <input
              id="fullname"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          {isCreate ? (
            <>
              <label htmlFor="company">Company name</label>
              <div className="login-input">
                <Building2 size={18} />
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Builders"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <label htmlFor="company-search">Company</label>
              <div className="login-input">
                <Search size={18} />
                <input
                  id="company-search"
                  type="text"
                  value={query}
                  autoComplete="off"
                  onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                  placeholder="Type the first letters of your company…"
                  required
                />
              </div>

              {!selected && query.trim().length >= 2 && (
                <div className="company-results">
                  {searching ? (
                    <p className="company-results-empty">Searching…</p>
                  ) : results.length === 0 ? (
                    <p className="company-results-empty">No companies match “{query.trim()}”.</p>
                  ) : (
                    results.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        className="company-result"
                        onClick={() => { setSelected(c); setQuery(c.name); setResults([]); }}
                      >
                        <Building2 size={15} />
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              )}

              {selected && (
                <p className="login-message">Selected: <strong>{selected.name}</strong></p>
              )}
            </>
          )}

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
            {submitting
              ? (isCreate ? 'Creating…' : 'Requesting…')
              : (isCreate ? 'Create company' : 'Request access')}
          </button>
        </form>

        {allowSkip && (
          <p className="login-toggle">
            <button type="button" className="login-toggle-btn" onClick={handleSkip} disabled={submitting}>
              Continue as freelancer / self-employed
            </button>
          </p>
        )}

        <p className="login-toggle">
          {isCreate ? (
            <>
              Joining an existing company?{' '}
              <button type="button" className="login-toggle-btn" onClick={() => switchMode('join')}>
                Find your company
              </button>
            </>
          ) : (
            <>
              Setting up a new company?{' '}
              <button type="button" className="login-toggle-btn" onClick={() => switchMode('create')}>
                Create one
              </button>
            </>
          )}
        </p>

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
