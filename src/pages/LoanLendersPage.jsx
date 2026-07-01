import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import AddLenderForm from '../components/AddLenderForm';
import { listLenders, deleteLender } from '../api/lenders';
import { usePagination } from '../hooks/usePagination';
import { usePageTitle } from '../hooks/usePageTitle';
import TablePagination from '../components/TablePagination';

export default function LoanLendersPage() {
  usePageTitle('Loan Lenders');
  const [refresh, setRefresh] = useState(0);
  const [lenders, setLenders] = useState([]);
  const [showAddLender, setShowAddLender] = useState(false);
  const [editingLender, setEditingLender] = useState(null);

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
    setShowAddLender(false);
    setEditingLender(null);
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

  const isFormOpen = showAddLender || editingLender;
  const lendersPagination = usePagination(lenders, undefined, refresh);

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Loan Lenders</h1>
          <p className="page-subtitle">Manage banks and private lenders you borrow from.</p>
        </div>
        {!isFormOpen && (
          <button type="button" className="btn btn-primary" onClick={() => setShowAddLender(true)}>
            <Plus size={17} />
            Add Lender
          </button>
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
      </div>
    </div>
  );
}
