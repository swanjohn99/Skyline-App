import { usePagination } from '../hooks/usePagination';
import TablePagination from './TablePagination';
import { formatCurrency, formatDate } from '../utils/format';
import { loanRepaymentMethodLabel } from '../constants';

export default function LoanRepaymentsNestedTable({
  repayments,
  onEditRepayment,
  onDeleteRepayment,
  deletingRepaymentId,
  resetKey,
}) {
  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(repayments, undefined, resetKey);

  return (
    <>
      <table className="data-table loans-table-nested">
        <thead>
          <tr>
            <th className="data-table-col--date">Date</th>
            <th>Method</th>
            <th>Comments</th>
            <th className="data-table-amount">Amount</th>
            <th className="data-table-col--actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {repayments.length === 0 ? (
            <tr>
              <td colSpan={5} className="data-table-empty">No repayments yet.</td>
            </tr>
          ) : (
            pageItems.map((rep) => (
              <tr key={rep.id}>
                <td className="data-table-col--date">{formatDate(rep.repayment_date)}</td>
                <td>{loanRepaymentMethodLabel(rep.payment_method)}</td>
                <td>{rep.comments || '—'}</td>
                <td className="data-table-amount">{formatCurrency(rep.amount)}</td>
                <td className="data-table-col--actions">
                  <div className="table-actions-stack">
                    <button
                      type="button"
                      className="btn-edit"
                      onClick={() => onEditRepayment(rep)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-edit btn-edit--danger"
                      onClick={() => onDeleteRepayment(rep)}
                      disabled={deletingRepaymentId === rep.id}
                    >
                      {deletingRepaymentId === rep.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <TablePagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
        show={showPagination}
      />
    </>
  );
}
