import { useEffect, useState } from 'react';
import { listPayments } from '../api/payments';
import { formatCurrency, formatDate } from '../utils/format';
import './ProjectTable.css';

export default function PaymentsTable({ refreshKey }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listPayments()
      .then((data) => { if (active) setPayments(data); })
      .catch(() => { if (active) setPayments([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading payments…
      </div>
    );
  }

  return (
    <div>
      <h3 className="project-table-section-title">Payment History</h3>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Project</th>
              <th>Client Name</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="data-table-empty">No payments recorded yet.</td>
              </tr>
            ) : (
              payments.map(p => (
                <tr key={p.id}>
                  <td>{formatDate(p.payment_date)}</td>
                  <td>{p.projects?.project_title || '—'}</td>
                  <td>{p.projects?.client_name || '—'}</td>
                  <td className="data-table-amount">{formatCurrency(p.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
