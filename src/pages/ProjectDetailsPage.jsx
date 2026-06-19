import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { getProject } from '../api/projects';
import { listExpensesByProject } from '../api/expenses';
import UpdateProjectForm from '../components/UpdateProjectForm';
import { formatCurrency, formatDate } from '../utils/format';
import { statusBadgeClass } from '../constants';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [editing, setEditing] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    getProject(id).then(setProject).catch(() => setProject(null));
    listExpensesByProject(id).then(setExpenses).catch(() => setExpenses([]));
  }, [id, refresh]);

  function handleUpdated() {
    setRefresh((n) => n + 1);
  }

  if (!project) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading project details…
        </div>
      </div>
    );
  }

  const pending = (project.total_quoted_amount || 0) - (project.amount_received || 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  return (
    <div className="page">
      <Link to="/projects" className="back-link">
        <ArrowLeft size={16} />
        Back to Projects
      </Link>

      <header className="page-header page-header--actions">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="page-title">{project.project_title}</h1>
            <span className={statusBadgeClass(project.status)}>{project.status}</span>
          </div>
          {project.client_name && (
            <p className="page-subtitle">{project.client_name}{project.location ? ` · ${project.location}` : ''}</p>
          )}
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
          <Pencil size={16} />
          Edit
        </button>
      </header>

      <div className="detail-grid">
        <div className="detail-card">
          <p className="detail-card-title">Project Details</p>
          <div className="detail-row">
            <span className="detail-row-label">Client</span>
            <span className="detail-row-value">{project.client_name || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Location</span>
            <span className="detail-row-value">{project.location || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Completion</span>
            <span className="detail-row-value">{project.completion_percent ?? 0}%</span>
          </div>
          {project.work_description && (
            <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="detail-row-label">Description</span>
              <span className="detail-row-value" style={{ fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.5 }}>{project.work_description}</span>
            </div>
          )}
        </div>

        <div className="detail-card">
          <p className="detail-card-title">Financials</p>
          <div className="detail-row">
            <span className="detail-row-label">Total Quoted</span>
            <span className="detail-row-value">{formatCurrency(project.total_quoted_amount)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Received</span>
            <span className="detail-row-value detail-row-value--success">{formatCurrency(project.amount_received)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Pending</span>
            <span className={`detail-row-value${pending > 0 ? ' detail-row-value--pending' : ' detail-row-value--success'}`}>
              {formatCurrency(pending)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Total Expenses</span>
            <span className="detail-row-value">{formatCurrency(totalExpenses)}</span>
          </div>
        </div>
      </div>

      <h3 className="section-heading">Expenses</h3>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Date</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={3} className="data-table-empty">No expenses recorded for this project.</td>
              </tr>
            ) : (
              expenses.map(exp => (
                <tr key={exp.id}>
                  <td>{exp.description || '—'}</td>
                  <td>{formatDate(exp.expense_date)}</td>
                  <td className="data-table-amount">{formatCurrency(exp.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <UpdateProjectForm
          project={project}
          onUpdate={handleUpdated}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
