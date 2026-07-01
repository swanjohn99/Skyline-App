import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '../context/auth';
import { listProjectTypes, createProjectType } from '../api/projectTypes';
import { PROJECT_TYPE_CATEGORIES } from '../constants';

export default function ProjectTypesDraftPicker({
  selectedIds = [],
  onChange,
  disabled = false,
  showAddCatalogue = true,
}) {
  const { isOwner } = useAuth();
  const [allTypes, setAllTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState({ name: '', category: PROJECT_TYPE_CATEGORIES[0] });
  const [adding, setAdding] = useState(false);

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const types = await listProjectTypes();
      setAllTypes(types);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load project types.');
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (disabled || !id || selected.has(id)) return;
    onChange?.([...selectedIds, id]);
  }

  function removeType(id) {
    if (disabled) return;
    onChange?.(selectedIds.filter((itemId) => itemId !== id));
  }

  async function handleAddType(event) {
    event.preventDefault();
    const name = newType.name.trim();
    if (!name) return;
    setAdding(true);
    setError('');
    try {
      const created = await createProjectType({ name, category: newType.category, is_active: true });
      await load();
      onChange?.([...selectedIds, created.id]);
      setNewType({ name: '', category: PROJECT_TYPE_CATEGORIES[0] });
      setShowAdd(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <p className="form-hint">Loading project types…</p>;
  }

  const hasAvailableTypes = allTypes.some((pt) => !selected.has(pt.id));

  return (
    <div className="project-types-draft-picker" style={{ gridColumn: '1 / -1' }}>
      <div className="form-field">
        <label>Type of project</label>
        <select
          value=""
          disabled={disabled || !hasAvailableTypes}
          onChange={(e) => addType(e.target.value)}
        >
          <option value="">
            {hasAvailableTypes ? 'Choose type…' : (selectedIds.length ? 'All types selected' : 'No types in catalogue')}
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

      {error && <p className="form-message form-message--error">{error}</p>}

      {selectedIds.length > 0 && (
        <div className="project-type-chips">
          {selectedIds.map((id) => {
            const pt = typeById.get(id);
            if (!pt) return null;
            return (
              <span key={id} className="tag-chip project-type-chip">
                <span>{pt.category} · {pt.name}</span>
                {!disabled && (
                  <button type="button" className="project-type-chip-remove" onClick={() => removeType(id)} aria-label={`Remove ${pt.name}`}>
                    <X size={12} />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {isOwner && !disabled && showAddCatalogue && (
        <div style={{ marginTop: '0.5rem' }}>
          {!showAdd ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} />
              Add catalogue type
            </button>
          ) : (
            <form onSubmit={handleAddType} className="inline-form-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-field" style={{ flex: '1 1 160px' }}>
                <label>Name</label>
                <input
                  value={newType.name}
                  onChange={(e) => setNewType((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field" style={{ flex: '1 1 140px' }}>
                <label>Category</label>
                <select
                  value={newType.category}
                  onChange={(e) => setNewType((p) => ({ ...p, category: e.target.value }))}
                >
                  {PROJECT_TYPE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                {adding ? 'Adding…' : 'Add'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
