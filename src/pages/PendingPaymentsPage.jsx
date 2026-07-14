import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getDashboardData } from '../api/dashboard';
import { formatCurrency } from '../utils/format';
import { usePageTitle } from '../hooks/usePageTitle';

export default function PendingPaymentsPage() {
  usePageTitle('Pending Payments');
  const [pendingProjects, setPendingProjects] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardData()
      .then(({ pendingProjects: rows, totalPending: total }) => {
        setPendingProjects(rows);
        setTotalPending(total);
        setError('');
      })
      .catch((err) => setError(err.message || 'Failed to load pending payments.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <Link to="/" className="back-link">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <header className="page-header">
        <div>
          <h1 className="page-title">Pending Payments</h1>
          <p className="page-subtitle">
            Outstanding quoted amounts across all projects.
            {!loading && !error && (
              <> Total pending: <strong>{formatCurrency(totalPending)}</strong></>
            )}
          </p>
        </div>
      </header>

      {error && <p className="form-message form-message--error">{error}</p>}

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading pending payments…
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Quoted</th>
                <th>Received</th>
                <th>Pending</th>
              </tr>
            </thead>
            <tbody>
              {pendingProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="data-table-empty">No pending payments. All quoted projects are fully paid.</td>
                </tr>
              ) : (
                pendingProjects.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/projects/${p.id}`}>{p.project_title}</Link>
                    </td>
                    <td>{p.client_name || '—'}</td>
                    <td className="data-table-amount">{formatCurrency(p.total_quoted_amount)}</td>
                    <td className="data-table-amount">{formatCurrency(p.amount_received)}</td>
                    <td className="data-table-amount pending-positive">{formatCurrency(p.pending)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
