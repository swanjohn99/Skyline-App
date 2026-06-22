import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { FolderOpen, Layers, TrendingUp, CalendarDays } from 'lucide-react';
import { getDashboardData } from '../api/dashboard';
import { formatCompactCurrency, formatCurrency } from '../utils/format';
import { CHART_COLORS, MONTH_LABELS } from '../constants';

const sum = (rows, predicate) =>
  rows.filter(predicate).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

export default function Dashboard() {
  const [counts, setCounts] = useState({ active: 0, total: 0 });
  const [metrics, setMetrics] = useState({ incomeMonth: 0, expensesMonth: 0, profitMonth: 0, profitYear: 0 });
  const [monthlyData, setMonthlyData] = useState([]);

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

        setCounts({ active: activeCount, total: totalCount });
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

      <div className="chart-card chart-card--full">
        <h3 className="chart-card-title">Income vs Expenses — {currentYear}</h3>
        <div className="chart-card-body">
          <ResponsiveContainer width="100%" height="100%">
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
