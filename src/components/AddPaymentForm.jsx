import { useState, useEffect } from 'react';
import { listOpenProjects } from '../api/projects';
import { createPayment } from '../api/payments';
import { todayInputValue } from '../utils/format';

export default function AddPaymentForm({ onPaymentAdded, defaultProjectId, onCancel }) {
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [payment, setPayment] = useState({
    project_id: defaultProjectId || '',
    amount: '',
    payment_date: todayInputValue(),
  });

  useEffect(() => {
    if (defaultProjectId) return;
    listOpenProjects().then(setProjects).catch(() => setProjects([]));
  }, [defaultProjectId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createPayment({
        project_id: payment.project_id,
        amount: Number(payment.amount),
        payment_date: payment.payment_date,
      });
      onPaymentAdded?.();
      if (!defaultProjectId) {
        setPayment({ project_id: '', amount: '', payment_date: todayInputValue() });
      } else {
        setPayment((prev) => ({ ...prev, amount: '', payment_date: todayInputValue() }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isCompact = Boolean(defaultProjectId);

  return (
    <form onSubmit={handleSubmit} className={isCompact ? '' : 'form-card'}>
      {!isCompact && (
        <>
          <h3 className="form-card-title">Record Payment</h3>
          <p className="form-card-subtitle">Log a payment received from a client.</p>
        </>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        {!defaultProjectId && (
          <div className="form-field">
            <label>Project</label>
            <select
              required
              value={payment.project_id}
              onChange={(e) => setPayment({ ...payment, project_id: e.target.value })}
            >
              <option value="">Select a project…</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.project_title} — {p.client_name || 'No client'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-field">
          <label>Amount (INR)</label>
          <input
            type="number"
            required
            placeholder="0.00"
            value={payment.amount}
            onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Payment Date</label>
          <input
            type="date"
            required
            value={payment.payment_date}
            onChange={(e) => setPayment({ ...payment, payment_date: e.target.value })}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : 'Add Payment'}
        </button>
        {!isCompact && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        {error && <span className="form-message form-message--error">{error}</span>}
      </div>
    </form>
  );
}
