import { supabase } from '../supabaseClient';
import { CLOSED_STATUSES, COMPLETED_STATUSES } from '../constants';

// Single round-trip-ish fetch for everything the dashboard needs.
export async function getDashboardData() {
  const closedList = `(${CLOSED_STATUSES.map((s) => `"${s}"`).join(',')})`;

  const [activeRes, totalRes, projectsRes, expensesRes, paymentsRes] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }).not('status', 'in', closedList),
    supabase.from('projects').select('*', { count: 'exact', head: true }).neq('status', 'rejected'),
    supabase.from('projects').select('status, end_date, total_quoted_amount'),
    supabase.from('expenses').select('amount, expense_date'),
    supabase.from('payments').select('amount, payment_date'),
  ]);

  const firstError = activeRes.error || totalRes.error || projectsRes.error || expensesRes.error || paymentsRes.error;
  if (firstError) throw firstError;

  return {
    activeCount: activeRes.count ?? 0,
    totalCount: totalRes.count ?? 0,
    projects: projectsRes.data ?? [],
    expenses: expensesRes.data ?? [],
    payments: paymentsRes.data ?? [],
  };
}

export function isCompleted(status) {
  return COMPLETED_STATUSES.includes((status ?? '').toLowerCase().trim());
}
