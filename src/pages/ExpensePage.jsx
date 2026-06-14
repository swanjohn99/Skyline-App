import { useState } from 'react';
import AddExpenseForm from '../components/AddExpenseForm';
import ExpenseTable from '../components/ExpenseTable';

export default function ExpensePage() {
  const [refresh, setRefresh] = useState(0);
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Expenses</h1>
        <p className="page-subtitle">Log and review project-related expenses.</p>
      </header>

      <div className="page-split">
        <AddExpenseForm onExpenseAdded={() => setRefresh(prev => prev + 1)} />
        <ExpenseTable refreshKey={refresh} />
      </div>
    </div>
  );
}
