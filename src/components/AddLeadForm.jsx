import { useEffect, useState } from 'react';
import { createLead, updateLead } from '../api/leads';
import { listClients } from '../api/clients';
import { setEntityProjectTypes, listEntityProjectTypes } from '../api/projectTypes';
import { LEAD_STATUSES, clientDisplayName } from '../constants';
import PocDraftSection, { saveDraftContacts } from './PocDraftSection';
import EntityContactsTable from './EntityContactsTable';
import ProjectTypesDraftPicker from './ProjectTypesDraftPicker';
import AmountInput from './AmountInput';
import './AddProjectForm.css';

const EMPTY = {
  clientMode: 'existing',
  client_id: '',
  contact_name: '',
  project_title: '',
  phone: '',
  email: '',
  location: '',
  source: '',
  status: 'new_inquiry',
  estimated_value: '',
  notes: '',
};

function toFormState(lead) {
  if (!lead) return EMPTY;
  const useNewInquiry = Boolean(lead.contact_name);
  return {
    clientMode: useNewInquiry ? 'new' : 'existing',
    client_id: lead.client_id || '',
    contact_name: lead.contact_name || '',
    project_title: lead.project_title || '',
    phone: lead.phone || lead.client?.phone || '',
    email: lead.email || lead.client?.email || '',
    location: lead.location || lead.client?.location || '',
    source: lead.source || '',
    status: lead.status || 'new_inquiry',
    estimated_value: lead.estimated_value ?? '',
    notes: lead.notes || '',
  };
}

export default function AddLeadForm({ lead, onSaved, onCancel }) {
  const [form, setForm] = useState(() => toFormState(lead));
  const [clients, setClients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [pocDraftRows, setPocDraftRows] = useState([]);
  const [projectTypeIds, setProjectTypeIds] = useState([]);

  const isEdit = Boolean(lead);
  const isConverted = lead?.status === 'converted';
  const useExistingClient = form.clientMode === 'existing';

  useEffect(() => {
    listClients().then(setClients).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (!isEdit || !lead?.id) return;
    listEntityProjectTypes('lead', lead.id)
      .then((rows) => setProjectTypeIds(rows.map((r) => r.project_type_id)))
      .catch(() => setProjectTypeIds([]));
  }, [isEdit, lead?.id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError(null);

    const payload = {
      project_title: form.project_title.trim() || null,
      estimated_value: form.estimated_value === '' ? null : Number(form.estimated_value),
      notes: form.notes.trim() || null,
    };

    if (!isConverted) {
      payload.status = form.status;
    }

    if (useExistingClient) {
      if (!form.client_id) {
        setError('Select a client.');
        setSubmitting(false);
        return;
      }
      payload.client_id = form.client_id;
    } else {
      payload.contact_name = form.contact_name.trim();
      payload.phone = form.phone.trim() || null;
      payload.email = form.email.trim() || null;
      payload.location = form.location.trim() || null;
      payload.source = form.source.trim() || null;
      if (!payload.contact_name) {
        setError('Contact name is required for new inquiries.');
        setSubmitting(false);
        return;
      }
      if (!payload.phone && !payload.email) {
        setError('Enter a phone or email for new inquiries.');
        setSubmitting(false);
        return;
      }
    }

    try {
      if (isEdit) {
        await updateLead(lead.id, payload);
        await setEntityProjectTypes('lead', lead.id, projectTypeIds);
      } else {
        const created = await createLead(payload);
        if (created?.id) {
          if (pocDraftRows.length) {
            await saveDraftContacts('lead', created.id, pocDraftRows);
          }
          if (projectTypeIds.length) {
            await setEntityProjectTypes('lead', created.id, projectTypeIds);
          }
        }
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="form-card add-project-form">
      <h2 className="form-card-title">{isEdit ? 'Edit Lead' : 'Add Lead'}</h2>
      <p className="form-card-subtitle">Link an existing client or capture a new inquiry.</p>
      <form onSubmit={handleSubmit}>
        <div className="add-project-form-grid">
          {!isConverted && (
            <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Client</label>
              <div className="account-mode-toggle">
                <button
                  type="button"
                  className={`account-mode-btn${useExistingClient ? ' active' : ''}`}
                  onClick={() => setForm((p) => ({ ...p, clientMode: 'existing' }))}
                >
                  Existing client
                </button>
                <button
                  type="button"
                  className={`account-mode-btn${!useExistingClient ? ' active' : ''}`}
                  onClick={() => setForm((p) => ({ ...p, clientMode: 'new' }))}
                >
                  New inquiry
                </button>
              </div>
            </div>
          )}

          {useExistingClient ? (
            <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Select client</label>
              <select
                name="client_id"
                value={form.client_id}
                onChange={handleChange}
                required={useExistingClient}
              >
                <option value="">Choose a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="add-project-form-field">
                <label>Contact name</label>
                <input
                  name="contact_name"
                  value={form.contact_name}
                  onChange={handleChange}
                  required={!useExistingClient}
                />
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
                <label>Location</label>
                <input name="location" value={form.location} onChange={handleChange} />
              </div>
            </>
          )}

          <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Project name</label>
            <input
              name="project_title"
              value={form.project_title}
              onChange={handleChange}
              placeholder="Name for this project (not the client name)"
            />
          </div>

          {!useExistingClient && (
            <div className="add-project-form-field">
              <label>Source</label>
              <input
                name="source"
                value={form.source}
                onChange={handleChange}
                placeholder="referral, website, ad…"
              />
            </div>
          )}

          <div className="add-project-form-field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange} disabled={isConverted}>
              {(isConverted
                ? LEAD_STATUSES.filter((s) => s.value === 'converted')
                : LEAD_STATUSES.filter((s) => s.value !== 'converted')
              ).map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="add-project-form-field">
            <label>Estimated value (₹)</label>
            <AmountInput
              name="estimated_value"
              step="0.01"
              value={form.estimated_value}
              onChange={handleChange}
            />
          </div>

          <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} />
          </div>

          <ProjectTypesDraftPicker
            selectedIds={projectTypeIds}
            onChange={setProjectTypeIds}
            disabled={isConverted}
            showAddCatalogue={!isEdit}
          />
        </div>

        {!isEdit && !isConverted && (
          <PocDraftSection disabled={isConverted} onRowsChange={setPocDraftRows} />
        )}

        <div className="form-actions">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Lead')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
        {error && <p className="form-message form-message--error">{error}</p>}
      </form>
      {isEdit && lead?.id && (
        <EntityContactsTable entityType="lead" entityId={lead.id} />
      )}
    </div>
  );
}
