import { useEffect, useState } from 'react';
import { listLenders } from '../api/lenders';
import { createLoan, updateLoan } from '../api/loans';
import { INTEREST_PERIODS } from '../constants';
import { todayInputValue, toDateInputValue } from '../utils/format';
import DateInput from './DateInput';

const EMPTY = {
  lender_id: '',
  principal_amount: '',
  loan_date: todayInputValue(),
  interest_rate: '',
  interest_period: 'year',
  notes: '',
};

function toFormState(loan) {
  if (!loan) return EMPTY;
  return {
    lender_id: loan.lender_id || '',
    principal_amount: loan.principal_amount ?? '',
    loan_date: toDateInputValue(loan.loan_date) || todayInputValue(),
    interest_rate: loan.interest_rate ?? '',
    interest_period: loan.interest_period || 'year',
    notes: loan.notes || '',
  };
}

export default function AddLoanForm({ loan, onSaved, onCancel, onAddLender }) {
  const [lenders, setLenders] = useState([]);
  const [form, setForm] = useState(() => toFormState(loan));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(loan);

  useEffect(() => {
    listLenders().then(setLenders).catch(() => setLenders([]));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      lender_id: form.lender_id,
      principal_amount: Number(form.principal_amount),
      loan_date: form.loan_date,
      interest_rate: Number(form.interest_rate) || 0,
      interest_period: form.interest_period,
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit) {
        await updateLoan(loan.id, payload);
      } else {
        await createLoan(payload);
      }
      onSaved?.();
      if (!isEdit) {
        setForm({ ...EMPTY, loan_date: todayInputValue() });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h3 className="form-card-title">{isEdit ? 'Edit Loan' : 'Record Loan'}</h3>
      <p className="form-card-subtitle">Money received from a lender.</p>

      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="form-field">
          <label>Lender</label>
          <div className="form-field-inline">
            <select
              required
              value={form.lender_id}
              onChange={(e) => setForm({ ...form, lender_id: e.target.value })}
            >
              <option value="">Select lender…</option>
              {lenders.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            {onAddLender && (
              <button type="button" className="btn btn-secondary" onClick={onAddLender}>
                New lender
              </button>
            )}
          </div>
        </div>

        <div className="form-field">
          <label>Amount lent (INR)</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={form.principal_amount}
            onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Loan date</label>
          <DateInput
            required
            value={form.loan_date}
            onChange={(e) => setForm({ ...form, loan_date: e.target.value })}
          />
        </div>

        <div className="form-grid form-grid--split">
          <div className="form-field">
            <label>Interest rate</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.interest_rate}
              onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="form-field">
            <label>Interest period</label>
            <select
              value={form.interest_period}
              onChange={(e) => setForm({ ...form, interest_period: e.target.value })}
            >
              {INTEREST_PERIODS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Purpose, terms, reference…"
            rows={2}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Loan')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        {error && <span className="form-message form-message--error">{error}</span>}
      </div>
    </form>
  );
}
