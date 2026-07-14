import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, FileText, Shield } from 'lucide-react';
import { getProject } from '../api/projects';
import { listExpensesByProject } from '../api/expenses';
import { listPaymentsByProject } from '../api/payments';
import { listWarranties, createWarranty } from '../api/tasks';
import { listGeneratedDocuments, generateDocument, documentDownloadUrl } from '../api/documents';
import UpdateProjectForm from '../components/UpdateProjectForm';
import AddPaymentForm from '../components/AddPaymentForm';
import AddExpenseForm from '../components/AddExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import AddMilestoneForm from '../components/AddMilestoneForm';
import MilestoneTable from '../components/MilestoneTable';
import EntityContactsTable from '../components/EntityContactsTable';
import FinancialBreakdownChart from '../components/FinancialBreakdownChart';
import TablePagination from '../components/TablePagination';
import DateInput from '../components/DateInput';
import { formatCurrency, formatDate, todayInputValue } from '../utils/format';
import '../components/UpdateProjectForm.css';
import { statusBadgeClass, paymentMethodLabel } from '../constants';
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
  const [editingExpense, setEditingExpense] = useState(null);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [warranties, setWarranties] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [showWarrantyForm, setShowWarrantyForm] = useState(false);
  const [warrantyForm, setWarrantyForm] = useState({ start_date: todayInputValue(), duration_months: '12', terms: '' });
  const [docGenerating, setDocGenerating] = useState(null);
  const [sectionError, setSectionError] = useState('');

  useEffect(() => {
    getProject(id).then(setProject).catch(() => setProject(null));
    listExpensesByProject(id).then(setExpenses).catch(() => setExpenses([]));
    listPaymentsByProject(id).then(setPayments).catch(() => setPayments([]));
    listWarranties(id).then(setWarranties).catch(() => setWarranties([]));
    listGeneratedDocuments(id).then(setDocuments).catch(() => setDocuments([]));
  }, [id, refresh]);

  const paymentsPagination = usePagination(payments, undefined, refresh);

  usePageTitle(project?.project_title || 'Project');

  function handleUpdated() {
    setRefresh((n) => n + 1);
  }

  function handlePaymentAdded() {
    setShowAddPayment(false);
    handleUpdated();
  }

  function handleExpenseSaved() {
    setShowAddExpense(false);
    setEditingExpense(null);
    handleUpdated();
  }

  function handleMilestoneSaved() {
    setShowAddMilestone(false);
    setEditingMilestone(null);
    setRefresh((n) => n + 1);
  }

  async function handleGenerateDocument(templateType) {
    setDocGenerating(templateType);
    setSectionError('');
    try {
      await generateDocument(id, templateType);
      setDocuments(await listGeneratedDocuments(id));
    } catch (err) {
      setSectionError(err.message);
    } finally {
      setDocGenerating(null);
    }
  }

  async function handleWarrantySubmit(e) {
    e.preventDefault();
    setSectionError('');
    try {
      await createWarranty({
        project_id: id,
        start_date: warrantyForm.start_date,
        duration_months: Number(warrantyForm.duration_months),
        terms: warrantyForm.terms.trim() || null,
      });
      setWarranties(await listWarranties(id));
      setShowWarrantyForm(false);
      setWarrantyForm({ start_date: todayInputValue(), duration_months: '12', terms: '' });
    } catch (err) {
      setSectionError(err.message);
    }
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

      <EntityContactsTable entityType="project" entityId={id} />

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
              <th className="data-table-col--date">Date</th>
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
                  <td className="data-table-col--date">{formatDate(pay.payment_date)}</td>
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
        {!showAddExpense && !editingExpense && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddExpense(true)}>
            <Plus size={15} />
            Add Expense
          </button>
        )}
      </div>
      {(showAddExpense || editingExpense) && (
        <AddExpenseForm
          expense={editingExpense}
          defaultProjectId={id}
          onExpenseAdded={handleExpenseSaved}
          onCancel={() => { setShowAddExpense(false); setEditingExpense(null); }}
        />
      )}
      <ExpenseTable
        projectId={id}
        hideProjectColumn
        refreshKey={refresh}
        onEdit={(e) => { setEditingExpense(e); setShowAddExpense(false); }}
        onDeleted={() => setRefresh((n) => n + 1)}
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

      <div className="section-header-row">
        <h3 className="section-heading"><Shield size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />Warranties</h3>
        {!showWarrantyForm && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowWarrantyForm(true)}>
            <Plus size={15} />
            Add warranty
          </button>
        )}
      </div>
      {showWarrantyForm && (
        <form className="form-card" onSubmit={handleWarrantySubmit} style={{ marginBottom: 16 }}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-field">
              <label>Start date</label>
              <DateInput required value={warrantyForm.start_date} onChange={(e) => setWarrantyForm({ ...warrantyForm, start_date: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Duration (months)</label>
              <input type="number" min={1} required value={warrantyForm.duration_months} onChange={(e) => setWarrantyForm({ ...warrantyForm, duration_months: e.target.value })} />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Terms</label>
              <textarea rows={3} value={warrantyForm.terms} onChange={(e) => setWarrantyForm({ ...warrantyForm, terms: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Save warranty</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowWarrantyForm(false)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th className="data-table-col--date">Start</th><th className="data-table-col--date">End</th><th>Duration</th><th>Terms</th></tr>
          </thead>
          <tbody>
            {warranties.length === 0 ? (
              <tr><td colSpan={4} className="data-table-empty">No warranties recorded.</td></tr>
            ) : warranties.map((w) => (
              <tr key={w.id}>
                <td className="data-table-col--date">{formatDate(w.start_date)}</td>
                <td className="data-table-col--date">{formatDate(w.end_date)}</td>
                <td>{w.duration_months} mo</td>
                <td>{w.terms || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-header-row">
        <h3 className="section-heading"><FileText size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />Documents</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['quotation', 'receipt', 'warranty'].map((type) => (
            <button
              key={type}
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={docGenerating === type}
              onClick={() => handleGenerateDocument(type)}
            >
              {docGenerating === type ? 'Generating…' : `Generate ${type}`}
            </button>
          ))}
        </div>
      </div>
      {sectionError && <p className="form-message form-message--error">{sectionError}</p>}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Type</th><th className="data-table-col--date">Generated</th><th>Download</th></tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr><td colSpan={3} className="data-table-empty">No documents generated yet.</td></tr>
            ) : documents.map((d) => (
              <tr key={d.id}>
                <td>{d.template_type}</td>
                <td className="data-table-col--date">{formatDate(d.created_at)}</td>
                <td>
                  <a href={documentDownloadUrl(d.file_path)} target="_blank" rel="noreferrer">Download</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
