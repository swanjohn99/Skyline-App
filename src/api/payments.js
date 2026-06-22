import { api, qs } from '../apiClient';

export async function listPayments() {
  return (await api.get('/payments')) ?? [];
}

export async function listPaymentsByProject(projectId) {
  return (await api.get(`/payments${qs({ project_id: projectId })}`)) ?? [];
}

export async function createPayment(payment) {
  await api.post('/payments', payment);
}

export async function updatePayment(id, changes) {
  await api.patch(`/payments/${id}`, changes);
}

export async function deletePayment(id) {
  await api.del(`/payments/${id}`);
}
