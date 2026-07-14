import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { listClients } from '../api/clients';
import {
  listEntityContacts,
  createEntityContact,
  deleteEntityContact,
} from '../api/projectTypes';
import { clientDisplayName } from '../constants';

export default function EntityContactsTable({ entityType, entityId, excludeClientIds = [] }) {
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ client_id: '', role: '', is_principal: false });

  const load = useCallback(() => {
    if (!entityId) return Promise.resolve();
    setLoading(true);
    return listEntityContacts(entityType, entityId)
      .then((data) => { setContacts(data); setError(''); })
      .catch((err) => setError(err.message || 'Failed to load contacts.'))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    listClients().then(setClients).catch(() => setClients([]));
  }, []);

  const excluded = new Set(excludeClientIds.filter(Boolean));
  const linkedIds = new Set(contacts.map((c) => c.client_id));
  const availableClients = clients.filter((c) => !excluded.has(c.id) && !linkedIds.has(c.id));

  async function handleAdd(event) {
    event.preventDefault();
    if (!form.client_id) {
      setError('Select a client.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createEntityContact({
        entity_type: entityType,
        entity_id: entityId,
        client_id: form.client_id,
        role: form.role.trim() || null,
        is_principal: form.is_principal,
      });
      setForm({ client_id: '', role: '', is_principal: false });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(contact) {
    if (!window.confirm(`Remove ${contact.client_name} as a point of contact?`)) return;
    try {
      await deleteEntityContact(contact.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!entityId) return null;

  return (
    <div className="project-table-container">
      <div className="project-table-toolbar">
        <h3 className="project-table-section-title">Points of contact</h3>
        {!showForm && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            Add contact
          </button>
        )}
      </div>

      {error && <p className="form-message form-message--error">{error}</p>}

      {showForm && (
        <form onSubmit={handleAdd} className="form-card" style={{ marginBottom: '1rem' }}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
            <div className="form-field">
              <label>Client</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                required
              >
                <option value="">Choose…</option>
                {availableClients.map((c) => (
                  <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Role</label>
              <input
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                placeholder="Owner, site manager…"
              />
            </div>
            <div className="form-field" style={{ alignSelf: 'end' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_principal}
                  onChange={(e) => setForm((p) => ({ ...p, is_principal: e.target.checked }))}
                />
                Principal
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Adding…' : 'Add'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading contacts…</div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Role</th>
                <th>Principal</th>
                <th className="data-table-col--actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr><td colSpan={6} className="data-table-empty">No contacts linked yet.</td></tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.client_name}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.role || '—'}</td>
                    <td>{c.is_principal ? 'Yes' : '—'}</td>
                    <td className="data-table-col--actions">
                      <div className="table-actions-stack">
                        <button type="button" className="btn-edit btn-edit--danger" onClick={() => handleDelete(c)}>
                          <Trash2 size={14} />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
