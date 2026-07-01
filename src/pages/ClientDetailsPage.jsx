import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { getClient } from '../api/clients';
import AddClientForm from '../components/AddClientForm';
import { formatCurrency, formatDate } from '../utils/format';
import { clientTypeLabel, statusBadgeClass, isB2BClient } from '../constants';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { usePageTitle } from '../hooks/usePageTitle';
import '../components/ProjectTable.css';

function profitClass(value) {
  if (value > 0) return 'profit-positive';
  if (value < 0) return 'profit-negative';
  return 'profit-zero';
}

function DetailValue({ children, multiline = false }) {
  if (!children || children === '—') {
    return <span className="detail-row-value">—</span>;
  }
  if (multiline) {
    return <span className="detail-row-value" style={{ whiteSpace: 'pre-wrap' }}>{children}</span>;
  }
  return <span className="detail-row-value">{children}</span>;
}

export default function ClientDetailsPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    return getClient(id).then(setClient).catch(() => setClient(null));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const projects = client?.projects ?? [];
    return projects.reduce(
      (acc, p) => ({
        received: acc.received + (Number(p.amount_received) || 0),
        expenses: acc.expenses + (Number(p.total_expenses) || 0),
        profit: acc.profit + (Number(p.profit) || 0),
      }),
      { received: 0, expenses: 0, profit: 0 },
    );
  }, [client]);

  const projects = client?.projects ?? [];
  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(projects);

  usePageTitle(client?.name || 'Client');

  function handleSaved() {
    setEditing(false);
    load();
  }

  if (!client) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading client overview…
        </div>
      </div>
    );
  }

  const account = client.customer_account;
  const showCompany = isB2BClient(client) && account;
  const tags = client.tags || [];

  return (
    <div className="page">
      <Link to="/clients" className="back-link">
        <ArrowLeft size={16} />
        Back to Clients
      </Link>

      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">{client.name}</h1>
          <p className="page-subtitle">
            {clientTypeLabel(client.client_type)}
            {account?.name ? ` · ${account.name}` : ''}
          </p>
        </div>
        <div className="page-header-actions">
          {!editing && (
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={16} />
              Edit
            </button>
          )}
        </div>
      </header>

      <div className="page-stack">
        {editing && (
          <AddClientForm
            client={client}
            onSaved={handleSaved}
            onCancel={() => setEditing(false)}
          />
        )}

        {!editing && (
          <>
            <div className="detail-grid">
              <div className="detail-card">
                <p className="detail-card-title">Contact</p>
                <div className="detail-row">
                  <span className="detail-row-label">Phone</span>
                  <DetailValue>{client.phone || '—'}</DetailValue>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Email</span>
                  <DetailValue>{client.email || '—'}</DetailValue>
                </div>
                {isB2BClient(client) && (
                  <div className="detail-row">
                    <span className="detail-row-label">Contact title</span>
                    <DetailValue>{client.contact_title || '—'}</DetailValue>
                  </div>
                )}
              </div>

              <div className="detail-card">
                <p className="detail-card-title">Location & address</p>
                <div className="detail-row">
                  <span className="detail-row-label">Location</span>
                  <DetailValue>{client.location || '—'}</DetailValue>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Address</span>
                  <DetailValue multiline>{client.address || '—'}</DetailValue>
                </div>
              </div>

              <div className="detail-card">
                <p className="detail-card-title">Client info</p>
                <div className="detail-row">
                  <span className="detail-row-label">Type</span>
                  <DetailValue>{clientTypeLabel(client.client_type)}</DetailValue>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Source</span>
                  <DetailValue>{client.source || '—'}</DetailValue>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Tags</span>
                  <span className="detail-row-value">
                    {tags.length > 0 ? (
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {tags.map((tag) => (
                          <span key={tag} className="status-badge status-badge--quotation-sent">{tag}</span>
                        ))}
                      </span>
                    ) : '—'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Member since</span>
                  <DetailValue>{formatDate(client.created_at)}</DetailValue>
                </div>
                {client.notes && (
                  <div className="detail-row">
                    <span className="detail-row-label">Notes</span>
                    <DetailValue multiline>{client.notes}</DetailValue>
                  </div>
                )}
              </div>

              {showCompany && (
                <div className="detail-card">
                  <p className="detail-card-title">Company</p>
                  <div className="detail-row">
                    <span className="detail-row-label">Name</span>
                    <DetailValue>{account.name || '—'}</DetailValue>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">Phone</span>
                    <DetailValue>{account.phone || '—'}</DetailValue>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">Email</span>
                    <DetailValue>{account.email || '—'}</DetailValue>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">Location</span>
                    <DetailValue>{account.location || '—'}</DetailValue>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">Address</span>
                    <DetailValue multiline>{account.address || '—'}</DetailValue>
                  </div>
                  {account.notes && (
                    <div className="detail-row">
                      <span className="detail-row-label">Notes</span>
                      <DetailValue multiline>{account.notes}</DetailValue>
                    </div>
                  )}
                </div>
              )}

              <div className="detail-card">
                <p className="detail-card-title">All projects summary</p>
                <div className="detail-row">
                  <span className="detail-row-label">Projects</span>
                  <span className="detail-row-value">{projects.length}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Received</span>
                  <span className="detail-row-value detail-row-value--success">{formatCurrency(totals.received)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Expenses</span>
                  <span className="detail-row-value">{formatCurrency(totals.expenses)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-row-label">Profit</span>
                  <span className={`detail-row-value${totals.profit > 0 ? ' detail-row-value--success' : totals.profit < 0 ? ' detail-row-value--pending' : ''}`}>
                    {formatCurrency(totals.profit)}
                  </span>
                </div>
              </div>
            </div>

            <h3 className="section-heading">Projects</h3>
            <div className="data-table-wrapper">
              <table className="data-table project-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Expenses</th>
                    <th>Profit</th>
                    <th>Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="data-table-empty">No projects linked to this client yet.</td>
                    </tr>
                  ) : (
                    pageItems.map((p) => (
                      <tr key={p.id}>
                        <td className="project-title-cell">
                          <Link to={`/projects/${p.id}`}>{p.project_title}</Link>
                        </td>
                        <td>
                          <span className={statusBadgeClass(p.status)}>{p.status}</span>
                        </td>
                        <td className="data-table-amount">{formatCurrency(p.amount_received)}</td>
                        <td className="data-table-amount">{formatCurrency(p.total_expenses)}</td>
                        <td className={`data-table-amount ${profitClass(p.profit ?? 0)}`}>
                          {formatCurrency(p.profit ?? 0)}
                        </td>
                        <td className="project-dates-cell">
                          <div className="project-dates-stack">
                            <span className="project-date-line">{formatDate(p.start_date)}</span>
                            <span className="project-date-line project-date-line--end">{formatDate(p.end_date)}</span>
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
          </>
        )}
      </div>
    </div>
  );
}
