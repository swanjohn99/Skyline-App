import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/formatCurrency';
import './ProjectTable.css';

export default function PaymentsTable({ refreshKey }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      const { data } = await supabase
        .from('payments')
        .select('*, projects(project_title, client_name)')
        .order('payment_date', { ascending: false });
      if (data) setPayments(data);
      setLoading(false);
    }
    fetchPayments();
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
                  <td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
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
