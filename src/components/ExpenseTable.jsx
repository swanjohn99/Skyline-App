import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import './ProjectTable.css';

export default function ExpenseTable({ refreshKey }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      setLoading(true);
      const { data } = await supabase
        .from('expenses')
        .select('amount, description, expense_date, projects(status)')
        .order('expense_date', { ascending: false });
      setExpenses(data || []);
      setLoading(false);
    }
    fetchExpenses();
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
              <th>Project Status</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="data-table-empty">No expenses recorded yet.</td>
              </tr>
            ) : (
              expenses.map((exp, i) => (
                <tr key={i}>
                  <td>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  <td>
                    <span className="status-badge status-badge--default">{exp.projects?.status || 'N/A'}</span>
                  </td>
                  <td>{exp.description || '—'}</td>
                  <td className="data-table-amount">${Number(exp.amount).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
