import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import AddClientForm from '../components/AddClientForm';
import { listClients, deleteClient } from '../api/clients';
import { clientTypeLabel, isB2BClient } from '../constants';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { usePageTitle } from '../hooks/usePageTitle';

function clientPhoneList(phone) {
  return (phone || '').split(',').map((p) => p.trim()).filter(Boolean);
}

export default function ClientsPage() {
  usePageTitle('Clients');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    return listClients()
      .then((data) => { setClients(data); setError(''); })
      .catch((err) => setError(err.message || 'Failed to load clients.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved() {
    setShowForm(false);
    setEditing(null);
    load();
  }

  async function handleDelete(client) {
    if (!window.confirm(`Delete ${client.name}? This cannot be undone.`)) return;
    try {
      await deleteClient(client.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.email, c.phone, c.location, c.source, c.customer_account?.name, clientTypeLabel(c.client_type), (c.tags || []).join(' ')]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [clients, query]);

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(filtered, undefined, `${query}-${clients.length}`);

  const isFormOpen = showForm || editing;

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Your CRM. Store contacts and segment them for marketing.</p>
        </div>
        {!isFormOpen && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={17} />
            Add Client
          </button>
        )}
      </header>

      {error && <p className="form-message form-message--error">{error}</p>}

      <div className="page-stack">
        {isFormOpen && (
          <AddClientForm
            client={editing}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}

        <div className="project-table-container">
          <div className="project-table-toolbar">
            <h3 className="project-table-section-title">All Clients</h3>
            <div className="search-input">
              <Search size={16} />
              <input
                type="search"
                placeholder="Search name, phone, tag…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-state"><div className="loading-spinner" />Loading clients…</div>
          ) : (
            <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Location</th>
                    <th>Source</th>
                    <th>Tags</th>
                    <th className="data-table-col--actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="data-table-empty">No clients found.</td></tr>
                  ) : (
                    pageItems.map((c) => {
                      const phones = clientPhoneList(c.phone);
                      return (
                      <tr key={c.id}>
                        <td className="project-client-cell">
                          <Link to={`/clients/${c.id}`}>{c.name}</Link>
                          {isB2BClient(c) && c.contact_title && (
                            <span className="data-table-muted"> · {c.contact_title}</span>
                          )}
                        </td>
                        <td>{clientTypeLabel(c.client_type)}</td>
                        <td>{c.customer_account?.name || '—'}</td>
                        <td>
                          {phones.length ? (
                            <div className="project-dates-stack">
                              {phones.map((p, i) => (
                                <span key={`${p}-${i}`} className="project-date-line">{p}</span>
                              ))}
                            </div>
                          ) : '—'}
                        </td>
                        <td>{c.email || '—'}</td>
                        <td>{c.location || '—'}</td>
                        <td>{c.source || '—'}</td>
                        <td>
                          {(c.tags || []).length ? (
                            <div className="project-dates-stack">
                              {c.tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="data-table-col--actions">
                          <div className="table-actions-stack">
                            <button type="button" className="btn-edit" onClick={() => setEditing(c)}>Edit</button>
                            <button type="button" className="btn-edit btn-edit--danger" onClick={() => handleDelete(c)}>Delete</button>
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
