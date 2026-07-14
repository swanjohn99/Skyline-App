import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Columns3 } from 'lucide-react';
import { listProjects, deleteProject } from '../api/projects';
import { formatCurrency, formatDate } from '../utils/format';
import { statusBadgeClass } from '../constants';
import { projectPending, hasQuotedTotal } from '../utils/projectFinance';
import { usePagination } from '../hooks/usePagination';
import TablePagination from './TablePagination';

const COLUMN_OPTIONS = [
  { key: 'client', label: 'Client' },
  { key: 'location', label: 'Location' },
  { key: 'total', label: 'Total' },
  { key: 'received', label: 'Received' },
  { key: 'pending', label: 'Pending' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'profit', label: 'Profit' },
  { key: 'dates', label: 'Dates' },
  { key: 'status', label: 'Status' },
];

const DEFAULT_VISIBLE_COLUMNS = Object.fromEntries(
  COLUMN_OPTIONS.map(({ key }) => [key, true])
);

function ProjectTable({ refreshKey, onEdit, onDeleted }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
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

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(projects, undefined, refreshKey);

  async function handleDelete(project) {
    if (!window.confirm(`Delete "${project.project_title}"? Expenses and payments for this project will also be removed.`)) {
      return;
    }
    setDeletingId(project.id);
    try {
      await deleteProject(project.id);
      onDeleted?.();
    } catch (err) {
      console.error('Error deleting project:', err);
      window.alert(err.message || 'Failed to delete project.');
    } finally {
      setDeletingId(null);
    }
  }

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

  function profitClass(value) {
    if (value > 0) return 'profit-positive';
    if (value < 0) return 'profit-negative';
    return 'profit-zero';
  }

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
              {visibleColumns.expenses && <th>Expenses</th>}
              {visibleColumns.profit && <th>Profit</th>}
              {visibleColumns.dates && <th className="data-table-col--date">Dates</th>}
              {visibleColumns.status && <th>Status</th>}
              <th className="data-table-col--actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={visibleColumnCount} className="data-table-empty">No projects yet. Add your first project to get started.</td>
              </tr>
            ) : (
              pageItems.map((p) => {
                const pending = projectPending(p);
                const isCompleted = (p.status ?? '').toLowerCase().trim() === 'completed';
                return (
                  <tr key={p.id} className={isCompleted ? 'project-row--completed' : undefined}>
                    <td className="project-title-cell">
                      <Link to={`/projects/${p.id}`}>{p.project_title}</Link>
                    </td>
                    {visibleColumns.client && <td className="project-client-cell">{p.client_name}</td>}
                    {visibleColumns.location && <td>{p.location || '—'}</td>}
                    {visibleColumns.total && (
                      <td>{hasQuotedTotal(p.total_quoted_amount) ? formatCurrency(p.total_quoted_amount) : '—'}</td>
                    )}
                    {visibleColumns.received && <td>{formatCurrency(p.amount_received)}</td>}
                    {visibleColumns.pending && (
                      <td className={pending != null && pending > 0 ? 'pending-positive' : 'pending-zero'}>
                        {pending != null ? formatCurrency(pending) : '—'}
                      </td>
                    )}
                    {visibleColumns.expenses && (
                      <td>{formatCurrency(p.total_expenses)}</td>
                    )}
                    {visibleColumns.profit && (
                      <td className={profitClass(p.profit ?? 0)}>
                        {formatCurrency(p.profit ?? 0)}
                      </td>
                    )}
                    {visibleColumns.dates && (
                      <td className="project-dates-cell data-table-col--date">
                        <div className="project-dates-stack">
                          <span className="project-date-line">{formatDate(p.start_date)}</span>
                          <span className="project-date-line project-date-line--end">{formatDate(p.end_date)}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td>
                        <span className={statusBadgeClass(p.status)}>{p.status}</span>
                      </td>
                    )}
                    <td className="data-table-col--actions">
                      <div className="table-actions-stack">
                        <button type="button" className="btn-edit" onClick={() => onEdit(p)}>Edit</button>
                        <button
                          type="button"
                          className="btn-edit btn-edit--danger"
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                        >
                          {deletingId === p.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        show={showPagination}
      />
    </div>
  );
}

export default ProjectTable;
