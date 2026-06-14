import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddExpenseForm from '../components/AddExpenseForm';
import ExpenseTable from '../components/ExpenseTable';

export default function ExpensePage() {
  const [refresh, setRefresh] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  function handleExpenseAdded() {
    setRefresh(prev => prev + 1);
    setShowAddForm(false);
  }

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Log and review project-related expenses.</p>
        </div>
        {!showAddForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={17} />
            Add Expense
          </button>
        )}
      </header>

      <div className="page-stack">
        {showAddForm && (
          <AddExpenseForm
            onExpenseAdded={handleExpenseAdded}
            onCancel={() => setShowAddForm(false)}
          />
        )}
        <ExpenseTable refreshKey={refresh} />
      </div>
    </div>
  );
}
