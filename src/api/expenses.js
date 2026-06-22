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

export async function updateExpense(id, changes) {
  await api.patch(`/expenses/${id}`, changes);
}

export async function deleteExpense(id) {
  await api.del(`/expenses/${id}`);
}
