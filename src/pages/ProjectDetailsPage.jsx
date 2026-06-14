import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft } from 'lucide-react';

function getStatusClass(status) {
  const normalized = status?.toLowerCase().trim() ?? '';
  if (normalized.includes('site visit')) return 'status-badge status-badge--site-visit';
  if (normalized === 'quotation sent') return 'status-badge status-badge--quotation';
  if (normalized === 'work started') return 'status-badge status-badge--work-started';
  if (normalized === 'work ended') return 'status-badge status-badge--work-ended';
  if (normalized === 'rejected') return 'status-badge status-badge--rejected';
  return 'status-badge status-badge--default';
}

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data: projData } = await supabase.from('projects').select('*').eq('id', id).single();
      setProject(projData);

      const { data: expData } = await supabase.from('expenses').select('*').eq('project_id', id);
      setExpenses(expData || []);
    }
    fetchData();
  }, [id]);

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

      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 className="page-title">{project.project_title}</h1>
          <span className={getStatusClass(project.status)}>{project.status}</span>
        </div>
        {project.client_name && (
          <p className="page-subtitle">{project.client_name}{project.location ? ` · ${project.location}` : ''}</p>
        )}
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
            <span className="detail-row-value">${Number(project.total_quoted_amount || 0).toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Received</span>
            <span className="detail-row-value detail-row-value--success">${Number(project.amount_received || 0).toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Pending</span>
            <span className={`detail-row-value${pending > 0 ? ' detail-row-value--pending' : ' detail-row-value--success'}`}>
              ${pending.toLocaleString()}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Total Expenses</span>
            <span className="detail-row-value">${totalExpenses.toLocaleString()}</span>
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
                  <td>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  <td className="data-table-amount">${Number(exp.amount).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
