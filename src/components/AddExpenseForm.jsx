import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { listOpenProjects, listProjects } from '../api/projects';
import { createExpense, updateExpense } from '../api/expenses';
import { listVendors, listChemicals, getLatestVendorPrice } from '../api/procurement';
import { projectSelectLabel, EXPENSE_TYPES } from '../constants';
import { todayInputValue, toDateInputValue, formatAmount } from '../utils/format';
import DateInput from './DateInput';
import AmountInput from './AmountInput';

const EMPTY_ITEM = {
  mode: 'catalog',
  chemical_id: '',
  custom_name: '',
  unit_price: '',
  quantity: '',
  vendor_pricing_id: '',
};

function emptyItem() {
  return { ...EMPTY_ITEM };
}

function toFormState(record) {
  if (!record) {
    return {
      project_id: '',
      expense_type: 'other',
      amount: '',
      description: '',
      date: todayInputValue(),
      vendor_id: '',
      items: [emptyItem()],
    };
  }

  const items = (record.items && record.items.length > 0)
    ? record.items.map((item) => ({
      mode: item.chemical_id ? 'catalog' : 'custom',
      chemical_id: item.chemical_id || '',
      custom_name: item.custom_name || '',
      unit_price: item.unit_price ?? '',
      quantity: item.quantity ?? '',
      vendor_pricing_id: item.vendor_pricing_id || '',
    }))
    : [emptyItem()];

  return {
    project_id: record.project_id || '',
    expense_type: record.expense_type || 'other',
    amount: record.amount ?? '',
    description: record.description || '',
    date: toDateInputValue(record.expense_date) || todayInputValue(),
    vendor_id: record.vendor_id || '',
    items,
  };
}

function lineTotal(item) {
  const unit = item.unit_price === '' ? null : Number(item.unit_price);
  const qty = item.quantity === '' ? null : Number(item.quantity);
  if (unit == null || qty == null || Number.isNaN(unit) || Number.isNaN(qty)) return 0;
  return unit * qty;
}

function AddExpenseForm({ expense, onExpenseAdded, defaultProjectId, onCancel }) {
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(() => ({
    ...toFormState(expense),
    project_id: expense?.project_id || defaultProjectId || '',
  }));

  const isEdit = Boolean(expense);
  const isCompact = Boolean(defaultProjectId) && !isEdit;
  const showProcurement = form.expense_type === 'material';

  const purchaseTotal = useMemo(
    () => form.items.reduce((sum, item) => sum + lineTotal(item), 0),
    [form.items],
  );

  useEffect(() => {
    if (defaultProjectId && !isEdit) return;
    const loader = isEdit ? listProjects() : listOpenProjects();
    loader.then(setProjects).catch(() => setProjects([]));
  }, [defaultProjectId, isEdit]);

  useEffect(() => {
    if (!showProcurement) return;
    Promise.all([listVendors(), listChemicals()])
      .then(([v, c]) => { setVendors(v); setChemicals(c); })
      .catch(() => { setVendors([]); setChemicals([]); });
  }, [showProcurement]);

  function updateItem(index, patch) {
    setForm((prev) => {
      const items = prev.items.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return { ...prev, items };
    });
  }

  async function refreshItemPrice(index, vendorId, chemicalId, date, items) {
    if (!vendorId || !chemicalId) return items;
    try {
      const row = await getLatestVendorPrice(vendorId, chemicalId, date);
      if (!row?.price) return items;
      return items.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          unit_price: String(row.price),
          vendor_pricing_id: row.id || '',
        };
      });
    } catch {
      return items;
    }
  }

  async function handleItemChemicalChange(index, chemicalId) {
    const items = await refreshItemPrice(index, form.vendor_id, chemicalId, form.date, form.items.map((row, i) => (
      i === index ? { ...row, chemical_id: chemicalId, mode: 'catalog', custom_name: '' } : row
    )));
    setForm((prev) => ({ ...prev, items }));
  }

  async function handleVendorChange(vendorId) {
    setForm((prev) => ({ ...prev, vendor_id: vendorId }));
    if (!vendorId) return;
    let items = form.items;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.mode === 'catalog' && item.chemical_id) {
        items = await refreshItemPrice(i, vendorId, item.chemical_id, form.date, items);
      }
    }
    setForm((prev) => ({ ...prev, vendor_id: vendorId, items }));
  }

  async function handleDateChange(date) {
    setForm((prev) => ({ ...prev, date }));
    if (!form.vendor_id) return;
    let items = form.items;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.mode === 'catalog' && item.chemical_id) {
        items = await refreshItemPrice(i, form.vendor_id, item.chemical_id, date, items);
      }
    }
    setForm((prev) => ({ ...prev, date, items }));
  }

  function addItemRow() {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }

  function removeItemRow(index) {
    setForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: items.length ? items : [emptyItem()] };
    });
  }

  function buildItemsPayload() {
    return form.items
      .filter((item) => (item.mode === 'catalog' ? item.chemical_id : item.custom_name.trim()))
      .map((item) => {
        const payload = {
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        };
        if (item.mode === 'catalog') {
          payload.chemical_id = item.chemical_id;
        } else {
          payload.custom_name = item.custom_name.trim();
        }
        if (item.vendor_pricing_id) payload.vendor_pricing_id = item.vendor_pricing_id;
        return payload;
      });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      project_id: form.project_id,
      expense_type: form.expense_type,
      description: form.description.trim() || null,
      expense_date: form.date,
    };

    if (showProcurement) {
      if (!form.vendor_id) {
        setError('Select a vendor for this purchase.');
        setSubmitting(false);
        return;
      }
      const items = buildItemsPayload();
      if (!items.length) {
        setError('Add at least one item to this purchase.');
        setSubmitting(false);
        return;
      }
      for (const item of items) {
        if (!item.quantity || item.quantity <= 0) {
          setError('Each item needs a quantity greater than zero.');
          setSubmitting(false);
          return;
        }
        if (item.unit_price == null || item.unit_price < 0) {
          setError('Each item needs a valid unit price.');
          setSubmitting(false);
          return;
        }
      }
      payload.vendor_id = form.vendor_id;
      payload.items = items;
      payload.amount = purchaseTotal;
    } else {
      const amount = Number(form.amount);
      if (!amount || amount <= 0) {
        setError('Enter an amount greater than zero.');
        setSubmitting(false);
        return;
      }
      payload.amount = amount;
    }

    try {
      if (isEdit) {
        await updateExpense(expense.id, payload);
      } else {
        await createExpense(payload);
      }
      onExpenseAdded?.();
      if (!isEdit && !defaultProjectId) {
        setForm(toFormState(null));
      } else if (!isEdit && defaultProjectId) {
        setForm((prev) => ({
          ...toFormState(null),
          project_id: prev.project_id,
        }));
      }
      setSubmitting(false);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={isCompact ? '' : 'form-card'}>
      {!isCompact && (
        <>
          <h3 className="form-card-title">{isEdit ? 'Edit Expense' : 'Log New Expense'}</h3>
          <p className="form-card-subtitle">Record a project-related expense.</p>
        </>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        {!defaultProjectId && (
          <div className="form-field">
            <label>Project</label>
            <select
              required
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{projectSelectLabel(p)}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-field">
          <label>Type</label>
          <select
            required
            value={form.expense_type}
            onChange={(e) => setForm({ ...form, expense_type: e.target.value })}
          >
            {EXPENSE_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {showProcurement && (
          <>
            <div className="form-field">
              <label>Vendor</label>
              <select
                required
                value={form.vendor_id}
                onChange={(e) => handleVendorChange(e.target.value)}
              >
                <option value="">Select vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="expense-items-editor">
              <div className="expense-items-editor-header">
                <label>Purchase items</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>
                  <Plus size={14} />
                  Add item
                </button>
              </div>

              {form.items.map((item, index) => (
                <div key={index} className="expense-item-row">
                  <div className="form-field">
                    <label>Item type</label>
                    <select
                      value={item.mode}
                      onChange={(e) => updateItem(index, {
                        mode: e.target.value,
                        chemical_id: '',
                        custom_name: '',
                        unit_price: '',
                        vendor_pricing_id: '',
                      })}
                    >
                      <option value="catalog">From catalogue</option>
                      <option value="custom">Custom item</option>
                    </select>
                  </div>

                  {item.mode === 'catalog' ? (
                    <div className="form-field">
                      <label>Chemical / material</label>
                      <select
                        value={item.chemical_id}
                        onChange={(e) => handleItemChemicalChange(index, e.target.value)}
                      >
                        <option value="">Select item…</option>
                        {chemicals.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.unit_of_measure ? ` (${c.unit_of_measure})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="form-field">
                      <label>Item name</label>
                      <input
                        type="text"
                        value={item.custom_name}
                        onChange={(e) => updateItem(index, { custom_name: e.target.value })}
                        placeholder="Item not in catalogue"
                      />
                    </div>
                  )}

                  <div className="form-field">
                    <label>Unit price (INR)</label>
                    <AmountInput
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, { unit_price: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label>Quantity</label>
                    <AmountInput
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    />
                  </div>

                  <div className="form-field expense-item-row-total">
                    <label>Line total</label>
                    <div className="expense-line-total">{formatAmount(lineTotal(item))}</div>
                  </div>

                  {form.items.length > 1 && (
                    <button
                      type="button"
                      className="btn-edit btn-edit--danger expense-item-remove"
                      onClick={() => removeItemRow(index)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}

              <div className="expense-purchase-total">
                <span>Purchase total (INR)</span>
                <strong>{formatAmount(purchaseTotal)}</strong>
              </div>
            </div>
          </>
        )}

        {!showProcurement && (
          <div className="form-field">
            <label>Amount (INR)</label>
            <AmountInput
              required
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
        )}

        <div className="form-field">
          <label>Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What was this expense for?"
          />
        </div>

        <div className="form-field">
          <label>Expense Date</label>
          <DateInput
            required
            value={form.date}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Expense')}
        </button>
        {!isCompact && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        )}
        {error && <span className="form-message form-message--error">{error}</span>}
      </div>
    </form>
  );
}

export default AddExpenseForm;
