import { useEffect, useState } from 'react';
import { createTask, updateTask } from '../api/tasks';
import { listLeads } from '../api/leads';
import { listProjects } from '../api/projects';
import { TASK_TYPES } from '../constants';
import DateInput from './DateInput';
import { todayInputValue } from '../utils/format';

const EMPTY = {
  title: '',
  task_type: 'client_call',
  due_date: todayInputValue(),
  notes: '',
  linkType: 'none',
  entity_id: '',
};

function taskToForm(task, defaultDueDate) {
  if (!task) {
    return { ...EMPTY, due_date: defaultDueDate || todayInputValue() };
  }
  const linkType = task.entity_type === 'lead'
    ? 'lead'
    : task.entity_type === 'project'
      ? 'project'
      : 'none';
  return {
    title: task.title || '',
    task_type: task.task_type || 'client_call',
    due_date: task.due_date ? String(task.due_date).split('T')[0] : todayInputValue(),
    notes: task.notes || '',
    linkType,
    entity_id: task.entity_id || '',
  };
}

export default function AddTaskForm({ task, defaultDueDate, onSaved, onCancel }) {
  const isEdit = Boolean(task?.id);
  const [form, setForm] = useState(() => taskToForm(task, defaultDueDate));
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(taskToForm(task, defaultDueDate));
  }, [task?.id, defaultDueDate]);

  useEffect(() => {
    listLeads().then(setLeads).catch(() => setLeads([]));
    listProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'linkType' && value === 'none' ? { entity_id: '' } : {}),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      task_type: form.task_type,
      due_date: form.due_date,
      notes: form.notes.trim() || null,
    };
    if (form.linkType === 'lead' && form.entity_id) {
      payload.entity_type = 'lead';
      payload.entity_id = form.entity_id;
    } else if (form.linkType === 'project' && form.entity_id) {
      payload.entity_type = 'project';
      payload.entity_id = form.entity_id;
    } else if (isEdit) {
      payload.entity_type = null;
      payload.entity_id = null;
    }
    try {
      if (isEdit) {
        await updateTask(task.id, payload);
      } else {
        await createTask(payload);
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h3 className="form-card-title">{isEdit ? 'Edit task' : 'Add task'}</h3>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
          <label>Title</label>
          <input name="title" value={form.title} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label>Due date</label>
          <DateInput name="due_date" value={form.due_date} onChange={handleChange} required />
        </div>
        <div className="form-field">
          <label>Type</label>
          <select name="task_type" value={form.task_type} onChange={handleChange}>
            {TASK_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label>Link to</label>
          <select name="linkType" value={form.linkType} onChange={handleChange}>
            <option value="none">None</option>
            <option value="lead">Lead</option>
            <option value="project">Project</option>
          </select>
        </div>
        {form.linkType === 'lead' && (
          <div className="form-field">
            <label>Lead</label>
            <select name="entity_id" value={form.entity_id} onChange={handleChange}>
              <option value="">Choose lead…</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.display_name}</option>
              ))}
            </select>
          </div>
        )}
        {form.linkType === 'project' && (
          <div className="form-field">
            <label>Project</label>
            <select name="entity_id" value={form.entity_id} onChange={handleChange}>
              <option value="">Choose project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_title}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
          <label>Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : (isEdit ? 'Save changes' : 'Add task')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
      {error && <p className="form-message form-message--error">{error}</p>}
    </form>
  );
}
