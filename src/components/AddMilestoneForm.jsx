import { useState, useEffect } from 'react';
import { listOpenProjects, listProjects } from '../api/projects';
import { createMilestone, updateMilestone } from '../api/milestones';
import { projectSelectLabel } from '../constants';
import { todayInputValue, toDateInputValue } from '../utils/format';
import DateInput from './DateInput';

const EMPTY = {
  project_id: '',
  title: '',
  milestone_date: todayInputValue(),
  comments: '',
};

function toFormState(record) {
  if (!record) return EMPTY;
  return {
    project_id: record.project_id || '',
    title: record.title || '',
    milestone_date: toDateInputValue(record.milestone_date) || todayInputValue(),
    comments: record.comments || '',
  };
}

export default function AddMilestoneForm({
  milestone,
  onMilestoneAdded,
  defaultProjectId,
  onCancel,
}) {
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(() => ({
    ...toFormState(milestone),
    project_id: milestone?.project_id || defaultProjectId || '',
  }));

  const isEdit = Boolean(milestone);
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
      title: form.title.trim(),
      milestone_date: form.milestone_date,
      comments: form.comments.trim() || null,
    };

    try {
      if (isEdit) {
        await updateMilestone(milestone.id, payload);
      } else {
        await createMilestone(payload);
      }
      onMilestoneAdded?.();
      if (!isEdit && !defaultProjectId) {
        setForm({ ...EMPTY, milestone_date: todayInputValue() });
      } else if (!isEdit && defaultProjectId) {
        setForm((prev) => ({
          ...prev,
          title: '',
          comments: '',
          milestone_date: todayInputValue(),
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
          <h3 className="form-card-title">{isEdit ? 'Edit Milestone' : 'Add Milestone'}</h3>
          <p className="form-card-subtitle">Track a project milestone with date and notes.</p>
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
                <option key={p.id} value={p.id}>
                  {projectSelectLabel(p)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-field">
          <label>Milestone</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Foundation complete"
          />
        </div>

        <div className="form-field">
          <label>Date</label>
          <DateInput
            required
            value={form.milestone_date}
            onChange={(e) => setForm({ ...form, milestone_date: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Comments</label>
          <textarea
            value={form.comments}
            onChange={(e) => setForm({ ...form, comments: e.target.value })}
            placeholder="Optional notes…"
            rows={3}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Milestone')}
        </button>
        {!isCompact && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        {error && <span className="form-message form-message--error">{error}</span>}
      </div>
    </form>
  );
}
