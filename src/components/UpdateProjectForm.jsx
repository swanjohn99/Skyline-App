import { useEffect, useState } from 'react';
import { updateProject } from '../api/projects';
import { listClients } from '../api/clients';
import { PROJECT_STATUSES, COMPLETED_STATUSES, clientDisplayName } from '../constants';
import { toDateInputValue } from '../utils/format';
import DateInput from './DateInput';
import './UpdateProjectForm.css';

function projectToForm(project) {
  return {
    project_title: project.project_title || '',
    client_id: project.client_id || '',
    client_name: project.client_name || '',
    location: project.location || '',
    work_description: project.work_description || '',
    total_quoted_amount: project.total_quoted_amount ?? '',
    status: project.status || 'site visit requested',
    completion_percent: project.completion_percent || 0,
    start_date: project.start_date || '',
    end_date: project.end_date || '',
  };
}

function UpdateProjectForm({ project, onUpdate, onClose }) {
  const [form, setForm] = useState(() => projectToForm(project));
  const [clients, setClients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    listClients().then(setClients).catch(() => setClients([]));
  }, []);

  function handleChange(event) {
    const { name, value, type } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
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

  async function handleUpdate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const canHaveEndDate = COMPLETED_STATUSES.includes(form.status);
    const completionPercent = COMPLETED_STATUSES.includes(form.status)
      ? 100
      : Number(form.completion_percent);

    try {
      await updateProject(project.id, {
        project_title: form.project_title,
        client_id: form.client_id || null,
        client_name: form.client_name,
        location: form.location,
        work_description: form.work_description,
        total_quoted_amount: form.total_quoted_amount === '' ? null : Number(form.total_quoted_amount),
        status: form.status,
        completion_percent: completionPercent,
        start_date: form.start_date || null,
        end_date: canHaveEndDate ? (form.end_date || null) : null,
      });
      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="skyline-modal-overlay">
      <div className="skyline-modal-content">
        <div className="modal-header">
          <h2>Edit Project</h2>
          <button type="button" className="close-x" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleUpdate} className="skyline-update-form">
          <div className="form-group full-width">
            <label>Project Title</label>
            <input
              name="project_title"
              value={form.project_title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group full-width">
            <label>Link Client (CRM)</label>
            <select value={form.client_id} onChange={handleClientSelect}>
              <option value="">— None / new —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{clientDisplayName(c)}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label>Client Name</label>
              <input name="client_name" value={form.client_name} onChange={handleChange} required />
            </div>
            <div className="form-group half-width">
              <label>Location</label>
              <input name="location" value={form.location} onChange={handleChange} />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Work Description</label>
            <textarea name="work_description" value={form.work_description} onChange={handleChange} rows={3} />
          </div>

          <div className="form-group full-width">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} required>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {['work started', ...COMPLETED_STATUSES].includes(form.status) && (
            <div className="form-group half-width">
              <label>Completion (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                name="completion_percent"
                value={form.completion_percent}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group half-width">
              <label>Start Date</label>
              <DateInput
                name="start_date"
                value={toDateInputValue(form.start_date)}
                onChange={handleChange}
              />
            </div>
            {COMPLETED_STATUSES.includes(form.status) && (
              <div className="form-group half-width">
                <label>End Date</label>
                <DateInput
                  name="end_date"
                  value={toDateInputValue(form.end_date)}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group half-width">
              <label>Total Quoted Amount (INR)</label>
              <input
                type="number"
                step="0.01"
                name="total_quoted_amount"
                value={form.total_quoted_amount}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && <p className="form-message form-message--error">{error}</p>}

          <div className="modal-actions">
            <button type="submit" className="save-btn" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateProjectForm;
