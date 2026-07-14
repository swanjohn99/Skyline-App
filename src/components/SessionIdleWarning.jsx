import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useAuth } from '../context/auth';
import './SessionIdleWarning.css';

function formatCountdown(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SessionIdleWarning() {
  const { idleWarning, sessionMeta, extendSession, signOut } = useAuth();
  const [countdown, setCountdown] = useState(() => formatCountdown(sessionMeta?.expires_at));

  useEffect(() => {
    if (!idleWarning) return undefined;
    setCountdown(formatCountdown(sessionMeta?.expires_at));
    const timer = setInterval(() => {
      setCountdown(formatCountdown(sessionMeta?.expires_at));
    }, 1000);
    return () => clearInterval(timer);
  }, [idleWarning, sessionMeta?.expires_at]);

  if (!idleWarning) return null;

  return (
    <div className="session-idle-warning" role="alertdialog" aria-live="assertive">
      <div className="session-idle-warning-icon">
        <Clock size={18} />
      </div>
      <div className="session-idle-warning-body">
        <strong>You'll be signed out soon</strong>
        <span>
          Auto sign-out in {countdown ?? '2:00'} due to inactivity.
        </span>
      </div>
      <div className="session-idle-warning-actions">
        <button type="button" className="btn btn-primary" onClick={extendSession}>
          Stay signed in
        </button>
        <button type="button" className="btn btn-secondary" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  );
}
