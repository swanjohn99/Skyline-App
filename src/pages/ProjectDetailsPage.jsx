import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { getProject } from '../api/projects';
import { listExpensesByProject } from '../api/expenses';
import { listPaymentsByProject } from '../api/payments';
import UpdateProjectForm from '../components/UpdateProjectForm';
import AddPaymentForm from '../components/AddPaymentForm';
import AddExpenseForm from '../components/AddExpenseForm';
import AddMilestoneForm from '../components/AddMilestoneForm';
import MilestoneTable from '../components/MilestoneTable';
import FinancialBreakdownChart from '../components/FinancialBreakdownChart';
import TablePagination from '../components/TablePagination';
import { formatCurrency, formatDate } from '../utils/format';
import { statusBadgeClass, expenseTypeLabel, paymentMethodLabel } from '../constants';
import { projectPending, hasQuotedTotal } from '../utils/projectFinance';
import { usePagination } from '../hooks/usePagination';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [editing, setEditing] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);

  useEffect(() => {
    getProject(id).then(setProject).catch(() => setProject(null));
    listExpensesByProject(id).then(setExpenses).catch(() => setExpenses([]));
    listPaymentsByProject(id).then(setPayments).catch(() => setPayments([]));
  }, [id, refresh]);

  const paymentsPagination = usePagination(payments, undefined, refresh);
  const expensesPagination = usePagination(expenses, undefined, refresh);

  usePageTitle(project?.project_title || 'Project');

  function handleUpdated() {
    setRefresh((n) => n + 1);
  }

  function handlePaymentAdded() {
    setShowAddPayment(false);
    handleUpdated();
  }

  function handleExpenseAdded() {
    setShowAddExpense(false);
    handleUpdated();
  }

  function handleMilestoneSaved() {
    setShowAddMilestone(false);
    setEditingMilestone(null);
    setRefresh((n) => n + 1);
  }

  if (!project) {
    return (
      <div className="page">
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading project details…
        </div>
      </div>
    );
  }

  const pending = projectPending(project);
  const totalExpenses = project.total_expenses ?? expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const profit = project.profit ?? ((project.amount_received || 0) - totalExpenses);

  return (
    <div className="page">
      <Link to="/projects" className="back-link">
        <ArrowLeft size={16} />
        Back to Projects
      </Link>

      <header className="page-header page-header--actions">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 className="page-title">{project.project_title}</h1>
            <span className={statusBadgeClass(project.status)}>{project.status}</span>
          </div>
          {project.client_name && (
            <p className="page-subtitle">{project.client_name}{project.location ? ` · ${project.location}` : ''}</p>
          )}
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
          <Pencil size={16} />
          Edit
        </button>
      </header>

      <div className="detail-grid">
        <div className="detail-card">
          <p className="detail-card-title">Project Details</p>
          <div className="detail-row">
            <span className="detail-row-label">Client</span>
            <span className="detail-row-value">{project.client_name || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Location</span>
            <span className="detail-row-value">{project.location || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Completion</span>
            <span className="detail-row-value">{project.completion_percent ?? 0}%</span>
          </div>
          {project.work_description && (
            <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
              <span className="detail-row-label">Description</span>
              <span className="detail-row-value" style={{ fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.5 }}>{project.work_description}</span>
            </div>
          )}
        </div>

        <div className="detail-card">
          <p className="detail-card-title">Financials</p>
          <div className="detail-row">
            <span className="detail-row-label">Total Quoted</span>
            <span className="detail-row-value">
              {hasQuotedTotal(project.total_quoted_amount)
                ? formatCurrency(project.total_quoted_amount)
                : '—'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Received</span>
            <span className="detail-row-value detail-row-value--success">{formatCurrency(project.amount_received)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Pending</span>
            <span className={`detail-row-value${pending != null && pending > 0 ? ' detail-row-value--pending' : pending != null ? ' detail-row-value--success' : ''}`}>
              {pending != null ? formatCurrency(pending) : '—'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Total Expenses</span>
            <span className="detail-row-value">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-label">Profit</span>
            <span className={`detail-row-value${profit > 0 ? ' detail-row-value--success' : profit < 0 ? ' detail-row-value--pending' : ''}`}>
              {formatCurrency(profit)}
            </span>
          </div>
        </div>
      </div>

      <FinancialBreakdownChart
        expenses={expenses}
        income={project.amount_received}
        title="Spending & profit breakdown"
      />

      <div className="section-header-row">
        <h3 className="section-heading">Payments</h3>
        {!showAddPayment && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddPayment(true)}>
            <Plus size={15} />
            Add Payment
          </button>
        )}
      </div>
      {showAddPayment && (
        <div className="form-card" style={{ marginBottom: 16 }}>
          <AddPaymentForm
            defaultProjectId={id}
            onPaymentAdded={handlePaymentAdded}
            onCancel={() => setShowAddPayment(false)}
          />
        </div>
      )}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Comments</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4} className="data-table-empty">No payments recorded yet.</td>
              </tr>
            ) : (
              paymentsPagination.pageItems.map((pay) => (
                <tr key={pay.id}>
                  <td>{formatDate(pay.payment_date)}</td>
                  <td>{paymentMethodLabel(pay.payment_method)}</td>
                  <td>{pay.comments || '—'}</td>
                  <td className="data-table-amount">{formatCurrency(pay.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={paymentsPagination.page}
        totalPages={paymentsPagination.totalPages}
        totalCount={paymentsPagination.totalCount}
        onPageChange={paymentsPagination.setPage}
        show={paymentsPagination.showPagination}
      />

      <div className="section-header-row">
        <h3 className="section-heading">Expenses</h3>
        {!showAddExpense && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddExpense(true)}>
            <Plus size={15} />
            Add Expense
          </button>
        )}
      </div>
      {showAddExpense && (
        <AddExpenseForm
          defaultProjectId={id}
          onExpenseAdded={handleExpenseAdded}
          onCancel={() => setShowAddExpense(false)}
        />
      )}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Type</th>
              <th>Date</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="data-table-empty">No expenses recorded for this project.</td>
              </tr>
            ) : (
              expensesPagination.pageItems.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.description || '—'}</td>
                  <td>{expenseTypeLabel(exp.expense_type)}</td>
                  <td>{formatDate(exp.expense_date)}</td>
                  <td className="data-table-amount">{formatCurrency(exp.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={expensesPagination.page}
        totalPages={expensesPagination.totalPages}
        totalCount={expensesPagination.totalCount}
        onPageChange={expensesPagination.setPage}
        show={expensesPagination.showPagination}
      />

      <div className="section-header-row">
        <h3 className="section-heading">Milestones</h3>
        {!showAddMilestone && !editingMilestone && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddMilestone(true)}>
            <Plus size={15} />
            Add Milestone
          </button>
        )}
      </div>
      {(showAddMilestone || editingMilestone) && (
        <div className="form-card" style={{ marginBottom: 16 }}>
          <AddMilestoneForm
            milestone={editingMilestone}
            defaultProjectId={id}
            onMilestoneAdded={handleMilestoneSaved}
            onCancel={() => { setShowAddMilestone(false); setEditingMilestone(null); }}
          />
        </div>
      )}
      <MilestoneTable
        projectId={id}
        hideProjectColumn
        refreshKey={refresh}
        onEdit={(m) => { setEditingMilestone(m); setShowAddMilestone(false); }}
        onDeleted={() => setRefresh((n) => n + 1)}
      />

      {editing && (
        <UpdateProjectForm
          project={project}
          onUpdate={handleUpdated}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
