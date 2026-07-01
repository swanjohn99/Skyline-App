import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import DateInput from '../components/DateInput';
import {
  listVendors,
  listChemicals,
  listVendorPricing,
  createChemical,
  updateChemical,
  deleteChemical,
  createVendorPrice,
} from '../api/procurement';
import { formatCurrency, formatDate, todayInputValue } from '../utils/format';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { usePageTitle } from '../hooks/usePageTitle';

const TABS = ['chemicals', 'prices'];

const EMPTY_CHEMICAL = { name: '', unit_of_measure: 'kg' };
const EMPTY_PRICE = { vendor_id: '', chemical_id: '', price: '', effective_date: todayInputValue() };

export default function ProcurementPage() {
  usePageTitle('Procurement');
  const [tab, setTab] = useState('chemicals');
  const [vendors, setVendors] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chemicalForm, setChemicalForm] = useState(null);
  const [priceForm, setPriceForm] = useState(EMPTY_PRICE);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [v, c, p] = await Promise.all([listVendors(), listChemicals(), listVendorPricing()]);
      setVendors(v);
      setChemicals(c);
      setPrices(p);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load procurement data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleChemicalSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const payload = {
      name: chemicalForm.name.trim(),
      unit_of_measure: chemicalForm.unit_of_measure.trim() || 'kg',
    };
    try {
      if (chemicalForm.id) {
        await updateChemical(chemicalForm.id, payload);
      } else {
        await createChemical(payload);
      }
      setChemicalForm(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteChemical(chemical) {
    if (!window.confirm(`Delete chemical "${chemical.name}"?`)) return;
    try {
      await deleteChemical(chemical.id);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePriceSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await createVendorPrice({
        vendor_id: priceForm.vendor_id,
        chemical_id: priceForm.chemical_id,
        price: Number(priceForm.price),
        effective_date: priceForm.effective_date,
      });
      setPriceForm(EMPTY_PRICE);
      setShowPriceForm(false);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const chemicalsPagination = usePagination(chemicals, undefined, tab);
  const pricesPagination = usePagination(prices, undefined, `${tab}-${prices.length}`);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Procurement</h1>
          <p className="page-subtitle">Manage chemicals catalog and vendor price history.</p>
        </div>
      </header>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`admin-tab${tab === t ? ' admin-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'chemicals' ? 'Chemicals' : 'Prices'}
          </button>
        ))}
      </div>

      {error && <p className="form-message form-message--error">{error}</p>}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading…</div>
      ) : tab === 'chemicals' ? (
        <>
          {!chemicalForm && (
            <button type="button" className="btn btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setChemicalForm(EMPTY_CHEMICAL)}>
              <Plus size={17} />
              Add Chemical
            </button>
          )}
          {chemicalForm && (
            <form onSubmit={handleChemicalSubmit} className="form-card" style={{ marginBottom: '1rem' }}>
              <h3 className="form-card-title">{chemicalForm.id ? 'Edit Chemical' : 'Add Chemical'}</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Name</label>
                  <input required value={chemicalForm.name} onChange={(e) => setChemicalForm({ ...chemicalForm, name: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Unit</label>
                  <input value={chemicalForm.unit_of_measure} onChange={(e) => setChemicalForm({ ...chemicalForm, unit_of_measure: e.target.value })} />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setChemicalForm(null)}>Cancel</button>
              </div>
            </form>
          )}
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {chemicals.length === 0 ? (
                  <tr><td colSpan={3} className="data-table-empty">No chemicals yet.</td></tr>
                ) : (
                  chemicalsPagination.pageItems.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.unit_of_measure || 'kg'}</td>
                      <td className="data-table-actions">
                        <button type="button" className="btn-edit" onClick={() => setChemicalForm({ ...EMPTY_CHEMICAL, ...c })}>
                          <Pencil size={14} /> Edit
                        </button>
                        <button type="button" className="btn-edit btn-edit--danger" onClick={() => handleDeleteChemical(c)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination {...chemicalsPagination} onPageChange={chemicalsPagination.setPage} show={chemicalsPagination.showPagination} />
        </>
      ) : (
        <>
          {!showPriceForm && (
            <button type="button" className="btn btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setShowPriceForm(true)}>
              <Plus size={17} />
              Add Price
            </button>
          )}
          {showPriceForm && (
            <form onSubmit={handlePriceSubmit} className="form-card" style={{ marginBottom: '1rem' }}>
              <h3 className="form-card-title">Add Vendor Price</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Vendor</label>
                  <select
                    required
                    value={priceForm.vendor_id}
                    onChange={(e) => setPriceForm({ ...priceForm, vendor_id: e.target.value })}
                  >
                    <option value="">Choose…</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Chemical</label>
                  <select
                    required
                    value={priceForm.chemical_id}
                    onChange={(e) => setPriceForm({ ...priceForm, chemical_id: e.target.value })}
                  >
                    <option value="">Choose…</option>
                    {chemicals.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={priceForm.price}
                    onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Effective date</label>
                  <DateInput
                    required
                    value={priceForm.effective_date}
                    onChange={(e) => setPriceForm({ ...priceForm, effective_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving…' : 'Save price'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPriceForm(false); setPriceForm(EMPTY_PRICE); }}>Cancel</button>
              </div>
            </form>
          )}
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Chemical</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Effective date</th>
                </tr>
              </thead>
              <tbody>
                {prices.length === 0 ? (
                  <tr><td colSpan={5} className="data-table-empty">No price records yet.</td></tr>
                ) : (
                  pricesPagination.pageItems.map((p) => (
                    <tr key={p.id}>
                      <td>{p.vendor_name}</td>
                      <td>{p.chemical_name}</td>
                      <td className="data-table-amount">{formatCurrency(p.price)}</td>
                      <td>{p.unit_of_measure || 'kg'}</td>
                      <td>{formatDate(p.effective_date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination {...pricesPagination} onPageChange={pricesPagination.setPage} show={pricesPagination.showPagination} />
        </>
      )}
    </div>
  );
}
