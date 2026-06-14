import { useState } from 'react';
import AddPaymentForm from '../components/AddPaymentForm';
import PaymentsTable from '../components/PaymentsTable';

export default function Payments() {
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Payments Received</h1>
        <p className="page-subtitle">Record and track client payments across projects.</p>
      </header>

      <div className="page-split">
        <AddPaymentForm onPaymentAdded={() => setRefresh(prev => prev + 1)} />
        <PaymentsTable refreshKey={refresh} />
      </div>
    </div>
  );
}
