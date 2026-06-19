import { useEffect, useState } from 'react';
import { listExpenses } from '../api/expenses';
import { formatCurrency, formatDate } from '../utils/format';
import './ProjectTable.css';

export default function ExpenseTable({ refreshKey }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listExpenses()
      .then((data) => { if (active) setExpenses(data); })
      .catch(() => { if (active) setExpenses([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

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
              <th>Project Title</th>
              <th>Client Name</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="data-table-empty">No expenses recorded yet.</td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{formatDate(exp.expense_date)}</td>
                  <td>{exp.projects?.project_title || '—'}</td>
                  <td>{exp.projects?.client_name || '—'}</td>
                  <td>{exp.description || '—'}</td>
                  <td className="data-table-amount">{formatCurrency(exp.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
