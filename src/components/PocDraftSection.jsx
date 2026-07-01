import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { listClients } from '../api/clients';
import { createEntityContact } from '../api/projectTypes';
import { clientDisplayName } from '../constants';

const EMPTY_ROW = { client_id: '', role: '', is_principal: false };

export async function saveDraftContacts(entityType, entityId, rows) {
  const valid = rows.filter((r) => r.client_id);
  for (const row of valid) {
    await createEntityContact({
      entity_type: entityType,
      entity_id: entityId,
      client_id: row.client_id,
      role: row.role.trim() || null,
      is_principal: row.is_principal,
    });
  }
}

export default function PocDraftSection({ excludeClientIds = [], disabled = false, onRowsChange }) {
  const [clients, setClients] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    listClients().then(setClients).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);

  const excluded = new Set(excludeClientIds.filter(Boolean));
  const availableClients = clients.filter((c) => !excluded.has(c.id));

  function updateRow(index, patch) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="poc-draft-section">
      <div className="project-table-toolbar">
        <h3 className="project-table-section-title">Additional points of contact</h3>
        {!disabled && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
            <Plus size={14} />
            Add contact
          </button>
        )}
      </div>
      <p className="form-card-subtitle" style={{ marginTop: 0, marginBottom: 12 }}>
        Link other clients as POCs. They will be saved when you submit the form.
      </p>
      {rows.length === 0 ? (
        <p className="data-table-empty" style={{ padding: '8px 0' }}>No additional contacts added.</p>
      ) : (
        rows.map((row, index) => (
          <div key={index} className="poc-draft-row">
            <div className="form-field">
              <label>Client</label>
              <select
                value={row.client_id}
                disabled={disabled}
                onChange={(e) => updateRow(index, { client_id: e.target.value })}
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
                value={row.role}
                disabled={disabled}
                onChange={(e) => updateRow(index, { role: e.target.value })}
                placeholder="Owner, site manager…"
              />
            </div>
            <div className="form-field poc-draft-row-principal">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={row.is_principal}
                  disabled={disabled}
                  onChange={(e) => updateRow(index, { is_principal: e.target.checked })}
                />
                Principal
              </label>
            </div>
            {!disabled && (
              <button type="button" className="btn-edit btn-edit--danger poc-draft-row-remove" onClick={() => removeRow(index)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
