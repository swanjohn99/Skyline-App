import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import './ProjectTable.css';

function getStatusClass(status) {
  const normalized = status?.toLowerCase().trim() ?? '';
  if (normalized.includes('site visit')) return 'status-badge status-badge--site-visit';
  if (normalized === 'quotation sent') return 'status-badge status-badge--quotation';
  if (normalized === 'work started') return 'status-badge status-badge--work-started';
  if (normalized === 'work ended') return 'status-badge status-badge--work-ended';
  if (normalized === 'rejected') return 'status-badge status-badge--rejected';
  return 'status-badge status-badge--default';
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ProjectTable({ refreshKey, onEdit }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) console.error('Error fetching projects:', error);
      else setProjects(data ?? []);
      setLoading(false);
    }
    fetchProjects();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="project-table-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading projects…
        </div>
      </div>
    );
  }

  return (
    <div className="project-table-container">
      <h3 className="project-table-section-title">All Projects</h3>
      <div className="project-table-wrapper">
        <table className="project-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Title</th>
              <th>Client</th>
              <th>Location</th>
              <th>Total</th>
              <th>Received</th>
              <th>Pending</th>
              <th>Dates</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={9} className="data-table-empty">No projects yet. Create one above.</td>
              </tr>
            ) : (
              projects.map((p) => {
                const pending = (p.total_quoted_amount || 0) - (p.amount_received || 0);
                return (
                  <tr key={p.id}>
                    <td>
                      <span className={getStatusClass(p.status)}>{p.status}</span>
                    </td>
                    <td>
                      <Link to={`/projects/${p.id}`}>{p.project_title}</Link>
                    </td>
                    <td>{p.client_name}</td>
                    <td>{p.location || '—'}</td>
                    <td>${Number(p.total_quoted_amount || 0).toLocaleString()}</td>
                    <td>${Number(p.amount_received || 0).toLocaleString()}</td>
                    <td className={pending > 0 ? 'pending-positive' : 'pending-zero'}>
                      ${pending.toLocaleString()}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                      {formatDate(p.start_date)} – {formatDate(p.end_date)}
                    </td>
                    <td>
                      <button type="button" className="btn-edit" onClick={() => onEdit(p)}>Edit</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProjectTable;
