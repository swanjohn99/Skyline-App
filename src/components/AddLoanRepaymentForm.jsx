import { useEffect, useState } from 'react';
import { listLoans } from '../api/loans';
import { createLoanRepayment, updateLoanRepayment } from '../api/loanRepayments';
import { LOAN_REPAYMENT_METHODS } from '../constants';
import { todayInputValue, toDateInputValue } from '../utils/format';
import DateInput from './DateInput';

const EMPTY = {
  loan_id: '',
  payment_method: 'cash',
  amount: '',
  repayment_date: todayInputValue(),
  comments: '',
};

function toFormState(record) {
  if (!record) return EMPTY;
  return {
    loan_id: record.loan_id || '',
    payment_method: record.payment_method || 'cash',
    amount: record.amount ?? '',
    repayment_date: toDateInputValue(record.repayment_date) || todayInputValue(),
    comments: record.comments || '',
  };
}

export default function AddLoanRepaymentForm({
  repayment,
  defaultLoanId,
  onSaved,
  onCancel,
}) {
  const [loans, setLoans] = useState([]);
  const [form, setForm] = useState(() => ({
    ...toFormState(repayment),
    loan_id: repayment?.loan_id || defaultLoanId || '',
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(repayment);
  const isCompact = Boolean(defaultLoanId) && !isEdit;

  useEffect(() => {
    if (defaultLoanId && !isEdit) return;
    listLoans().then(setLoans).catch(() => setLoans([]));
  }, [defaultLoanId, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      loan_id: form.loan_id,
      payment_method: form.payment_method,
      amount: Number(form.amount),
      repayment_date: form.repayment_date,
      comments: form.comments.trim() || null,
    };

    try {
      if (isEdit) {
        await updateLoanRepayment(repayment.id, payload);
      } else {
        await createLoanRepayment(payload);
      }
      onSaved?.();
      if (!isEdit && !defaultLoanId) {
        setForm({ ...EMPTY, repayment_date: todayInputValue() });
      } else if (!isEdit && defaultLoanId) {
        setForm((prev) => ({
          ...prev,
          amount: '',
          comments: '',
          repayment_date: todayInputValue(),
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={isCompact ? 'form-card form-card--nested' : 'form-card'}>
      {!isCompact && (
        <>
          <h3 className="form-card-title">{isEdit ? 'Edit Repayment' : 'Record Repayment'}</h3>
          <p className="form-card-subtitle">Money paid back to a lender.</p>
        </>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        {!defaultLoanId && (
          <div className="form-field">
            <label>Loan</label>
            <select
              required
              value={form.loan_id}
              onChange={(e) => setForm({ ...form, loan_id: e.target.value })}
            >
              <option value="">Select a loan…</option>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.lender_name} — {loan.principal_amount} ({loan.loan_date})
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
            {LOAN_REPAYMENT_METHODS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Amount (INR)</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Repayment date</label>
          <DateInput
            required
            value={form.repayment_date}
            onChange={(e) => setForm({ ...form, repayment_date: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Comments</label>
          <textarea
            value={form.comments}
            onChange={(e) => setForm({ ...form, comments: e.target.value })}
            placeholder="Reference, bank, notes…"
            rows={2}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Repayment')}
        </button>
        {!isCompact && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        {error && <span className="form-message form-message--error">{error}</span>}
      </div>
    </form>
  );
}
