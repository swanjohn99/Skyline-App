import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  listProjectTypes,
  listEntityProjectTypes,
  setEntityProjectTypes,
} from '../api/projectTypes';
import { PROJECT_TYPE_CATEGORIES } from '../constants';

export default function ProjectTypesSelector({ entityType, entityId }) {
  const [allTypes, setAllTypes] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const [types, assigned] = await Promise.all([
        listProjectTypes(),
        listEntityProjectTypes(entityType, entityId),
      ]);
      setAllTypes(types);
      setSelected(new Set(assigned.map((a) => a.project_type_id)));
      setError('');
      setDirty(false);
    } catch (err) {
      setError(err.message || 'Failed to load project types.');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    PROJECT_TYPE_CATEGORIES.forEach((cat) => { map[cat] = []; });
    allTypes.forEach((pt) => {
      if (map[pt.category]) map[pt.category].push(pt);
    });
    return map;
  }, [allTypes]);

  const typeById = useMemo(() => {
    const map = new Map();
    allTypes.forEach((pt) => map.set(pt.id, pt));
    return map;
  }, [allTypes]);

  function addType(id) {
    if (!id || selected.has(id)) return;
    setSelected((prev) => new Set([...prev, id]));
    setDirty(true);
  }

  function removeType(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await setEntityProjectTypes(entityType, entityId, [...selected]);
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hasAvailableTypes = allTypes.some((pt) => !selected.has(pt.id));

  return (
    <div className="project-table-container">
      <div className="project-table-toolbar">
        <h3 className="project-table-section-title">Project types</h3>
        {dirty && (
          <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save types'}
          </button>
        )}
      </div>

      {error && <p className="form-message form-message--error">{error}</p>}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading types…</div>
      ) : (
        <div className="form-card">
          <div className="form-field">
            <label>Type of project</label>
            <select
              value=""
              disabled={!hasAvailableTypes}
              onChange={(e) => addType(e.target.value)}
            >
              <option value="">
                {hasAvailableTypes ? 'Choose type…' : (selected.size ? 'All types selected' : 'No types in catalogue')}
              </option>
              {PROJECT_TYPE_CATEGORIES.map((category) => {
                const items = (grouped[category] || []).filter((pt) => !selected.has(pt.id));
                if (items.length === 0) return null;
                return (
                  <optgroup key={category} label={category}>
                    {items.map((pt) => (
                      <option key={pt.id} value={pt.id}>{pt.name}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          {selected.size > 0 && (
            <div className="project-type-chips">
              {[...selected].map((id) => {
                const pt = typeById.get(id);
                if (!pt) return null;
                return (
                  <span key={id} className="tag-chip project-type-chip">
                    <span>{pt.category} · {pt.name}</span>
                    <button type="button" className="project-type-chip-remove" onClick={() => removeType(id)} aria-label={`Remove ${pt.name}`}>
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
