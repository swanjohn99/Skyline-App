import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddPaymentForm from '../components/AddPaymentForm';
import PaymentsTable from '../components/PaymentsTable';

export default function Payments() {
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
          <h1 className="page-title">Payments Received</h1>
          <p className="page-subtitle">Record and track client payments across projects.</p>
        </div>
        {!isFormOpen && (
          <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={17} />
            Add Payment
          </button>
        )}
      </header>

      <div className="page-stack">
        {isFormOpen && (
          <AddPaymentForm
            payment={editing}
            onPaymentAdded={handleSaved}
            onCancel={() => { setShowAddForm(false); setEditing(null); }}
          />
        )}
        <PaymentsTable
          refreshKey={refresh}
          onEdit={setEditing}
          onDeleted={() => setRefresh((prev) => prev + 1)}
        />
      </div>
    </div>
  );
}
