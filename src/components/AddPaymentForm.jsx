import { useState, useEffect } from 'react';
import { listOpenProjects, listProjects } from '../api/projects';
import { createPayment, updatePayment } from '../api/payments';
import { PAYMENT_METHODS } from '../constants';
import { todayInputValue, toDateInputValue } from '../utils/format';

const EMPTY_PAYMENT = {
  project_id: '',
  payment_method: 'cash',
  amount: '',
  payment_date: todayInputValue(),
  comments: '',
};

function toFormState(record) {
  if (!record) return EMPTY_PAYMENT;
  return {
    project_id: record.project_id || '',
    payment_method: record.payment_method || 'cash',
    amount: record.amount ?? '',
    payment_date: toDateInputValue(record.payment_date) || todayInputValue(),
    comments: record.comments || '',
  };
}

export default function AddPaymentForm({ payment, onPaymentAdded, defaultProjectId, onCancel }) {
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(() => ({
    ...toFormState(payment),
    project_id: payment?.project_id || defaultProjectId || '',
  }));

  const isEdit = Boolean(payment);
  const isCompact = Boolean(defaultProjectId) && !isEdit;

  useEffect(() => {
    if (defaultProjectId && !isEdit) return;
    const loader = isEdit ? listProjects() : listOpenProjects();
    loader.then(setProjects).catch(() => setProjects([]));
  }, [defaultProjectId, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      project_id: form.project_id,
      payment_method: form.payment_method,
      amount: Number(form.amount),
      payment_date: form.payment_date,
      comments: form.comments.trim() || null,
    };

    try {
      if (isEdit) {
        await updatePayment(payment.id, payload);
      } else {
        await createPayment(payload);
      }
      onPaymentAdded?.();
      if (!isEdit && !defaultProjectId) {
        setForm({ ...EMPTY_PAYMENT, payment_date: todayInputValue() });
      } else if (!isEdit && defaultProjectId) {
        setForm((prev) => ({
          ...prev,
          amount: '',
          comments: '',
          payment_date: todayInputValue(),
        }));
      }
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={isCompact ? '' : 'form-card'}>
      {!isCompact && (
        <>
          <h3 className="form-card-title">{isEdit ? 'Edit Payment' : 'Record Payment'}</h3>
          <p className="form-card-subtitle">Log a payment received from a client.</p>
        </>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        {!defaultProjectId && (
          <div className="form-field">
            <label>Project</label>
            <select
              required
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
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
          <label>Payment method</label>
          <select
            required
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
          >
            {PAYMENT_METHODS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Amount (INR)</label>
          <input
            type="number"
            required
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Payment Date</label>
          <input
            type="date"
            required
            value={form.payment_date}
            onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Comments</label>
          <textarea
            value={form.comments}
            onChange={(e) => setForm({ ...form, comments: e.target.value })}
            placeholder="Reference number, bank, notes…"
            rows={3}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Payment')}
        </button>
        {!isCompact && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        {error && <span className="form-message form-message--error">{error}</span>}
      </div>
    </form>
  );
}
