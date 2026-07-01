import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { FolderOpen, Layers, TrendingUp, CalendarDays, CheckSquare } from 'lucide-react';
import { getDashboardData } from '../api/dashboard';
import { getLeadFunnel } from '../api/leads';
import { listTasks } from '../api/tasks';
import FinancialBreakdownChart from '../components/FinancialBreakdownChart';
import { formatCompactCurrency, formatCurrency } from '../utils/format';
import { CHART_COLORS, MONTH_LABELS, LEAD_STATUSES } from '../constants';
import { usePageTitle } from '../hooks/usePageTitle';
import { Link } from 'react-router-dom';

const sum = (rows, predicate) =>
  rows.filter(predicate).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [counts, setCounts] = useState({ active: 0, total: 0 });
  const [metrics, setMetrics] = useState({ incomeMonth: 0, expensesMonth: 0, profitMonth: 0, profitYear: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [leadFunnel, setLeadFunnel] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);

  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long' });
  const currentYear = now.getFullYear();
  const currentDate = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  useEffect(() => {
    async function load() {
      try {
        const { activeCount, totalCount, expenses, payments } = await getDashboardData();

        const firstDayMonth = new Date(currentYear, now.getMonth(), 1);
        const firstDayYear = new Date(currentYear, 0, 1);

        const inMonth = (dateStr) => dateStr && new Date(dateStr) >= firstDayMonth;
        const inYear = (dateStr) => dateStr && new Date(dateStr) >= firstDayYear;

        const incomeMonth = sum(payments, (p) => inMonth(p.payment_date));
        const expensesMonth = sum(expenses, (e) => inMonth(e.expense_date));
        const incomeYear = sum(payments, (p) => inYear(p.payment_date));
        const expensesYear = sum(expenses, (e) => inYear(e.expense_date));
        const allIncome = sum(payments, () => true);

        setCounts({ active: activeCount, total: totalCount });
        setAllExpenses(expenses);
        setTotalIncome(allIncome);
        setMetrics({
          incomeMonth,
          expensesMonth,
          profitMonth: incomeMonth - expensesMonth,
          profitYear: incomeYear - expensesYear,
        });

        const months = MONTH_LABELS.map((name) => ({ name, Income: 0, Expenses: 0 }));
        for (const p of payments) {
          const d = p.payment_date ? new Date(p.payment_date) : null;
          if (d && d.getFullYear() === currentYear) months[d.getMonth()].Income += Number(p.amount) || 0;
        }
        for (const e of expenses) {
          const d = e.expense_date ? new Date(e.expense_date) : null;
          if (d && d.getFullYear() === currentYear) months[d.getMonth()].Expenses += Number(e.amount) || 0;
        }
        setMonthlyData(months);

        const today = now.toISOString().slice(0, 10);
        const [funnel, tasks] = await Promise.all([
          getLeadFunnel().catch(() => null),
          listTasks({ from: today, to: today }).catch(() => []),
        ]);
        setLeadFunnel(funnel);
        setTodayTasks(tasks.filter((t) => !t.is_completed));
      } catch (err) {
        console.error('Dashboard load failed:', err);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear]);

  return (
    <div className="page">
      <header className="page-header page-header--dashboard">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your construction projects.</p>
        </div>
        <p className="current-date">{currentDate}</p>
      </header>

      <div className="metrics-grid">
        <MetricCard icon={FolderOpen} iconClass="blue" label="Active Projects" value={counts.active} />
        <MetricCard icon={Layers} iconClass="slate" label="Total Projects" value={counts.total} />
        <MetricCard icon={TrendingUp} iconClass="green" label={`Income (${currentMonthName})`} value={formatCurrency(metrics.incomeMonth)} />
        <MetricCard icon={CalendarDays} iconClass="amber" label="Profit (Year)" value={formatCurrency(metrics.profitYear)} />
      </div>

      <FinancialBreakdownChart
        expenses={allExpenses}
        income={totalIncome}
        title="All projects — spending & profit breakdown"
      />

      <div className="dashboard-widgets">
        {leadFunnel && (
          <div className="chart-card">
            <div className="section-header-row">
              <h3 className="chart-card-title">Lead funnel</h3>
              <Link to="/leads" className="btn btn-secondary btn-sm">View leads</Link>
            </div>
            <div className="funnel-grid">
              {LEAD_STATUSES.filter((s) => s.value !== 'converted' && s.value !== 'lost').map(({ value, label }) => (
                <div key={value} className="funnel-item">
                  <span className="funnel-item-count">{leadFunnel[value] ?? 0}</span>
                  <span className="funnel-item-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="chart-card">
          <div className="section-header-row">
            <h3 className="chart-card-title">Today&apos;s tasks</h3>
            <Link to="/calendar" className="btn btn-secondary btn-sm">Calendar</Link>
          </div>
          {todayTasks.length === 0 ? (
            <p className="data-table-empty" style={{ padding: '1rem 0' }}>No open tasks due today.</p>
          ) : (
            <ul className="task-list-compact">
              {todayTasks.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <CheckSquare size={14} />
                  <span>{t.title || t.task_type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="chart-card chart-card--full">
        <h3 className="chart-card-title">Income vs Expenses — {currentYear}</h3>
        <div className="chart-card-body">
          <ResponsiveContainer width="100%" height={340} minHeight={280}>
            <BarChart data={monthlyData} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 13 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={formatCompactCurrency} />
              <Tooltip
                formatter={(value) => [formatCurrency(value), undefined]}
                contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15,23,42,0.08)' }}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Bar dataKey="Income" fill={CHART_COLORS.income} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Expenses" fill={CHART_COLORS.expenses} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, iconClass, label, value }) {
  return (
    <div className="metric-card">
      <div className={`metric-card-icon metric-card-icon--${iconClass}`}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="metric-card-body">
        <p className="metric-card-label">{label}</p>
        <p className="metric-card-value">{value}</p>
      </div>
    </div>
  );
}
