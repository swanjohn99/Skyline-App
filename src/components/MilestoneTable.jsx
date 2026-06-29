import { useEffect, useState } from 'react';
import { listMilestones, listMilestonesByProject, deleteMilestone } from '../api/milestones';
import { formatDate } from '../utils/format';
import { usePagination } from '../hooks/usePagination';
import TablePagination from './TablePagination';
import './ProjectTable.css';

export default function MilestoneTable({
  refreshKey,
  onEdit,
  onDeleted,
  projectId,
  hideProjectColumn = false,
}) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    const loader = projectId ? listMilestonesByProject(projectId) : listMilestones();
    loader
      .then((data) => { if (active) setMilestones(data); })
      .catch(() => { if (active) setMilestones([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey, projectId]);

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(milestones, undefined, refreshKey);

  async function handleDelete(item) {
    if (!window.confirm(`Delete milestone "${item.title}"?`)) return;
    setDeletingId(item.id);
    try {
      await deleteMilestone(item.id);
      onDeleted?.();
    } catch (err) {
      window.alert(err.message || 'Failed to delete milestone.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading milestones…
      </div>
    );
  }

  const colSpan = hideProjectColumn ? 4 : 6;

  return (
    <div>
      {!projectId && (
        <h3 className="project-table-section-title">All Milestones</h3>
      )}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Milestone</th>
              {!hideProjectColumn && <th>Project</th>}
              {!hideProjectColumn && <th>Client</th>}
              <th>Comments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {milestones.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table-empty">
                  No milestones yet.
                </td>
              </tr>
            ) : (
              pageItems.map((m) => (
                <tr key={m.id}>
                  <td>{formatDate(m.milestone_date)}</td>
                  <td>{m.title}</td>
                  {!hideProjectColumn && (
                    <td>{m.projects?.project_title || '—'}</td>
                  )}
                  {!hideProjectColumn && (
                    <td>{m.projects?.client_name || '—'}</td>
                  )}
                  <td>{m.comments || '—'}</td>
                  <td>
                    <div className="table-actions-stack">
                      <button type="button" className="btn-edit" onClick={() => onEdit?.(m)}>Edit</button>
                      <button
                        type="button"
                        className="btn-edit btn-edit--danger"
                        onClick={() => handleDelete(m)}
                        disabled={deletingId === m.id}
                      >
                        {deletingId === m.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
