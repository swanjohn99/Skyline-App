import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowRightLeft } from 'lucide-react';
import AddLeadForm from '../components/AddLeadForm';
import { listLeads, convertLead, deleteLead } from '../api/leads';
import { leadStatusBadgeClass, leadStatusLabel } from '../constants';
import { formatCurrency } from '../utils/format';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { usePageTitle } from '../hooks/usePageTitle';
import '../components/ProjectTable.css';

export default function LeadsPage() {
  usePageTitle('Leads');
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [convertingId, setConvertingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    return listLeads()
      .then((data) => { setLeads(data); setError(''); })
      .catch((err) => setError(err.message || 'Failed to load leads.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved() {
    setShowForm(false);
    setEditing(null);
    load();
  }

  async function handleConvert(lead) {
    if (!window.confirm(`Convert "${lead.display_name}" to a project?`)) return;
    setConvertingId(lead.id);
    try {
      const result = await convertLead(lead.id);
      await load();
      if (result?.project_id) navigate(`/projects/${result.project_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setConvertingId(null);
    }
  }

  async function handleDelete(lead) {
    if (!window.confirm(`Delete lead "${lead.display_name}"? This cannot be undone.`)) return;
    setDeletingId(lead.id);
    try {
      await deleteLead(lead.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(leads, undefined, leads.length);

  const isFormOpen = showForm || editing;

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Track inquiries from first contact to conversion.</p>
        </div>
        {!isFormOpen && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={17} />
            Add Lead
          </button>
        )}
      </header>

      {error && <p className="form-message form-message--error">{error}</p>}

      <div className="page-stack">
        {showForm && (
          <AddLeadForm
            onSaved={handleSaved}
            onCancel={() => setShowForm(false)}
          />
        )}
        {editing && (
          <AddLeadForm
            lead={editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        )}

        <div className="project-table-container">
          <div className="project-table-toolbar">
            <h3 className="project-table-section-title">All Leads</h3>
          </div>

          {loading ? (
            <div className="loading-state"><div className="loading-spinner" />Loading leads…</div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Project name</th>
                      <th>Client</th>
                      <th>Est. value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 ? (
                      <tr><td colSpan={5} className="data-table-empty">No leads yet.</td></tr>
                    ) : (
                      pageItems.map((lead) => {
                        const canConvert = lead.status !== 'converted' && lead.status !== 'lost';
                        return (
                          <tr key={lead.id}>
                            <td>
                              <span className={leadStatusBadgeClass(lead.status)}>
                                {leadStatusLabel(lead.status)}
                              </span>
                            </td>
                            <td>
                              <Link to={`/leads/${lead.id}`}>{lead.project_title || '—'}</Link>
                            </td>
                            <td>
                              {lead.client ? (
                                <Link to={`/clients/${lead.client.id}`}>{lead.client.name}</Link>
                              ) : '—'}
                            </td>
                            <td className="data-table-amount">{formatCurrency(lead.estimated_value)}</td>
                            <td className="data-table-actions">
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <div className="table-actions-stack">
                                  <button type="button" className="btn-edit" onClick={() => setEditing(lead)}>Edit</button>
                                  <button
                                    type="button"
                                    className="btn-edit btn-edit--danger"
                                    disabled={deletingId === lead.id}
                                    onClick={() => handleDelete(lead)}
                                  >
                                    {deletingId === lead.id ? '…' : 'Delete'}
                                  </button>
                                </div>
                                {canConvert && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={convertingId === lead.id}
                                    onClick={() => handleConvert(lead)}
                                  >
                                    <ArrowRightLeft size={14} />
                                    {convertingId === lead.id ? 'Converting…' : 'Convert'}
                                  </button>
                                )}
                                {lead.status === 'converted' && lead.converted_project_id && (
                                  <Link to={`/projects/${lead.converted_project_id}`} className="btn btn-secondary btn-sm">
                                    View project
                                  </Link>
                                )}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
