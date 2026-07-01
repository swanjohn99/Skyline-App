import { useState, useEffect } from 'react';
import { createProject } from '../api/projects';
import { listClients } from '../api/clients';
import { setEntityProjectTypes } from '../api/projectTypes';
import { PROJECT_STATUSES, COMPLETED_STATUSES, clientDisplayName } from '../constants';
import DateInput from './DateInput';
import PocDraftSection, { saveDraftContacts } from './PocDraftSection';
import ProjectTypesDraftPicker from './ProjectTypesDraftPicker';
import AmountInput from './AmountInput';
import './AddProjectForm.css';

const INITIAL_FORM = {
  project_title: '',
  client_id: '',
  client_name: '',
  location: '',
  work_description: '',
  total_quoted_amount: '',
  status: 'site visit requested',
  start_date: '',
  end_date: '',
  completion_percent: 0,
};

function AddProjectForm({ onProjectAdded, onCancel }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [clients, setClients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [pocDraftRows, setPocDraftRows] = useState([]);
  const [projectTypeIds, setProjectTypeIds] = useState([]);

  useEffect(() => {
    listClients().then(setClients).catch(() => setClients([]));
  }, []);

  function handleChange(event) {
    const { name, value, type } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
    setSuccess(false);
    setError(null);
  }

  function handleClientSelect(event) {
    const clientId = event.target.value;
    const client = clients.find((c) => c.id === clientId);
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      client_name: client ? clientDisplayName(client) : prev.client_name,
      location: client?.location || client?.customer_account?.location || prev.location,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const completionPercent = COMPLETED_STATUSES.includes(form.status)
      ? 100
      : form.completion_percent;

    try {
      const created = await createProject({
        project_title: form.project_title,
        client_id: form.client_id || null,
        client_name: form.client_name,
        location: form.location,
        work_description: form.work_description,
        total_quoted_amount: form.total_quoted_amount === '' ? null : Number(form.total_quoted_amount),
        status: form.status,
        completion_percent: completionPercent,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      if (created?.id) {
        if (pocDraftRows.length) {
          await saveDraftContacts('project', created.id, pocDraftRows);
        }
        if (projectTypeIds.length) {
          await setEntityProjectTypes('project', created.id, projectTypeIds);
        }
      }
      setForm(INITIAL_FORM);
      setPocDraftRows([]);
      setProjectTypeIds([]);
      setSuccess(true);
      onProjectAdded?.();
    } catch (insertError) {
      setError(insertError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-card add-project-form">
      <h2 className="form-card-title">Add New Project</h2>
      <p className="form-card-subtitle">Create a new construction project and track it from site visit to completion.</p>
      <form onSubmit={handleSubmit}>
        <div className="add-project-form-grid">
          <div className="add-project-form-field">
            <label>Project Title</label>
            <input name="project_title" value={form.project_title} onChange={handleChange} required />
          </div>
          <div className="add-project-form-field">
            <label>Link Client (CRM)</label>
            <select value={form.client_id} onChange={handleClientSelect}>
              <option value="">— None / new —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
              ))}
            </select>
          </div>
          <div className="add-project-form-field">
            <label>Client Name</label>
            <input name="client_name" value={form.client_name} onChange={handleChange} required />
          </div>
          <div className="add-project-form-field">
            <label>Location</label>
            <input name="location" value={form.location} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>Total Amount (INR)</label>
            <AmountInput name="total_quoted_amount" step="0.01" value={form.total_quoted_amount} onChange={handleChange} placeholder="Optional" />
          </div>
          <div className="add-project-form-field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange} required>
              {PROJECT_STATUSES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="add-project-form-field">
            <label>Start Date</label>
            <DateInput name="start_date" value={form.start_date} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>End Date</label>
            <DateInput name="end_date" value={form.end_date} onChange={handleChange} />
          </div>
          <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Work Description</label>
            <textarea name="work_description" value={form.work_description} onChange={handleChange} />
          </div>

          <ProjectTypesDraftPicker
            selectedIds={projectTypeIds}
            onChange={setProjectTypeIds}
          />
        </div>

        <PocDraftSection onRowsChange={setPocDraftRows} />

        <div className="form-actions">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Submitting…' : 'Create Project'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          {success && <span className="form-message form-message--success">Project created successfully.</span>}
        </div>
        {error && <p className="form-message form-message--error">{error}</p>}
      </form>
    </div>
  );
}

export default AddProjectForm;
