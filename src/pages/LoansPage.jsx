import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AddLoanForm from '../components/AddLoanForm';
import AddLoanRepaymentForm from '../components/AddLoanRepaymentForm';
import LoansTable from '../components/LoansTable';
import { usePageTitle } from '../hooks/usePageTitle';

export default function LoansPage() {
  usePageTitle('Loans');
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showAddRepayment, setShowAddRepayment] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editingRepayment, setEditingRepayment] = useState(null);

  function handleRefresh() {
    setRefresh((n) => n + 1);
  }

  function closeForms() {
    setShowAddLoan(false);
    setShowAddRepayment(false);
    setEditingLoan(null);
    setEditingRepayment(null);
  }

  const isFormOpen = showAddLoan || showAddRepayment || editingLoan || editingRepayment;

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Loans & Repayments</h1>
          <p className="page-subtitle">Track money borrowed and repayments made.</p>
        </div>
        {!isFormOpen && (
          <div className="page-header-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddRepayment(true)}>
              <Plus size={17} />
              Add Repayment
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowAddLoan(true)}>
              <Plus size={17} />
              Add Loan
            </button>
          </div>
        )}
      </header>

      <div className="page-stack">
        {showAddLoan && (
          <AddLoanForm
            onSaved={() => { closeForms(); handleRefresh(); }}
            onCancel={closeForms}
            onAddLender={() => navigate('/loan-lenders')}
          />
        )}
        {editingLoan && (
          <AddLoanForm
            loan={editingLoan}
            onSaved={() => { closeForms(); handleRefresh(); }}
            onCancel={closeForms}
          />
        )}
        {showAddRepayment && (
          <AddLoanRepaymentForm
            onSaved={() => { closeForms(); handleRefresh(); }}
            onCancel={closeForms}
          />
        )}
        {editingRepayment && (
          <AddLoanRepaymentForm
            repayment={editingRepayment}
            onSaved={() => { closeForms(); handleRefresh(); }}
            onCancel={closeForms}
          />
        )}

        <LoansTable
          refreshKey={refresh}
          onEditLoan={setEditingLoan}
          onEditRepayment={setEditingRepayment}
          onDeleted={handleRefresh}
        />
      </div>
    </div>
  );
}
