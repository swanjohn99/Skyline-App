import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Pencil } from 'lucide-react';
import AddLeadForm from '../components/AddLeadForm';
import EntityContactsTable from '../components/EntityContactsTable';
import ProjectTypesSelector from '../components/ProjectTypesSelector';
import { getLead, convertLead } from '../api/leads';
import { leadStatusBadgeClass, leadStatusLabel } from '../constants';
import { formatCurrency, formatDate } from '../utils/format';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LeadDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);

  const load = useCallback(() => {
    return getLead(id)
      .then((data) => { setLead(data); setError(''); })
      .catch((err) => setError(err.message || 'Failed to load lead.'));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  usePageTitle(lead?.display_name || 'Lead');

  async function handleConvert() {
    if (!window.confirm(`Convert "${lead.display_name}" to a project?`)) return;
    setConverting(true);
    try {
      const result = await convertLead(id);
      await load();
      if (result?.project_id) navigate(`/projects/${result.project_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setConverting(false);
    }
  }

  function handleSaved() {
    setEditing(false);
    load();
  }

  if (!lead) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading lead…
        </div>
      </div>
    );
  }

  const canConvert = lead.status !== 'converted' && lead.status !== 'lost';

  return (
    <div className="page">
      <Link to="/leads" className="back-link">
        <ArrowLeft size={16} />
        Back to Leads
      </Link>

      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">{lead.display_name}</h1>
          <p className="page-subtitle">
            <span className={leadStatusBadgeClass(lead.status)}>{leadStatusLabel(lead.status)}</span>
            {lead.location ? ` · ${lead.location}` : ''}
          </p>
        </div>
        <div className="page-header-actions">
          {!editing && (
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              <Pencil size={16} />
              Edit
            </button>
          )}
          {canConvert && !editing && (
            <button type="button" className="btn btn-primary" disabled={converting} onClick={handleConvert}>
              <ArrowRightLeft size={16} />
              {converting ? 'Converting…' : 'Convert to project'}
            </button>
          )}
          {lead.status === 'converted' && lead.converted_project_id && (
            <Link to={`/projects/${lead.converted_project_id}`} className="btn btn-primary">
              View project
            </Link>
          )}
        </div>
      </header>

      {error && <p className="form-message form-message--error">{error}</p>}

      <div className="page-stack">
        {editing && (
          <AddLeadForm
            lead={lead}
            onSaved={handleSaved}
            onCancel={() => setEditing(false)}
          />
        )}

        {!editing && (
          <div className="detail-grid">
            <div className="detail-card">
              <p className="detail-card-title">Contact</p>
              <div className="detail-row">
                <span className="detail-row-label">Phone</span>
                <span className="detail-row-value">{lead.phone || lead.client?.phone || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Email</span>
                <span className="detail-row-value">{lead.email || lead.client?.email || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Client</span>
                <span className="detail-row-value">
                  {lead.client ? (
                    <Link to={`/clients/${lead.client.id}`}>{lead.client.name}</Link>
                  ) : '—'}
                </span>
              </div>
            </div>

            <div className="detail-card">
              <p className="detail-card-title">Lead info</p>
              <div className="detail-row">
                <span className="detail-row-label">Project name</span>
                <span className="detail-row-value">{lead.project_title || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Source</span>
                <span className="detail-row-value">{lead.source || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Est. value</span>
                <span className="detail-row-value">{formatCurrency(lead.estimated_value)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Created</span>
                <span className="detail-row-value">{formatDate(lead.created_at)}</span>
              </div>
              {lead.notes && (
                <div className="detail-row">
                  <span className="detail-row-label">Notes</span>
                  <span className="detail-row-value">{lead.notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!editing && (
          <>
            <EntityContactsTable entityType="lead" entityId={id} />
            <ProjectTypesSelector entityType="lead" entityId={id} />
          </>
        )}
      </div>
    </div>
  );
}
