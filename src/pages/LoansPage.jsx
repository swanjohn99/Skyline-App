import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import AddLenderForm from '../components/AddLenderForm';
import AddLoanForm from '../components/AddLoanForm';
import AddLoanRepaymentForm from '../components/AddLoanRepaymentForm';
import LoansTable from '../components/LoansTable';
import { listLenders, deleteLender } from '../api/lenders';
import { usePagination } from '../hooks/usePagination';
import { usePageTitle } from '../hooks/usePageTitle';
import TablePagination from '../components/TablePagination';

export default function LoansPage() {
  usePageTitle('Loans');
  const [refresh, setRefresh] = useState(0);
  const [lenders, setLenders] = useState([]);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showAddLender, setShowAddLender] = useState(false);
  const [showAddRepayment, setShowAddRepayment] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editingLender, setEditingLender] = useState(null);
  const [editingRepayment, setEditingRepayment] = useState(null);

  const loadLenders = useCallback(() => {
    listLenders()
      .then(setLenders)
      .catch(() => setLenders([]));
  }, []);

  useEffect(() => {
    loadLenders();
  }, [loadLenders, refresh]);

  function handleRefresh() {
    setRefresh((n) => n + 1);
    loadLenders();
  }

  function closeForms() {
    setShowAddLoan(false);
    setShowAddLender(false);
    setShowAddRepayment(false);
    setEditingLoan(null);
    setEditingLender(null);
    setEditingRepayment(null);
  }

  async function handleDeleteLender(lender) {
    if (!window.confirm(`Delete lender "${lender.name}"?`)) return;
    try {
      await deleteLender(lender.id);
      handleRefresh();
    } catch (err) {
      window.alert(err.message || 'Failed to delete lender.');
    }
  }

  const isFormOpen = showAddLoan || showAddLender || showAddRepayment
    || editingLoan || editingLender || editingRepayment;

  const lendersPagination = usePagination(lenders, undefined, refresh);

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Loans & Repayments</h1>
          <p className="page-subtitle">Track money borrowed from banks or private lenders.</p>
        </div>
        {!isFormOpen && (
          <div className="page-header-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddLender(true)}>
              <Plus size={17} />
              Add Lender
            </button>
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
        {showAddLender && (
          <AddLenderForm
            onSaved={() => { closeForms(); handleRefresh(); }}
            onCancel={closeForms}
          />
        )}
        {editingLender && (
          <AddLenderForm
            lender={editingLender}
            onSaved={() => { closeForms(); handleRefresh(); }}
            onCancel={closeForms}
          />
        )}
        {showAddLoan && (
          <AddLoanForm
            onSaved={() => { closeForms(); handleRefresh(); }}
            onCancel={closeForms}
            onAddLender={() => { setShowAddLoan(false); setShowAddLender(true); }}
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

        <details className="lenders-panel">
          <summary>Manage lenders ({lenders.length})</summary>
          <div className="lenders-panel-toolbar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddLender(true)}>
              <Plus size={15} />
              Add lender
            </button>
          </div>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Loans</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lenders.length === 0 ? (
                  <tr><td colSpan={5} className="data-table-empty">No lenders yet.</td></tr>
                ) : (
                  lendersPagination.pageItems.map((lender) => (
                    <tr key={lender.id}>
                      <td>{lender.name}</td>
                      <td>{lender.phone || '—'}</td>
                      <td>{lender.address || '—'}</td>
                      <td>{lender.loan_count ?? 0}</td>
                      <td>
                        <div className="table-actions-stack">
                          <button type="button" className="btn-edit" onClick={() => setEditingLender(lender)}>Edit</button>
                          <button
                            type="button"
                            className="btn-edit btn-edit--danger"
                            onClick={() => handleDeleteLender(lender)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={lendersPagination.page}
            totalPages={lendersPagination.totalPages}
            totalCount={lendersPagination.totalCount}
            onPageChange={lendersPagination.setPage}
            show={lendersPagination.showPagination}
          />
        </details>
      </div>
    </div>
  );
}
