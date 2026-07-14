import { api } from '../apiClient';
import { COMPLETED_STATUSES } from '../constants';

// Single request for everything the dashboard needs.
export async function getDashboardData() {
  const data = await api.get('/dashboard');
  return {
    activeCount: data?.activeCount ?? 0,
    totalCount: data?.totalCount ?? 0,
    completedCountYear: data?.completedCountYear ?? 0,
    totalCountYear: data?.totalCountYear ?? 0,
    leadsCount: data?.leadsCount ?? 0,
    totalPending: data?.totalPending ?? 0,
    pendingProjects: data?.pendingProjects ?? [],
    projects: data?.projects ?? [],
    expenses: data?.expenses ?? [],
    payments: data?.payments ?? [],
  };
}

export function isCompleted(status) {
  return COMPLETED_STATUSES.includes((status ?? '').toLowerCase().trim());
}
