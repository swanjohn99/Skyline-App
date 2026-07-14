import { useEffect, useState, useCallback } from 'react';
import { listMembers, setMemberActive, setMemberRole } from '../api/profiles';
import CompanyBrandingCard from '../components/CompanyBrandingCard';
import { useAuth } from '../context/auth';
import { ROLES } from '../constants';
import { formatDate } from '../utils/format';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { usePageTitle } from '../hooks/usePageTitle';

const ROLE_OPTIONS = [ROLES.MEMBER, ROLES.OWNER];

export default function TeamPage() {
  usePageTitle('Team');
  const { user, isSuperAdmin, companyName } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    return listMembers()
      .then((data) => { setMembers(data); setError(''); })
      .catch((err) => setError(err.message || 'Failed to load members.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(members);

  async function handleToggleActive(member) {
    try {
      await setMemberActive(member.id, !member.is_active);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRoleChange(member, role) {
    try {
      await setMemberRole(member.id, role);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">
            Team{companyName ? ` — ${companyName}` : isSuperAdmin ? ' — All companies' : ''}
          </h1>
          <p className="page-subtitle">Manage who can access your company's data. Revoke access anytime.</p>
        </div>
      </header>

      {error && <p className="form-message form-message--error">{error}</p>}

      <CompanyBrandingCard />

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading members…</div>
      ) : (
        <>
          <div className="data-table-wrapper">
            <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="data-table-col--date">Joined</th>
                <th className="data-table-col--actions">Access</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={6} className="data-table-empty">No members yet.</td></tr>
              ) : (
                pageItems.map((m) => {
                  const isSelf = m.id === user?.id;
                  const isProtected = m.role === ROLES.SUPER_ADMIN;
                  return (
                    <tr key={m.id}>
                      <td>{m.full_name || '—'}{isSelf && ' (you)'}</td>
                      <td>{m.email || '—'}</td>
                      <td>
                        {isSelf || isProtected ? (
                          <span className="role-badge">{m.role.replace('_', ' ')}</span>
                        ) : (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m, e.target.value)}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${m.is_active ? 'status-badge--work-completed' : 'status-badge--rejected'}`}>
                          {m.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="data-table-col--date">{formatDate(m.created_at)}</td>
                      <td className="data-table-col--actions">
                        {isSelf || (isProtected && !isSuperAdmin) ? (
                          <span className="data-table-muted">—</span>
                        ) : (
                          <button
                            type="button"
                            className={m.is_active ? 'btn-edit btn-edit--danger' : 'btn-edit'}
                            onClick={() => handleToggleActive(m)}
                          >
                            {m.is_active ? 'Revoke' : 'Grant'}
                          </button>
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
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setPage}
          show={showPagination}
        />
        </>
      )}

      <p className="page-subtitle" style={{ marginTop: 16 }}>
        New teammates sign up themselves, then appear here for you to grant access.
      </p>
    </div>
  );
}
