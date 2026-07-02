import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/auth';
import {
  listProjectTypes,
  createProjectType,
  updateProjectType,
  deleteProjectType,
} from '../api/projectTypes';
import { listDocumentTemplates, uploadDocumentTemplate, documentDownloadUrl } from '../api/documents';
import { PROJECT_TYPE_CATEGORIES } from '../constants';
import { formatDate } from '../utils/format';
import { usePageTitle } from '../hooks/usePageTitle';

const TEMPLATE_TYPES = [
  { value: 'quotation', label: 'Quotation' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'warranty', label: 'Warranty' },
];

export default function CatalogSettingsPage() {
  usePageTitle('Catalog Settings');
  const { isOwner } = useAuth();
  const [types, setTypes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeForm, setTypeForm] = useState(null);
  const [uploading, setUploading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typeRows, templateRows] = await Promise.all([
        listProjectTypes(false),
        listDocumentTemplates(),
      ]);
      setTypes(typeRows);
      setTemplates(templateRows);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    PROJECT_TYPE_CATEGORIES.forEach((cat) => { map[cat] = []; });
    types.forEach((pt) => {
      if (map[pt.category]) map[pt.category].push(pt);
    });
    return map;
  }, [types]);

  async function handleTypeSubmit(event) {
    event.preventDefault();
    setError('');
    const payload = {
      name: typeForm.name.trim(),
      category: typeForm.category,
      is_active: typeForm.is_active,
    };
    try {
      if (typeForm.id) {
        await updateProjectType(typeForm.id, payload);
      } else {
        await createProjectType(payload);
      }
      setTypeForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeactivateType(pt) {
    if (!window.confirm(`Deactivate "${pt.name}"?`)) return;
    try {
      await deleteProjectType(pt.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTemplateUpload(templateType, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(templateType);
    setError('');
    try {
      await uploadDocumentTemplate(templateType, file);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(null);
      event.target.value = '';
    }
  }

  function templateFor(type) {
    return templates.find((t) => t.template_type === type && t.is_active);
  }

  if (!isOwner) {
    return (
      <div className="page">
        <header className="page-header">
          <div>
            <h1 className="page-title">Catalog Settings</h1>
            <p className="page-subtitle">Only workspace owners can manage the catalog.</p>
          </div>
        </header>
        <p className="form-message form-message--error">You must be an owner to access this page.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Catalog Settings</h1>
          <p className="page-subtitle">Project types and document templates.</p>
        </div>
        {!typeForm && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setTypeForm({ name: '', category: PROJECT_TYPE_CATEGORIES[0], is_active: true })}
          >
            <Plus size={17} />
            Add project type
          </button>
        )}
      </header>

      {error && <p className="form-message form-message--error">{error}</p>}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading…</div>
      ) : (
        <div className="page-stack">
          {typeForm && (
            <form onSubmit={handleTypeSubmit} className="form-card">
              <h3 className="form-card-title">{typeForm.id ? 'Edit project type' : 'Add project type'}</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Name</label>
                  <input required value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Category</label>
                  <select value={typeForm.category} onChange={(e) => setTypeForm({ ...typeForm, category: e.target.value })}>
                    {PROJECT_TYPE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                {typeForm.id && (
                  <div className="form-field">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={Boolean(typeForm.is_active)}
                        onChange={(e) => setTypeForm({ ...typeForm, is_active: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Save</button>
                <button type="button" className="btn btn-secondary" onClick={() => setTypeForm(null)}>Cancel</button>
              </div>
            </form>
          )}

          {PROJECT_TYPE_CATEGORIES.map((category) => (
            <div key={category} className="project-table-container">
              <h3 className="project-table-section-title">{category}</h3>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(grouped[category] || []).length === 0 ? (
                      <tr><td colSpan={3} className="data-table-empty">No types in this category.</td></tr>
                    ) : (
                      grouped[category].map((pt) => (
                        <tr key={pt.id}>
                          <td>{pt.name}</td>
                          <td>{pt.is_active ? 'Active' : 'Inactive'}</td>
                          <td className="data-table-actions data-table-actions--compact">
                            <div className="table-actions-stack">
                              <button type="button" className="btn-edit" onClick={() => setTypeForm({ ...pt, is_active: Boolean(pt.is_active) })}>
                                Edit
                              </button>
                              {pt.is_active && (
                                <button type="button" className="btn-edit btn-edit--danger" onClick={() => handleDeactivateType(pt)}>
                                  <Trash2 size={14} /> Deactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="project-table-container">
            <h3 className="project-table-section-title">Document templates</h3>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Uploaded</th>
                    <th>File</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATE_TYPES.map(({ value, label }) => {
                    const tpl = templateFor(value);
                    return (
                      <tr key={value}>
                        <td>{label}</td>
                        <td>{tpl ? formatDate(tpl.created_at) : '—'}</td>
                        <td>
                          {tpl?.file_path ? (
                            <a href={documentDownloadUrl(tpl.file_path)} target="_blank" rel="noreferrer">Download</a>
                          ) : '—'}
                        </td>
                        <td>
                          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                            <Upload size={14} />
                            {uploading === value ? 'Uploading…' : 'Upload'}
                            <input
                              type="file"
                              accept=".docx,.doc"
                              style={{ display: 'none' }}
                              disabled={uploading === value}
                              onChange={(e) => handleTemplateUpload(value, e)}
                            />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
