import { Plus, Trash2 } from 'lucide-react';
import { VENDOR_CONTACT_TAGS } from '../constants';

export const EMPTY_VENDOR_CONTACT = {
  name: '',
  phone: '',
  email: '',
  tag: 'contact_person',
  tag_label: '',
};

export function emptyVendorContact() {
  return { ...EMPTY_VENDOR_CONTACT };
}

export default function VendorContactsEditor({ contacts = [], onChange, disabled = false }) {
  function updateRow(index, patch) {
    onChange?.(contacts.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange?.([...contacts, emptyVendorContact()]);
  }

  function removeRow(index) {
    onChange?.(contacts.filter((_, i) => i !== index));
  }

  return (
    <div className="vendor-contacts-editor" style={{ gridColumn: '1 / -1' }}>
      <div className="expense-items-editor-header">
        <label>Contact persons</label>
        {!disabled && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
            <Plus size={14} />
            Add contact
          </button>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="form-hint">No contacts added yet.</p>
      ) : (
        contacts.map((contact, index) => (
          <div key={index} className="expense-item-row">
            <div className="form-field">
              <label>Name</label>
              <input
                type="text"
                value={contact.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                disabled={disabled}
                required={contacts.length > 0}
              />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input
                type="text"
                value={contact.phone}
                onChange={(e) => updateRow(index, { phone: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => updateRow(index, { email: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div className="form-field">
              <label>Tag</label>
              <select
                value={contact.tag}
                onChange={(e) => updateRow(index, {
                  tag: e.target.value,
                  tag_label: e.target.value === 'other' ? contact.tag_label : '',
                })}
                disabled={disabled}
              >
                {VENDOR_CONTACT_TAGS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {contact.tag === 'other' && (
              <div className="form-field">
                <label>Tag label</label>
                <input
                  type="text"
                  value={contact.tag_label}
                  onChange={(e) => updateRow(index, { tag_label: e.target.value })}
                  placeholder="e.g. Billing, Warehouse"
                  disabled={disabled}
                  required
                />
              </div>
            )}
            {!disabled && (
              <button
                type="button"
                className="btn-edit btn-edit--danger expense-item-remove"
                onClick={() => removeRow(index)}
                aria-label="Remove contact"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
