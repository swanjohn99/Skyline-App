import { api } from '../apiClient';
import { COMPLETED_STATUSES } from '../constants';

// Single request for everything the dashboard needs.
export async function getDashboardData() {
  const data = await api.get('/dashboard');
  return {
    activeCount: data?.activeCount ?? 0,
    totalCount: data?.totalCount ?? 0,
    projects: data?.projects ?? [],
    expenses: data?.expenses ?? [],
    payments: data?.payments ?? [],
  };
}

export function isCompleted(status) {
  return COMPLETED_STATUSES.includes((status ?? '').toLowerCase().trim());
}
