import { api } from '../apiClient';

export async function listPayments() {
  return (await api.get('/payments')) ?? [];
}

export async function createPayment(payment) {
  await api.post('/payments', payment);
}
