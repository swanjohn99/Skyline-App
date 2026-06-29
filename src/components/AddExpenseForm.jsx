import { useState, useEffect } from 'react';
import { listOpenProjects, listProjects } from '../api/projects';
import { createExpense, updateExpense } from '../api/expenses';
import { EXPENSE_TYPES } from '../constants';
import { todayInputValue, toDateInputValue } from '../utils/format';
import DateInput from './DateInput';

function toFormState(record) {
  if (!record) {
    return {
      project_id: '',
      expense_type: 'other',
      amount: '',
      description: '',
      date: todayInputValue(),
    };
  }
  return {
    project_id: record.project_id || '',
    expense_type: record.expense_type || 'other',
    amount: record.amount ?? '',
    description: record.description || '',
    date: toDateInputValue(record.expense_date) || todayInputValue(),
  };
}

function AddExpenseForm({ expense, onExpenseAdded, defaultProjectId, onCancel }) {
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(() => ({
    ...toFormState(expense),
    project_id: expense?.project_id || defaultProjectId || '',
  }));

  const isEdit = Boolean(expense);
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
      expense_type: form.expense_type,
      amount: Number(form.amount),
      description: form.description.trim() || null,
      expense_date: form.date,
    };

    try {
      if (isEdit) {
        await updateExpense(expense.id, payload);
      } else {
        await createExpense(payload);
      }
      onExpenseAdded?.();
      if (!isEdit && !defaultProjectId) {
        setForm(toFormState(null));
      } else if (!isEdit && defaultProjectId) {
        setForm((prev) => ({
          ...prev,
          amount: '',
          description: '',
          date: todayInputValue(),
        }));
      }
      setSubmitting(false);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={isCompact ? '' : 'form-card'}>
      {!isCompact && (
        <>
          <h3 className="form-card-title">{isEdit ? 'Edit Expense' : 'Log New Expense'}</h3>
          <p className="form-card-subtitle">Record a project-related expense.</p>
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
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_title}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-field">
          <label>Type</label>
          <select
            required
            value={form.expense_type}
            onChange={(e) => setForm({ ...form, expense_type: e.target.value })}
          >
            {EXPENSE_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Amount (INR)</label>
          <input
            type="number"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What was this expense for?"
          />
        </div>

        <div className="form-field">
          <label>Expense Date</label>
          <DateInput
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Expense')}
        </button>
        {!isCompact && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        {error && <span className="form-message form-message--error">{error}</span>}
      </div>
    </form>
  );
}

export default AddExpenseForm;
