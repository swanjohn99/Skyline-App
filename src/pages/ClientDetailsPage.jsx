import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getClient } from '../api/clients';
import { formatCurrency, formatDate } from '../utils/format';
import { clientTypeLabel, statusBadgeClass } from '../constants';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { usePageTitle } from '../hooks/usePageTitle';
import '../components/ProjectTable.css';

function profitClass(value) {
  if (value > 0) return 'profit-positive';
  if (value < 0) return 'profit-negative';
  return 'profit-zero';
}

export default function ClientDetailsPage() {
  const { id } = useParams();
  const [client, setClient] = useState(null);

  useEffect(() => {
    getClient(id).then(setClient).catch(() => setClient(null));
  }, [id]);

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

  return (
    <div className="page">
      <Link to="/clients" className="back-link">
        <ArrowLeft size={16} />
        Back to Clients
      </Link>

      <header className="page-header">
        <div>
          <h1 className="page-title">{client.name}</h1>
          <p className="page-subtitle">
            {clientTypeLabel(client.client_type)}
            {client.customer_account?.name ? ` · ${client.customer_account.name}` : ''}
            {client.location ? ` · ${client.location}` : ''}
          </p>
        </div>
      </header>

      <div className="detail-grid">
        <div className="detail-card">
          <p className="detail-card-title">Contact</p>
          <div className="detail-row">
            <span className="detail-row-label">Phone</span>
            <span className="detail-row-value">{client.phone || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Email</span>
            <span className="detail-row-value">{client.email || '—'}</span>
          </div>
        </div>

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
    </div>
  );
}
