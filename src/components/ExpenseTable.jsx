import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/formatCurrency';
import './ProjectTable.css';

export default function ExpenseTable({ refreshKey }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExpenses() {
      setLoading(true);
      const { data } = await supabase
        .from('expenses')
        .select('amount, description, expense_date, projects(project_title, client_name)')
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
              expenses.map((exp, i) => (
                <tr key={i}>
                  <td>{exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
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
