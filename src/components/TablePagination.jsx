export default function TablePagination({ page, totalPages, totalCount, onPageChange, show }) {
  if (!show) return null;

  return (
    <div className="table-pagination">
      <span className="table-pagination-meta">
        Page {page} of {totalPages} · {totalCount} rows
      </span>
      <div className="table-pagination-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
