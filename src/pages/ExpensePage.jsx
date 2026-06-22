import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddExpenseForm from '../components/AddExpenseForm';
import ExpenseTable from '../components/ExpenseTable';

export default function ExpensePage() {
  const [refresh, setRefresh] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editing, setEditing] = useState(null);

  function handleSaved() {
    setRefresh((prev) => prev + 1);
    setShowAddForm(false);
    setEditing(null);
  }

  const isFormOpen = showAddForm || editing;

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Log and review project-related expenses.</p>
        </div>
        {!isFormOpen && (
          <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={17} />
            Add Expense
          </button>
        )}
      </header>

      <div className="page-stack">
        {isFormOpen && (
          <AddExpenseForm
            expense={editing}
            onExpenseAdded={handleSaved}
            onCancel={() => { setShowAddForm(false); setEditing(null); }}
          />
        )}
        <ExpenseTable
          refreshKey={refresh}
          onEdit={setEditing}
          onDeleted={() => setRefresh((prev) => prev + 1)}
        />
      </div>
    </div>
  );
}
