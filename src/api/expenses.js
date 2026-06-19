import { api, qs } from '../apiClient';

export async function listExpenses() {
  return (await api.get('/expenses')) ?? [];
}

export async function listExpensesByProject(projectId) {
  return (await api.get(`/expenses${qs({ project_id: projectId })}`)) ?? [];
}

export async function createExpense(expense) {
  await api.post('/expenses', expense);
}
