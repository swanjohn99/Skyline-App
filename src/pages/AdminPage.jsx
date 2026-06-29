import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import {
  deleteAdminCompany,
  deleteAdminUser,
  listAdminCompanies,
  listAdminUsers,
  updateAdminUser,
} from '../api/admin';
import { setViewCompanyId } from '../apiClient';
import { useAuth } from '../context/auth';
import { ROLES } from '../constants';
import { formatDate } from '../utils/format';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { usePageTitle } from '../hooks/usePageTitle';

const ROLE_OPTIONS = [ROLES.MEMBER, ROLES.OWNER, ROLES.SUPER_ADMIN];

export default function AdminPage() {
  usePageTitle('Admin');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('companies');
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([listAdminCompanies(), listAdminUsers()])
      .then(([companyRows, userRows]) => {
        if (!active) return;
        setCompanies(companyRows);
        setUsers(userRows);
        setError('');
      })
      .catch((err) => { if (active) setError(err.message || 'Failed to load admin data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function reloadCompanies() {
    try {
      setCompanies(await listAdminCompanies());
    } catch (err) {
      setError(err.message);
    }
  }

  async function reloadUsers() {
    try {
      setUsers(await listAdminUsers());
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteCompany(company) {
    if (!window.confirm(`Delete "${company.name}" and all its data? This cannot be undone.`)) return;
    try {
      await deleteAdminCompany(company.id);
      await reloadCompanies();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteUser(target) {
    if (!window.confirm(`Delete user ${target.email}? This cannot be undone.`)) return;
    try {
      await deleteAdminUser(target.id);
      await reloadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUserRoleChange(target, role) {
    try {
      await updateAdminUser(target.id, { role });
      await reloadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUserActiveChange(target, isActive) {
    try {
      await updateAdminUser(target.id, { is_active: isActive });
      await reloadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleViewCompany(companyId) {
    setViewCompanyId(companyId);
    navigate('/');
    window.location.reload();
  }

  const companiesPagination = usePagination(companies);
  const usersPagination = usePagination(users);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">Manage all companies and users across the platform.</p>
        </div>
      </header>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab${tab === 'companies' ? ' admin-tab--active' : ''}`}
          onClick={() => setTab('companies')}
        >
          Companies
        </button>
        <button
          type="button"
          className={`admin-tab${tab === 'users' ? ' admin-tab--active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users
        </button>
      </div>

      {error && <p className="form-message form-message--error">{error}</p>}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading…</div>
      ) : tab === 'companies' ? (
        <>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Members</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr><td colSpan={4} className="data-table-empty">No companies yet.</td></tr>
              ) : (
                companiesPagination.pageItems.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.member_count ?? 0}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td className="data-table-actions">
                      <button type="button" className="btn-edit" onClick={() => handleViewCompany(c.id)}>
                        View data
                      </button>
                      <button type="button" className="btn-edit btn-edit--danger" onClick={() => handleDeleteCompany(c)}>
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={companiesPagination.page}
          totalPages={companiesPagination.totalPages}
          totalCount={companiesPagination.totalCount}
          onPageChange={companiesPagination.setPage}
          show={companiesPagination.showPagination}
        />
        </>
      ) : (
        <>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Company</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} className="data-table-empty">No users yet.</td></tr>
              ) : (
                usersPagination.pageItems.map((u) => {
                  const isSelf = u.id === user?.id;
                  return (
                    <tr key={u.id}>
                      <td>{u.email}{isSelf && ' (you)'}</td>
                      <td>{u.full_name || '—'}</td>
                      <td>{u.company_name || '—'}</td>
                      <td>
                        {isSelf ? (
                          <span className="role-badge">{u.role?.replace('_', ' ') || '—'}</span>
                        ) : (
                          <select
                            value={u.role || ROLES.MEMBER}
                            onChange={(e) => handleUserRoleChange(u, e.target.value)}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>{r.replace('_', ' ')}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${u.is_active ? 'status-badge--work-completed' : 'status-badge--rejected'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="data-table-actions">
                        {!isSelf && (
                          <>
                            <button
                              type="button"
                              className={u.is_active ? 'btn-edit btn-edit--danger' : 'btn-edit'}
                              onClick={() => handleUserActiveChange(u, !u.is_active)}
                            >
                              {u.is_active ? 'Revoke' : 'Grant'}
                            </button>
                            <button type="button" className="btn-edit btn-edit--danger" onClick={() => handleDeleteUser(u)}>
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={usersPagination.page}
          totalPages={usersPagination.totalPages}
          totalCount={usersPagination.totalCount}
          onPageChange={usersPagination.setPage}
          show={usersPagination.showPagination}
        />
        </>
      )}
    </div>
  );
}
