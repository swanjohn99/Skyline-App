import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { createClient, updateClient } from '../api/clients';
import { searchCustomerAccounts } from '../api/customerAccounts';
import { CLIENT_TYPES } from '../constants';
import './AddProjectForm.css';

const EMPTY = {
  client_type: 'b2c',
  name: '',
  contact_title: '',
  email: '',
  phone: '',
  address: '',
  location: '',
  source: '',
  tags: '',
  notes: '',
  accountMode: 'existing',
  accountQuery: '',
  accountName: '',
  accountEmail: '',
  accountPhone: '',
  accountAddress: '',
  accountLocation: '',
  accountNotes: '',
};

function toFormState(client) {
  if (!client) return EMPTY;
  const isB2b = client.client_type === 'b2b' || client.client_type === 'contractor';
  const account = client.customer_account;
  return {
    client_type: isB2b ? 'b2b' : 'b2c',
    name: client.name || '',
    contact_title: client.contact_title || '',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    location: client.location || '',
    source: client.source || '',
    tags: (client.tags || []).join(', '),
    notes: client.notes || '',
    accountMode: account ? 'existing' : 'new',
    accountQuery: account?.name || '',
    accountName: account?.name || '',
    accountEmail: account?.email || '',
    accountPhone: account?.phone || '',
    accountAddress: account?.address || '',
    accountLocation: account?.location || '',
    accountNotes: account?.notes || '',
  };
}

export default function AddClientForm({ client, onSaved, onCancel }) {
  const [form, setForm] = useState(() => toFormState(client));
  const [selectedAccount, setSelectedAccount] = useState(() => (
    client?.customer_account ? client.customer_account : null
  ));
  const [accountResults, setAccountResults] = useState([]);
  const [accountSearching, setAccountSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(client);
  const isB2b = form.client_type === 'b2b';
  const useExistingAccount = form.accountMode === 'existing';

  useEffect(() => {
    if (!isB2b || !useExistingAccount) return;
    if (selectedAccount && selectedAccount.name === form.accountQuery) return;

    const q = form.accountQuery.trim();
    let active = true;
    const timer = setTimeout(() => {
      if (!active) return;
      if (q.length < 2) {
        setAccountResults([]);
        setAccountSearching(false);
        return;
      }
      setAccountSearching(true);
      searchCustomerAccounts(q)
        .then((data) => { if (active) setAccountResults(data); })
        .catch(() => { if (active) setAccountResults([]); })
        .finally(() => { if (active) setAccountSearching(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [form.accountQuery, isB2b, useExistingAccount, selectedAccount]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleTypeChange(event) {
    const clientType = event.target.value;
    setForm((prev) => ({
      ...prev,
      client_type: clientType,
      accountMode: clientType === 'b2b' ? prev.accountMode : 'existing',
    }));
    if (clientType === 'b2c') {
      setSelectedAccount(null);
    }
  }

  function pickAccount(account) {
    setSelectedAccount(account);
    setForm((prev) => ({ ...prev, accountQuery: account.name }));
    setAccountResults([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name.trim(),
      client_type: form.client_type,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      location: form.location.trim() || null,
      source: form.source.trim() || null,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes: form.notes.trim() || null,
    };

    if (isB2b) {
      payload.contact_title = form.contact_title.trim() || null;
      if (useExistingAccount) {
        if (!selectedAccount) {
          setError('Select a company from the list.');
          setSubmitting(false);
          return;
        }
        payload.customer_account_id = selectedAccount.id;
      } else {
        if (!form.accountName.trim()) {
          setError('Company name is required for B2B clients.');
          setSubmitting(false);
          return;
        }
        payload.new_account = {
          name: form.accountName.trim(),
          email: form.accountEmail.trim() || null,
          phone: form.accountPhone.trim() || null,
          address: form.accountAddress.trim() || null,
          location: form.accountLocation.trim() || null,
          notes: form.accountNotes.trim() || null,
        };
      }
    }

    try {
      if (isEdit) {
        await updateClient(client.id, payload);
      } else {
        await createClient(payload);
      }
      onSaved?.();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="form-card add-project-form">
      <h2 className="form-card-title">{isEdit ? 'Edit Client' : 'Add New Client'}</h2>
      <p className="form-card-subtitle">B2C = person. B2B = contact at a company.</p>
      <form onSubmit={handleSubmit}>
        <div className="add-project-form-grid">
          <div className="add-project-form-field">
            <label>Client type</label>
            <select name="client_type" value={form.client_type} onChange={handleTypeChange}>
              {CLIENT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {isB2b && (
            <>
              <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Company</label>
                <div className="account-mode-toggle">
                  <button
                    type="button"
                    className={`account-mode-btn${useExistingAccount ? ' active' : ''}`}
                    onClick={() => setForm((p) => ({ ...p, accountMode: 'existing' }))}
                  >
                    Select existing
                  </button>
                  <button
                    type="button"
                    className={`account-mode-btn${!useExistingAccount ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedAccount(null);
                      setForm((p) => ({ ...p, accountMode: 'new', accountQuery: '' }));
                    }}
                  >
                    Add new company
                  </button>
                </div>
              </div>

              {useExistingAccount ? (
                <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Search company</label>
                  <div className="login-input company-search-input">
                    <Search size={16} />
                    <input
                      name="accountQuery"
                      value={form.accountQuery}
                      onChange={(e) => {
                        setSelectedAccount(null);
                        handleChange(e);
                      }}
                      placeholder="Type at least 2 characters…"
                      autoComplete="off"
                    />
                  </div>
                  {accountSearching && <p className="form-hint">Searching…</p>}
                  {!accountSearching && form.accountQuery.trim().length >= 2 && !selectedAccount && (
                    <ul className="company-results">
                      {accountResults.length === 0 ? (
                        <li className="company-results-empty">No companies match.</li>
                      ) : (
                        accountResults.map((a) => (
                          <li key={a.id}>
                            <button type="button" onClick={() => pickAccount(a)}>
                              <strong>{a.name}</strong>
                              {a.location && <span>{a.location}</span>}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                  {selectedAccount && (
                    <p className="login-message">Selected: <strong>{selectedAccount.name}</strong></p>
                  )}
                </div>
              ) : (
                <>
                  <div className="add-project-form-field">
                    <label>Company name</label>
                    <input name="accountName" value={form.accountName} onChange={handleChange} required={isB2b && !useExistingAccount} />
                  </div>
                  <div className="add-project-form-field">
                    <label>Company phone</label>
                    <input name="accountPhone" value={form.accountPhone} onChange={handleChange} />
                  </div>
                  <div className="add-project-form-field">
                    <label>Company email</label>
                    <input name="accountEmail" type="email" value={form.accountEmail} onChange={handleChange} />
                  </div>
                  <div className="add-project-form-field">
                    <label>Company location</label>
                    <input name="accountLocation" value={form.accountLocation} onChange={handleChange} />
                  </div>
                  <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Company address</label>
                    <input name="accountAddress" value={form.accountAddress} onChange={handleChange} />
                  </div>
                  <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
                    <label>Company notes</label>
                    <textarea name="accountNotes" value={form.accountNotes} onChange={handleChange} />
                  </div>
                </>
              )}
            </>
          )}

          <div className="add-project-form-field">
            <label>{isB2b ? 'Contact name' : 'Name'}</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          {isB2b && (
            <div className="add-project-form-field">
              <label>Role / title</label>
              <input name="contact_title" value={form.contact_title} onChange={handleChange} placeholder="Project manager, owner…" />
            </div>
          )}
          <div className="add-project-form-field">
            <label>{isB2b ? 'Contact phone' : 'Phone'}</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className="add-project-form-field">
            <label>{isB2b ? 'Contact email' : 'Email'}</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </div>
          {!isB2b && (
            <div className="add-project-form-field">
              <label>Location (City/Area)</label>
              <input name="location" value={form.location} onChange={handleChange} />
            </div>
          )}
          <div className="add-project-form-field">
            <label>Source (how acquired)</label>
            <input name="source" value={form.source} onChange={handleChange} placeholder="referral, website, ad…" />
          </div>
          <div className="add-project-form-field">
            <label>Tags (comma separated)</label>
            <input name="tags" value={form.tags} onChange={handleChange} placeholder="vip, residential" />
          </div>
          {!isB2b && (
            <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Address</label>
              <input name="address" value={form.address} onChange={handleChange} />
            </div>
          )}
          <div className="add-project-form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Client')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
        {error && <p className="form-message form-message--error">{error}</p>}
      </form>
    </div>
  );
}
