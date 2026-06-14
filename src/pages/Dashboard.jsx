import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { FolderOpen, Layers, TrendingUp, CalendarDays } from 'lucide-react';
import { formatCompactCurrency, formatCurrency } from '../utils/formatCurrency';

const CHART_COLORS = {
  income: '#10b981',
  expenses: '#f87171',
};

export default function Dashboard() {
  const [counts, setCounts] = useState({ active: 0, total: 0 });
  const [metrics, setMetrics] = useState({ incomeMonth: 0, expensesMonth: 0, profitMonth: 0, profitYear: 0 });
  const [monthData, setMonthData] = useState([]);
  const [yearData, setYearData] = useState([]);

  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    async function fetchData() {
      const now = new Date();
      const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayYear = new Date(now.getFullYear(), 0, 1);

      const [activeRes, totalRes, { data: projects }, { data: expenses }, { data: payments }] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).not('status', 'in', '("work completed","work ended","Completed","rejected")'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).neq('status', 'rejected'),
        supabase.from('projects').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('payments').select('*')
      ]);

      const mExpenses = expenses.filter(e => new Date(e.expense_date) >= firstDayMonth).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const yExpenses = expenses.filter(e => new Date(e.expense_date) >= firstDayYear).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      const mIncome = payments.filter(p => new Date(p.payment_date) >= firstDayMonth).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const yIncome = payments.filter(p => new Date(p.payment_date) >= firstDayYear).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

      const completedJobs = projects.filter((project) => {
        const status = project.status?.toLowerCase().trim();
        return ['work completed', 'work ended', 'completed'].includes(status);
      });

      setCounts({ active: activeRes.count ?? 0, total: totalRes.count ?? 0 });
      setMetrics({
        incomeMonth: mIncome,
        expensesMonth: mExpenses,
        profitMonth: completedJobs.filter(p => new Date(p.end_date) >= firstDayMonth).reduce((acc, p) => acc + (p.total_quoted_amount || 0), 0),
        profitYear: completedJobs.filter(p => new Date(p.end_date) >= firstDayYear).reduce((acc, p) => acc + (p.total_quoted_amount || 0), 0),
      });

      setMonthData([{ name: currentMonthName, Income: mIncome, Expenses: mExpenses }]);
      setYearData([{ name: currentYear.toString(), Income: yIncome, Expenses: yExpenses }]);
    }

    fetchData();
  }, [currentMonthName, currentYear]);

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
        <MetricCard icon={TrendingUp} iconClass="green" label="Profit (Month)" value={formatCurrency(metrics.profitMonth)} />
        <MetricCard icon={CalendarDays} iconClass="amber" label="Profit (Year)" value={formatCurrency(metrics.profitYear)} />
      </div>

      <div className="charts-grid">
        <ChartCard title={`Cash Flow — ${currentMonthName}`} data={monthData} />
        <ChartCard title={`Cash Flow — ${currentYear}`} data={yearData} />
      </div>
    </div>
  );
}

function ChartCard({ title, data }) {
  return (
    <div className="chart-card">
      <h3 className="chart-card-title">{title}</h3>
      <div className="chart-card-body">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={8}>
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
