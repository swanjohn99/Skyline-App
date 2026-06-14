import { useState } from 'react';
import { supabase } from '../supabaseClient';
import './AddProjectForm.css';

const STATUS_OPTIONS = [
  'site visit requested',
  'site visit done',
  'quotation sent',
  'work started',
  'work completed',
  'Completed',
  'rejected',
];

const INITIAL_FORM = {
  project_title: '',
  client_name: '',
  location: '',
  work_description: '',
  total_quoted_amount: 0,
  amount_received: 0,
  status: 'site visit requested',
  start_date: '',
  end_date: '',
  completion_percent: 0,
};

function AddProjectForm({ onProjectAdded, onCancel }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  function handleChange(event) {
    const { name, value, type } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
    setSuccess(false);
    setError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const completionPercent = ['work completed', 'Completed'].includes(form.status)
      ? 100
      : form.completion_percent;

    const { error: insertError } = await supabase.from('projects').insert({
      project_title: form.project_title,
      client_name: form.client_name,
      location: form.location,
      work_description: form.work_description,
      total_quoted_amount: form.total_quoted_amount,
      amount_received: form.amount_received,
      status: form.status,
      completion_percent: completionPercent,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });

    setSubmitting(false);

    if (insertError) {
      console.error('Error adding project:', insertError);
      setError(insertError.message);
      return;
    }

    setForm(INITIAL_FORM);
    setSuccess(true);
    onProjectAdded?.();
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
            <label>Client Name</label>
            <input name="client_name" value={form.client_name} onChange={handleChange} required />
          </div>
          <div className="add-project-form-field">
            <label>Location</label>
            <input name="location" value={form.location} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>Total Amount (INR)</label>
            <input name="total_quoted_amount" type="number" value={form.total_quoted_amount} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>Amount Received (INR)</label>
            <input name="amount_received" type="number" value={form.amount_received} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>Status</label>
            <select name="status" value={form.status} onChange={handleChange} required>
              {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="add-project-form-field">
            <label>Start Date</label>
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>End Date</label>
            <input name="end_date" type="date" value={form.end_date} onChange={handleChange} />
          </div>
          <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Work Description</label>
            <textarea name="work_description" value={form.work_description} onChange={handleChange} />
          </div>
        </div>

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
