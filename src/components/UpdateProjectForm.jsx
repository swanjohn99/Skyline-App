import { useState } from 'react';
import { updateProject } from '../api/projects';
import { PROJECT_STATUSES, COMPLETED_STATUSES } from '../constants';
import { toDateInputValue } from '../utils/format';
import AddPaymentForm from './AddPaymentForm';
import './UpdateProjectForm.css';

function UpdateProjectForm({ project, onUpdate, onClose }) {
  const [form, setForm] = useState({
    status: project.status || '',
    completion_percent: project.completion_percent || 0,
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    total_quoted_amount: project.total_quoted_amount || 0
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isCompleted = project.status?.toLowerCase().trim() === 'completed';

  async function handleUpdate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const canHaveEndDate = COMPLETED_STATUSES.includes(form.status);
    const finalEndDate = canHaveEndDate ? form.end_date : null;

    try {
      await updateProject(project.id, {
        status: form.status,
        completion_percent: Number(form.completion_percent),
        start_date: form.start_date || null,
        end_date: finalEndDate,
        total_quoted_amount: Number(form.total_quoted_amount),
      });
      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const formatDateForInput = toDateInputValue;

  return (
    <div className="skyline-modal-overlay">
      <div className="skyline-modal-content">
        <div className="modal-header">
          <h2>Update Project</h2>
          <span className="project-title-display">{project.project_title}</span>
          <button className="close-x" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleUpdate} className="skyline-update-form">
          <div className="form-group full-width">
            <label>Current Status</label>
            <select 
              value={form.status} 
              onChange={(e) => setForm({...form, status: e.target.value})}
              required
            >
              {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {['work started', ...COMPLETED_STATUSES].includes(form.status) && (
            <div className="form-group half-width">
              <label>Completion (%)</label>
              <input 
                type="number" 
                min="0" max="100" 
                value={form.completion_percent} 
                onChange={(e) => setForm({...form, completion_percent: e.target.value})} 
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group half-width">
              <label>Start Date</label>
              <input 
                type="date" 
                value={formatDateForInput(form.start_date)} 
                onChange={(e) => setForm({...form, start_date: e.target.value})} 
              />
            </div>
            
            {COMPLETED_STATUSES.includes(form.status) && (
              <div className="form-group half-width">
                <label>End Date</label>
                <input 
                  type="date" 
                  value={formatDateForInput(form.end_date)} 
                  onChange={(e) => setForm({...form, end_date: e.target.value})} 
                />
              </div>
            )}
          </div>

          <div className="form-group half-width">
            <label>Total Quoted Amount (INR)</label>
            <input 
              type="number" 
              step="0.01" 
              value={form.total_quoted_amount} 
              onChange={(e) => setForm({...form, total_quoted_amount: e.target.value})} 
            />
          </div>

          {!isCompleted && (
            <div className="form-section-divider">
              <p className="form-section-label">Record Payment</p>
              <AddPaymentForm
                defaultProjectId={project.id}
                onPaymentAdded={onUpdate}
              />
            </div>
          )}
          
          {error && <p className="form-message form-message--error">{error}</p>}

          <div className="modal-actions">
            <button type="submit" className="save-btn" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
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
