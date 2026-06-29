import { useEffect, useState } from 'react';
import { listPayments, deletePayment } from '../api/payments';
import { formatCurrency, formatDate } from '../utils/format';
import { paymentMethodLabel } from '../constants';
import { usePagination } from '../hooks/usePagination';
import TablePagination from './TablePagination';
import './ProjectTable.css';

export default function PaymentsTable({ refreshKey, onEdit, onDeleted }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    listPayments()
      .then((data) => { if (active) setPayments(data); })
      .catch(() => { if (active) setPayments([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(payments, undefined, refreshKey);

  async function handleDelete(payment) {
    const label = payment.projects?.project_title || formatCurrency(payment.amount);
    if (!window.confirm(`Delete payment for "${label}"? This cannot be undone.`)) return;
    setDeletingId(payment.id);
    try {
      await deletePayment(payment.id);
      onDeleted?.();
    } catch (err) {
      window.alert(err.message || 'Failed to delete payment.');
    } finally {
      setDeletingId(null);
    }
  }

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
              <th>Method</th>
              <th>Project</th>
              <th>Client Name</th>
              <th>Comments</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="data-table-empty">No payments recorded yet.</td>
              </tr>
            ) : (
              pageItems.map(p => (
                <tr key={p.id}>
                  <td>{formatDate(p.payment_date)}</td>
                  <td>{paymentMethodLabel(p.payment_method)}</td>
                  <td>{p.projects?.project_title || '—'}</td>
                  <td>{p.projects?.client_name || '—'}</td>
                  <td>{p.comments || '—'}</td>
                  <td className="data-table-amount">{formatCurrency(p.amount)}</td>
                  <td>
                    <div className="table-actions-stack">
                      <button type="button" className="btn-edit" onClick={() => onEdit(p)}>Edit</button>
                      <button
                        type="button"
                        className="btn-edit btn-edit--danger"
                        onClick={() => handleDelete(p)}
                        disabled={deletingId === p.id}
                      >
                        {deletingId === p.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        show={showPagination}
      />
    </div>
  );
}
