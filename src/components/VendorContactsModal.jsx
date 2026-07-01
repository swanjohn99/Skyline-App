import { vendorContactTagLabel, vendorWebsiteHref } from '../constants';
import './UpdateProjectForm.css';

function hasBankDetails(vendor) {
  return Boolean(
    vendor?.bank_account_holder
    || vendor?.bank_name
    || vendor?.bank_account_number
    || vendor?.bank_ifsc
    || vendor?.bank_address,
  );
}

export default function VendorContactsModal({ vendor, onClose }) {
  if (!vendor) return null;

  const contacts = vendor.contacts || [];

  return (
    <div className="skyline-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="skyline-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-contacts-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px' }}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="vendor-contacts-title" className="modal-title">
            {vendor.name}
          </h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>

        <div className="detail-card" style={{ marginBottom: '1rem' }}>
          <p className="detail-card-title">Company</p>
          <div className="detail-row">
            <span className="detail-row-label">Phone</span>
            <span className="detail-row-value">{vendor.phone || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Email</span>
            <span className="detail-row-value">
              {vendor.email ? <a href={`mailto:${vendor.email}`}>{vendor.email}</a> : '—'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Website</span>
            <span className="detail-row-value">
              {vendor.website ? (
                <a href={vendorWebsiteHref(vendor.website)} target="_blank" rel="noopener noreferrer">
                  {vendor.website}
                </a>
              ) : '—'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">GST number</span>
            <span className="detail-row-value">{vendor.gst_number || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Address</span>
            <span className="detail-row-value" style={{ whiteSpace: 'pre-wrap' }}>{vendor.address || '—'}</span>
          </div>
        </div>

        {hasBankDetails(vendor) && (
          <div className="detail-card" style={{ marginBottom: '1rem' }}>
            <p className="detail-card-title">Bank details</p>
            <div className="detail-row">
              <span className="detail-row-label">A/c holder name</span>
              <span className="detail-row-value">{vendor.bank_account_holder || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Bank name</span>
              <span className="detail-row-value">{vendor.bank_name || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">A/c no.</span>
              <span className="detail-row-value">{vendor.bank_account_number || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Branch IFSC</span>
              <span className="detail-row-value">{vendor.bank_ifsc || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Bank address</span>
              <span className="detail-row-value" style={{ whiteSpace: 'pre-wrap' }}>{vendor.bank_address || '—'}</span>
            </div>
          </div>
        )}

        <p className="detail-card-title">Contact persons</p>
        {contacts.length === 0 ? (
          <p className="form-hint">No contact persons recorded.</p>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tag</th>
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id || `${contact.name}-${contact.tag}`}>
                    <td>{contact.name}</td>
                    <td>
                      <span className="status-badge status-badge--quotation-sent">
                        {vendorContactTagLabel(contact.tag, contact.tag_label)}
                      </span>
                    </td>
                    <td>{contact.phone || '—'}</td>
                    <td>{contact.email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
