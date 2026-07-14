import { useEffect, useState, Fragment } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { listLoans, deleteLoan } from '../api/loans';
import { deleteLoanRepayment } from '../api/loanRepayments';
import AddLoanRepaymentForm from './AddLoanRepaymentForm';
import LoanRepaymentsNestedTable from './LoanRepaymentsNestedTable';
import TablePagination from './TablePagination';
import { formatCurrency, formatDate } from '../utils/format';
import { usePagination } from '../hooks/usePagination';
import './LoansTable.css';

export default function LoansTable({
  refreshKey,
  onEditLoan,
  onEditRepayment,
  onDeleted,
}) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [addingRepaymentFor, setAddingRepaymentFor] = useState(null);
  const [deletingLoanId, setDeletingLoanId] = useState(null);
  const [deletingRepaymentId, setDeletingRepaymentId] = useState(null);

  useEffect(() => {
    let active = true;
    listLoans()
      .then((data) => { if (active) setLoans(data); })
      .catch(() => { if (active) setLoans([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(loans, undefined, refreshKey);

  function toggleExpanded(loanId) {
    setExpanded((prev) => ({ ...prev, [loanId]: !prev[loanId] }));
    setAddingRepaymentFor(null);
  }

  async function handleDeleteLoan(loan) {
    if (!window.confirm(`Delete loan from ${loan.lender_name}? All repayments will also be removed.`)) return;
    setDeletingLoanId(loan.id);
    try {
      await deleteLoan(loan.id);
      onDeleted?.();
    } catch (err) {
      window.alert(err.message || 'Failed to delete loan.');
    } finally {
      setDeletingLoanId(null);
    }
  }

  async function handleDeleteRepayment(repayment) {
    if (!window.confirm(`Delete repayment of ${formatCurrency(repayment.amount)}?`)) return;
    setDeletingRepaymentId(repayment.id);
    try {
      await deleteLoanRepayment(repayment.id);
      onDeleted?.();
    } catch (err) {
      window.alert(err.message || 'Failed to delete repayment.');
    } finally {
      setDeletingRepaymentId(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        Loading loans…
      </div>
    );
  }

  return (
    <div className="project-table-container">
      <h3 className="project-table-section-title">Loans</h3>
      <div className="data-table-wrapper">
        <table className="data-table project-table loans-table">
          <thead>
            <tr>
              <th className="loans-table-expand-col" />
              <th>Lender</th>
              <th>Lent</th>
              <th>Repaid</th>
              <th>Interest</th>
              <th>Pending</th>
              <th>Rate</th>
              <th className="data-table-col--date">Date</th>
              <th className="data-table-col--actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 ? (
              <tr>
                <td colSpan={9} className="data-table-empty">No loans recorded yet.</td>
              </tr>
            ) : (
              pageItems.map((loan) => {
                const isOpen = Boolean(expanded[loan.id]);
                const repayments = loan.repayments ?? [];
                return (
                  <Fragment key={loan.id}>
                    <tr className={isOpen ? 'loans-table-row--expanded' : undefined}>
                      <td className="loans-table-expand-col">
                        <button
                          type="button"
                          className="loans-table-expand-btn"
                          onClick={() => toggleExpanded(loan.id)}
                          aria-expanded={isOpen}
                          aria-label={isOpen ? 'Collapse repayments' : 'Expand repayments'}
                        >
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td>
                        <div className="loans-table-lender">{loan.lender_name}</div>
                        {loan.lender_phone && (
                          <div className="loans-table-lender-meta">{loan.lender_phone}</div>
                        )}
                      </td>
                      <td className="data-table-amount">{formatCurrency(loan.principal_lent)}</td>
                      <td className="data-table-amount">{formatCurrency(loan.total_repaid)}</td>
                      <td className="data-table-amount">{formatCurrency(loan.accrued_interest)}</td>
                      <td className={`data-table-amount${loan.pending > 0 ? ' pending-positive' : ' pending-zero'}`}>
                        {formatCurrency(loan.pending)}
                      </td>
                      <td>{loan.interest_rate_label}</td>
                      <td className="project-dates-cell data-table-col--date">
                        <span className="project-date-line">{formatDate(loan.loan_date)}</span>
                      </td>
                      <td className="data-table-col--actions">
                        <div className="table-actions-stack">
                          <button type="button" className="btn-edit" onClick={() => onEditLoan(loan)}>Edit</button>
                          <button
                            type="button"
                            className="btn-edit btn-edit--danger"
                            onClick={() => handleDeleteLoan(loan)}
                            disabled={deletingLoanId === loan.id}
                          >
                            {deletingLoanId === loan.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="loans-table-repayments-row">
                        <td colSpan={9}>
                          <div className="loans-table-repayments">
                            <div className="loans-table-repayments-header">
                              <h4>Repayments</h4>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setAddingRepaymentFor(
                                  addingRepaymentFor === loan.id ? null : loan.id,
                                )}
                              >
                                {addingRepaymentFor === loan.id ? 'Cancel' : 'Add repayment'}
                              </button>
                            </div>

                            {addingRepaymentFor === loan.id && (
                              <AddLoanRepaymentForm
                                defaultLoanId={loan.id}
                                onSaved={() => {
                                  setAddingRepaymentFor(null);
                                  onDeleted?.();
                                }}
                                onCancel={() => setAddingRepaymentFor(null)}
                              />
                            )}

                            <LoanRepaymentsNestedTable
                              repayments={repayments}
                              resetKey={`${loan.id}-${refreshKey}`}
                              onEditRepayment={onEditRepayment}
                              onDeleteRepayment={handleDeleteRepayment}
                              deletingRepaymentId={deletingRepaymentId}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        show={showPagination}
      />
    </div>
  );
}
