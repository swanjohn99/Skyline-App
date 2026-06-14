import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AddExpenseForm({ onExpenseAdded, onCancel }) {
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [expense, setExpense] = useState({
    project_id: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('id, project_title, status');

      if (data) {
        setProjects(data.filter((project) => {
          const status = project.status?.toLowerCase().trim();
          return status !== 'completed';
        }));
      }
    }
    fetchProjects();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from('expenses').insert({
      project_id: expense.project_id,
      amount: Number(expense.amount),
      description: expense.description,
      expense_date: expense.date
    });

    if (!error) {
      setExpense({
        project_id: '',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      onExpenseAdded?.();
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h3 className="form-card-title">Log New Expense</h3>
      <p className="form-card-subtitle">Record a project-related expense.</p>

      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="form-field">
          <label>Project</label>
          <select
            required
            value={expense.project_id}
            onChange={(e) => setExpense({ ...expense, project_id: e.target.value })}
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_title}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Amount (INR)</label>
          <input
            type="number"
            required
            value={expense.amount}
            onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Description</label>
          <input
            type="text"
            value={expense.description}
            onChange={(e) => setExpense({ ...expense, description: e.target.value })}
            placeholder="What was this expense for?"
          />
        </div>

        <div className="form-field">
          <label>Expense Date</label>
          <input
            type="date"
            required
            value={expense.date}
            onChange={(e) => setExpense({ ...expense, date: e.target.value })}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Adding…' : 'Add Expense'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default AddExpenseForm;
