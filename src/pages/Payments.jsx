import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddPaymentForm from '../components/AddPaymentForm';
import PaymentsTable from '../components/PaymentsTable';

export default function Payments() {
  const [refresh, setRefresh] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);

  function handlePaymentAdded() {
    setRefresh(prev => prev + 1);
    setShowAddForm(false);
  }

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Payments Received</h1>
          <p className="page-subtitle">Record and track client payments across projects.</p>
        </div>
        {!showAddForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={17} />
            Add Payment
          </button>
        )}
      </header>

      <div className="page-stack">
        {showAddForm && (
          <AddPaymentForm
            onPaymentAdded={handlePaymentAdded}
            onCancel={() => setShowAddForm(false)}
          />
        )}
        <PaymentsTable refreshKey={refresh} />
      </div>
    </div>
  );
}
