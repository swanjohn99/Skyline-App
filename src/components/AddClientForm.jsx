import { useState } from 'react';
import { createClient, updateClient } from '../api/clients';
import './AddProjectForm.css';

const EMPTY = {
  name: '', email: '', phone: '', address: '', location: '', source: '', tags: '', notes: '',
};

function toFormState(client) {
  if (!client) return EMPTY;
  return {
    name: client.name || '',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    location: client.location || '',
    source: client.source || '',
    tags: (client.tags || []).join(', '),
    notes: client.notes || '',
  };
}

export default function AddClientForm({ client, onSaved, onCancel }) {
  const [form, setForm] = useState(() => toFormState(client));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(client);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      location: form.location.trim() || null,
      source: form.source.trim() || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit) {
        await updateClient(client.id, payload);
      } else {
        await createClient(payload);
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="form-card add-project-form">
      <h2 className="form-card-title">{isEdit ? 'Edit Client' : 'Add New Client'}</h2>
      <p className="form-card-subtitle">Store contact details for project tracking and marketing.</p>
      <form onSubmit={handleSubmit}>
        <div className="add-project-form-grid">
          <div className="add-project-form-field">
            <label>Name</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="add-project-form-field">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>Location (City/Area)</label>
            <input name="location" value={form.location} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>Source (how acquired)</label>
            <input name="source" value={form.source} onChange={handleChange} placeholder="referral, website, ad…" />
          </div>
          <div className="add-project-form-field">
            <label>Tags (comma separated)</label>
            <input name="tags" value={form.tags} onChange={handleChange} placeholder="vip, residential" />
          </div>
          <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Address</label>
            <input name="address" value={form.address} onChange={handleChange} />
          </div>
          <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Client')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
        {error && <p className="form-message form-message--error">{error}</p>}
      </form>
    </div>
  );
}
