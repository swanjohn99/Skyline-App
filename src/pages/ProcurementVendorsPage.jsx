import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Columns3 } from 'lucide-react';
import {
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../api/procurement';
import { vendorWebsiteHref } from '../constants';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import VendorContactsEditor from '../components/VendorContactsEditor';
import VendorContactsModal from '../components/VendorContactsModal';
import { usePageTitle } from '../hooks/usePageTitle';

const COLUMN_OPTIONS = [
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'gst', label: 'GST' },
  { key: 'contact', label: 'Contact' },
  { key: 'address', label: 'Address' },
  { key: 'bank_account_holder', label: 'A/c holder' },
  { key: 'bank_name', label: 'Bank name' },
  { key: 'bank_ifsc', label: 'IFSC' },
];

const DEFAULT_VISIBLE_COLUMNS = {
  phone: true,
  email: true,
  website: true,
  gst: true,
  contact: true,
  address: false,
  bank_account_holder: false,
  bank_name: false,
  bank_ifsc: false,
};

const EMPTY_VENDOR = {
  name: '',
  phone: '',
  email: '',
  gst_number: '',
  address: '',
  website: '',
  bank_account_holder: '',
  bank_name: '',
  bank_account_number: '',
  bank_ifsc: '',
  bank_address: '',
  contacts: [],
};

function toVendorForm(vendor) {
  if (!vendor) return { ...EMPTY_VENDOR };
  return {
    id: vendor.id,
    name: vendor.name || '',
    phone: vendor.phone || '',
    email: vendor.email || '',
    gst_number: vendor.gst_number || '',
    address: vendor.address || '',
    website: vendor.website || '',
    bank_account_holder: vendor.bank_account_holder || '',
    bank_name: vendor.bank_name || '',
    bank_account_number: vendor.bank_account_number || '',
    bank_ifsc: vendor.bank_ifsc || '',
    bank_address: vendor.bank_address || '',
    contacts: (vendor.contacts || []).map((c) => ({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      tag: c.tag || 'contact_person',
      tag_label: c.tag_label || '',
    })),
  };
}

function buildContactsPayload(contacts) {
  return contacts
    .filter((c) => c.name.trim())
    .map((c) => {
      const row = {
        name: c.name.trim(),
        phone: c.phone.trim() || null,
        email: c.email.trim() || null,
        tag: c.tag,
      };
      if (c.tag === 'other') {
        row.tag_label = c.tag_label.trim();
      }
      return row;
    });
}

function primaryContactName(vendor) {
  const contacts = vendor.contacts || [];
  if (contacts.length === 0) return '—';
  if (contacts.length === 1) return contacts[0].name;
  const owner = contacts.find((c) => c.tag === 'owner');
  return owner?.name || contacts[0].name;
}

export default function ProcurementVendorsPage() {
  usePageTitle('Procurement Vendors');
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vendorForm, setVendorForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailVendor, setDetailVendor] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const savedColumns = JSON.parse(localStorage.getItem('skyline-vendor-columns'));
      return { ...DEFAULT_VISIBLE_COLUMNS, ...savedColumns };
    } catch {
      return DEFAULT_VISIBLE_COLUMNS;
    }
  });

  function toggleColumn(column) {
    setVisibleColumns((current) => {
      const next = { ...current, [column]: !current[column] };
      localStorage.setItem('skyline-vendor-columns', JSON.stringify(next));
      return next;
    });
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      setVendors(await listVendors());
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleVendorSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const contacts = buildContactsPayload(vendorForm.contacts);
    for (const c of contacts) {
      if (c.tag === 'other' && !c.tag_label) {
        setError('Each contact with tag Other needs a tag label.');
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      name: vendorForm.name.trim(),
      phone: vendorForm.phone.trim() || null,
      email: vendorForm.email.trim() || null,
      gst_number: vendorForm.gst_number.trim() || null,
      address: vendorForm.address.trim() || null,
      website: vendorForm.website.trim() || null,
      bank_account_holder: vendorForm.bank_account_holder.trim() || null,
      bank_name: vendorForm.bank_name.trim() || null,
      bank_account_number: vendorForm.bank_account_number.trim() || null,
      bank_ifsc: vendorForm.bank_ifsc.trim().toUpperCase() || null,
      bank_address: vendorForm.bank_address.trim() || null,
      contacts,
    };

    try {
      if (vendorForm.id) {
        await updateVendor(vendorForm.id, payload);
      } else {
        await createVendor(payload);
      }
      setVendorForm(null);
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteVendor(vendor) {
    if (!window.confirm(`Delete vendor "${vendor.name}"?`)) return;
    try {
      await deleteVendor(vendor.id);
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const vendorsPagination = usePagination(vendors, undefined, vendors.length);
  const visibleColumnCount = 2 + Object.values(visibleColumns).filter(Boolean).length;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Procurement Vendors</h1>
          <p className="page-subtitle">Manage material and chemical suppliers.</p>
        </div>
      </header>

      {error && <p className="form-message form-message--error">{error}</p>}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Loading…</div>
      ) : (
        <>
          {!vendorForm && (
            <button type="button" className="btn btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setVendorForm({ ...EMPTY_VENDOR })}>
              <Plus size={17} />
              Add Vendor
            </button>
          )}
          {vendorForm && (
            <form onSubmit={handleVendorSubmit} className="form-card" style={{ marginBottom: '1rem' }}>
              <h3 className="form-card-title">{vendorForm.id ? 'Edit Vendor' : 'Add Vendor'}</h3>
              <div className="form-grid">
                <div className="form-field">
                  <label>Name</label>
                  <input required value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Company phone</label>
                  <input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Company email</label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    placeholder="sales@vendor.com"
                  />
                </div>
                <div className="form-field">
                  <label>GST number</label>
                  <input value={vendorForm.gst_number} onChange={(e) => setVendorForm({ ...vendorForm, gst_number: e.target.value })} />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <textarea value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} rows={2} />
                </div>
                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Website</label>
                  <input
                    type="text"
                    value={vendorForm.website}
                    onChange={(e) => setVendorForm({ ...vendorForm, website: e.target.value })}
                    placeholder="www.example.com"
                  />
                </div>

                <div className="vendor-contacts-editor" style={{ gridColumn: '1 / -1' }}>
                  <p className="detail-card-title">Bank details</p>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>A/c holder name</label>
                      <input
                        value={vendorForm.bank_account_holder}
                        onChange={(e) => setVendorForm({ ...vendorForm, bank_account_holder: e.target.value })}
                      />
                    </div>
                    <div className="form-field">
                      <label>Bank name</label>
                      <input
                        value={vendorForm.bank_name}
                        onChange={(e) => setVendorForm({ ...vendorForm, bank_name: e.target.value })}
                      />
                    </div>
                    <div className="form-field">
                      <label>A/c no.</label>
                      <input
                        value={vendorForm.bank_account_number}
                        onChange={(e) => setVendorForm({ ...vendorForm, bank_account_number: e.target.value })}
                      />
                    </div>
                    <div className="form-field">
                      <label>Branch IFSC code</label>
                      <input
                        value={vendorForm.bank_ifsc}
                        onChange={(e) => setVendorForm({ ...vendorForm, bank_ifsc: e.target.value.toUpperCase() })}
                        placeholder="ABCD0123456"
                      />
                    </div>
                    <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Bank address</label>
                      <textarea
                        value={vendorForm.bank_address}
                        onChange={(e) => setVendorForm({ ...vendorForm, bank_address: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <VendorContactsEditor
                  contacts={vendorForm.contacts}
                  onChange={(contacts) => setVendorForm({ ...vendorForm, contacts })}
                />
              </div>
              <div className="form-actions">
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setVendorForm(null)}>Cancel</button>
              </div>
            </form>
          )}
          <div className="project-table-container">
            <div className="project-table-toolbar">
              <h3 className="project-table-section-title">All Vendors</h3>
              <details className="column-picker">
                <summary>
                  <Columns3 size={16} />
                  Columns
                </summary>
                <div className="column-picker-menu">
                  {COLUMN_OPTIONS.map(({ key, label }) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={visibleColumns[key]}
                        onChange={() => toggleColumn(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </details>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    {visibleColumns.phone && <th>Phone</th>}
                    {visibleColumns.email && <th>Email</th>}
                    {visibleColumns.website && <th>Website</th>}
                    {visibleColumns.gst && <th>GST</th>}
                    {visibleColumns.contact && <th>Contact</th>}
                    {visibleColumns.address && <th>Address</th>}
                    {visibleColumns.bank_account_holder && <th>A/c holder</th>}
                    {visibleColumns.bank_name && <th>Bank name</th>}
                    {visibleColumns.bank_ifsc && <th>IFSC</th>}
                    <th className="data-table-col--actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 ? (
                    <tr><td colSpan={visibleColumnCount} className="data-table-empty">No vendors yet.</td></tr>
                  ) : (
                    vendorsPagination.pageItems.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <button type="button" className="link-button" onClick={() => setDetailVendor(v)}>
                            {v.name}
                          </button>
                        </td>
                        {visibleColumns.phone && <td>{v.phone || '—'}</td>}
                        {visibleColumns.email && (
                          <td>
                            {v.email ? (
                              <a href={`mailto:${v.email}`}>{v.email}</a>
                            ) : '—'}
                          </td>
                        )}
                        {visibleColumns.website && (
                          <td>
                            {v.website ? (
                              <a href={vendorWebsiteHref(v.website)} target="_blank" rel="noopener noreferrer">
                                {v.website.replace(/^https?:\/\//i, '')}
                              </a>
                            ) : '—'}
                          </td>
                        )}
                        {visibleColumns.gst && <td>{v.gst_number || '—'}</td>}
                        {visibleColumns.contact && <td>{primaryContactName(v)}</td>}
                        {visibleColumns.address && (
                          <td style={{ whiteSpace: 'pre-wrap', maxWidth: '200px' }}>{v.address || '—'}</td>
                        )}
                        {visibleColumns.bank_account_holder && <td>{v.bank_account_holder || '—'}</td>}
                        {visibleColumns.bank_name && <td>{v.bank_name || '—'}</td>}
                        {visibleColumns.bank_ifsc && <td>{v.bank_ifsc || '—'}</td>}
                        <td className="data-table-col--actions">
                          <div className="table-actions-stack">
                            <button type="button" className="btn-edit" onClick={() => setVendorForm(toVendorForm(v))}>
                              <Pencil size={14} /> Edit
                            </button>
                            <button type="button" className="btn-edit btn-edit--danger" onClick={() => handleDeleteVendor(v)}>
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination {...vendorsPagination} onPageChange={vendorsPagination.setPage} show={vendorsPagination.showPagination} />
          </div>
          <VendorContactsModal vendor={detailVendor} onClose={() => setDetailVendor(null)} />
        </>
      )}
    </div>
  );
}
