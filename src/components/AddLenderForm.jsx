import { useState } from 'react';
import { createLender, updateLender } from '../api/lenders';

const EMPTY = {
  name: '',
  phone: '',
  address: '',
  notes: '',
};

function toFormState(lender) {
  if (!lender) return EMPTY;
  return {
    name: lender.name || '',
    phone: lender.phone || '',
    address: lender.address || '',
    notes: lender.notes || '',
  };
}

export default function AddLenderForm({ lender, onSaved, onCancel }) {
  const [form, setForm] = useState(() => toFormState(lender));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isEdit = Boolean(lender);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit) {
        await updateLender(lender.id, payload);
      } else {
        await createLender(payload);
      }
      onSaved?.();
      if (!isEdit) setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h3 className="form-card-title">{isEdit ? 'Edit Lender' : 'Add Lender'}</h3>
      <p className="form-card-subtitle">Private individual or informal lender.</p>

      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="form-field">
          <label>Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Lender name"
          />
        </div>
        <div className="form-field">
          <label>Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone number"
          />
        </div>
        <div className="form-field">
          <label>Address</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Address"
            rows={2}
          />
        </div>
        <div className="form-field">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes"
            rows={2}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Lender')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        {error && <span className="form-message form-message--error">{error}</span>}
      </div>
    </form>
  );
}
