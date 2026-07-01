import { formatCurrency } from '../utils/format';
import './UpdateProjectForm.css';

function itemLabel(item) {
  if (item.chemical_name) return item.chemical_name;
  if (item.custom_name) return item.custom_name;
  return 'Item';
}

export default function ExpenseItemsModal({ expense, onClose }) {
  if (!expense) return null;

  const items = expense.items || [];

  return (
    <div className="skyline-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="skyline-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-items-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px' }}
      >
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="expense-items-title" className="modal-title">Material purchase</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>

        {expense.vendor_name && (
          <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
            Vendor: <strong>{expense.vendor_name}</strong>
          </p>
        )}

        {items.length === 0 ? (
          <p className="form-hint">No line items recorded for this expense.</p>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{itemLabel(item)}</td>
                    <td>{item.quantity}</td>
                    <td className="data-table-amount">{formatCurrency(item.unit_price)}</td>
                    <td className="data-table-amount">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Purchase total</td>
                  <td className="data-table-amount" style={{ fontWeight: 600 }}>
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
