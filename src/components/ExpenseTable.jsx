import { useEffect, useState } from 'react';
import { listExpenses, listExpensesByProject, deleteExpense } from '../api/expenses';
import { formatCurrency, formatDate } from '../utils/format';
import { expenseTypeLabel } from '../constants';
import { usePagination } from '../hooks/usePagination';
import TablePagination from './TablePagination';
import ExpenseItemsModal from './ExpenseItemsModal';
import './UpdateProjectForm.css';

function ExpenseTypeCell({ expense, onShowItems }) {
  const hasItems = expense.expense_type === 'material' && (expense.items?.length > 0);
  if (hasItems) {
    return (
      <button type="button" className="link-button" onClick={() => onShowItems(expense)}>
        {expenseTypeLabel(expense.expense_type)}
      </button>
    );
  }
  return expenseTypeLabel(expense.expense_type);
}

export default function ExpenseTable({
  refreshKey,
  onEdit,
  onDeleted,
  projectId,
  hideProjectColumn = false,
}) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [detailExpense, setDetailExpense] = useState(null);

  useEffect(() => {
    let active = true;
    const loader = projectId ? listExpensesByProject(projectId) : listExpenses();
    loader
      .then((data) => { if (active) setExpenses(data); })
      .catch(() => { if (active) setExpenses([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey, projectId]);

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(expenses, undefined, refreshKey);

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

  const colSpan = hideProjectColumn ? 5 : 7;
  const emptyMessage = projectId
    ? 'No expenses recorded for this project.'
    : 'No expenses recorded yet.';

  return (
    <div>
      {!projectId && (
        <h3 className="project-table-section-title">Recent Expenses</h3>
      )}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="data-table-col--date">Date</th>
              <th>Type</th>
              {!hideProjectColumn && <th>Project Title</th>}
              {!hideProjectColumn && <th>Client Name</th>}
              <th>Description</th>
              <th>Amount</th>
              <th className="data-table-col--actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="data-table-empty">{emptyMessage}</td>
              </tr>
            ) : (
              pageItems.map((exp) => (
                <tr key={exp.id}>
                  <td className="data-table-col--date">{formatDate(exp.expense_date)}</td>
                  <td><ExpenseTypeCell expense={exp} onShowItems={setDetailExpense} /></td>
                  {!hideProjectColumn && <td>{exp.projects?.project_title || '—'}</td>}
                  {!hideProjectColumn && <td>{exp.projects?.client_name || '—'}</td>}
                  <td>{exp.description || '—'}</td>
                  <td className="data-table-amount">{formatCurrency(exp.amount)}</td>
                  <td className="data-table-col--actions">
                    <div className="table-actions-stack">
                      <button type="button" className="btn-edit" onClick={() => onEdit?.(exp)}>Edit</button>
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
      <TablePagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        show={showPagination}
      />
      <ExpenseItemsModal expense={detailExpense} onClose={() => setDetailExpense(null)} />
    </div>
  );
}
