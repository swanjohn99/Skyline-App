import { useCallback, useEffect, useState } from 'react';
import { listAuditLogs } from '../api/documents';
import { formatDate } from '../utils/format';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { usePageTitle } from '../hooks/usePageTitle';

export default function AuditLogPage() {
  usePageTitle('Audit Log');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    return listAuditLogs({ limit: 200 })
      .then((data) => { setLogs(data); setError(''); })
      .catch((err) => setError(err.message || 'Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(logs, undefined, logs.length);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Track changes across your workspace.</p>
        </div>
      </header>

      {error && <p className="form-message form-message--error">{error}</p>}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading audit log…</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Table</th>
                  <th>Action</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="data-table-empty">No audit entries yet.</td></tr>
                ) : (
                  pageItems.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDate(log.created_at)}</td>
                      <td>{log.user_email || '—'}</td>
                      <td>{log.table_name}</td>
                      <td>{log.action}</td>
                      <td className="data-table-muted">{log.record_id}</td>
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
        </>
      )}
    </div>
  );
}
