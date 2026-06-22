import { useEffect, useState } from 'react';
import { listExpenses, deleteExpense } from '../api/expenses';
import { formatCurrency, formatDate } from '../utils/format';
import { expenseTypeLabel } from '../constants';
import './ProjectTable.css';

export default function ExpenseTable({ refreshKey, onEdit, onDeleted }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    listExpenses()
      .then((data) => { if (active) setExpenses(data); })
      .catch(() => { if (active) setExpenses([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  async function handleDelete(expense) {
    const label = expense.description || expenseTypeLabel(expense.expense_type);
    if (!window.confirm(`Delete expense "${label}"? This cannot be undone.`)) return;
    setDeletingId(expense.id);
    try {
      await deleteExpense(expense.id);
      onDeleted?.();
    } catch (err) {
      window.alert(err.message || 'Failed to delete expense.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading expenses…
      </div>
    );
  }

  return (
    <div>
      <h3 className="project-table-section-title">Recent Expenses</h3>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Project Title</th>
              <th>Client Name</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="data-table-empty">No expenses recorded yet.</td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{formatDate(exp.expense_date)}</td>
                  <td>{expenseTypeLabel(exp.expense_type)}</td>
                  <td>{exp.projects?.project_title || '—'}</td>
                  <td>{exp.projects?.client_name || '—'}</td>
                  <td>{exp.description || '—'}</td>
                  <td className="data-table-amount">{formatCurrency(exp.amount)}</td>
                  <td>
                    <div className="table-actions-stack">
                      <button type="button" className="btn-edit" onClick={() => onEdit(exp)}>Edit</button>
                      <button
                        type="button"
                        className="btn-edit btn-edit--danger"
                        onClick={() => handleDelete(exp)}
                        disabled={deletingId === exp.id}
                      >
                        {deletingId === exp.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
