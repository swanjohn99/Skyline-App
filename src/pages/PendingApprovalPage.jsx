import { useState } from 'react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/auth';
import { usePageTitle } from '../hooks/usePageTitle';

export default function PendingApprovalPage() {
  usePageTitle('Pending approval');
  const { user, companyName, refreshProfile, signOut } = useAuth();
  const [checking, setChecking] = useState(false);

  async function handleRefresh() {
    setChecking(true);
    try {
      await refreshProfile();
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand-icon login-brand-icon--muted">
          <Clock size={28} strokeWidth={2.25} />
        </div>
        <h1>Awaiting approval</h1>
        <p className="login-subtitle">
          Your request to join{' '}
          {companyName ? <strong>{companyName}</strong> : 'the company'} is pending.
          An owner or administrator must grant you access before you can view or add data.
        </p>

        <div className="login-form">
          <p className="login-message">
            {companyName || 'Selected company'} — signed in as {user?.email}
          </p>

          <button
            type="button"
            className="btn btn-primary login-submit"
            onClick={handleRefresh}
            disabled={checking}
          >
            <RefreshCw size={16} />
            {checking ? 'Checking…' : 'Check approval status'}
          </button>
        </div>

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
