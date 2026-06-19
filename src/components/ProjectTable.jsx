import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Columns3 } from 'lucide-react';
import { listProjects } from '../api/projects';
import { formatCurrency, formatDate } from '../utils/format';
import { statusBadgeClass } from '../constants';
import './ProjectTable.css';

const COLUMN_OPTIONS = [
  { key: 'client', label: 'Client' },
  { key: 'location', label: 'Location' },
  { key: 'total', label: 'Total' },
  { key: 'received', label: 'Received' },
  { key: 'pending', label: 'Pending' },
  { key: 'dates', label: 'Dates' },
  { key: 'status', label: 'Status' },
];

const DEFAULT_VISIBLE_COLUMNS = Object.fromEntries(
  COLUMN_OPTIONS.map(({ key }) => [key, true])
);

function ProjectTable({ refreshKey, onEdit }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const savedColumns = JSON.parse(localStorage.getItem('skyline-project-columns'));
      return { ...DEFAULT_VISIBLE_COLUMNS, ...savedColumns };
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  function toggleColumn(column) {
    setVisibleColumns((current) => {
      const next = { ...current, [column]: !current[column] };
      localStorage.setItem('skyline-project-columns', JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    let active = true;
    listProjects()
      .then((data) => { if (active) setProjects(data); })
      .catch((err) => console.error('Error fetching projects:', err))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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

  const visibleColumnCount = 2 + Object.values(visibleColumns).filter(Boolean).length;

  return (
    <div className="project-table-container">
      <div className="project-table-toolbar">
        <h3 className="project-table-section-title">All Projects</h3>
        <details className="column-picker">
          <summary>
            <Columns3 size={16} />
            Columns
          </summary>
          <div className="column-picker-menu">
            {COLUMN_OPTIONS.map(({ key, label }) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={visibleColumns[key]}
                  onChange={() => toggleColumn(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </details>
      </div>
      <div className="project-table-wrapper">
        <table className="project-table">
          <thead>
            <tr>
              <th>Title</th>
              {visibleColumns.client && <th>Client</th>}
              {visibleColumns.location && <th>Location</th>}
              {visibleColumns.total && <th>Total</th>}
              {visibleColumns.received && <th>Received</th>}
              {visibleColumns.pending && <th>Pending</th>}
              {visibleColumns.dates && <th>Dates</th>}
              {visibleColumns.status && <th>Status</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount} className="data-table-empty">No projects yet. Add your first project to get started.</td>
              </tr>
            ) : (
              projects.map((p) => {
                const pending = (p.total_quoted_amount || 0) - (p.amount_received || 0);
                const isCompleted = (p.status ?? '').toLowerCase().trim() === 'completed';
                return (
                  <tr key={p.id} className={isCompleted ? 'project-row--completed' : undefined}>
                    <td className="project-title-cell">
                      <Link to={`/projects/${p.id}`}>{p.project_title}</Link>
                    </td>
                    {visibleColumns.client && <td className="project-client-cell">{p.client_name}</td>}
                    {visibleColumns.location && <td>{p.location || '—'}</td>}
                    {visibleColumns.total && <td>{formatCurrency(p.total_quoted_amount)}</td>}
                    {visibleColumns.received && <td>{formatCurrency(p.amount_received)}</td>}
                    {visibleColumns.pending && (
                      <td className={pending > 0 ? 'pending-positive' : 'pending-zero'}>
                        {formatCurrency(pending)}
                      </td>
                    )}
                    {visibleColumns.dates && (
                      <td className="project-dates-cell">
                        {formatDate(p.start_date)} – {formatDate(p.end_date)}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td>
                        <span className={statusBadgeClass(p.status)}>{p.status}</span>
                      </td>
                    )}
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
