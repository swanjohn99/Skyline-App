import { api } from '../apiClient';

export async function listLoans() {
  return (await api.get('/loans')) ?? [];
}

export async function getLoan(id) {
  return api.get(`/loans/${id}`);
}

export async function createLoan(loan) {
  return api.post('/loans', loan);
}

export async function updateLoan(id, changes) {
  await api.patch(`/loans/${id}`, changes);
}

export async function deleteLoan(id) {
  await api.del(`/loans/${id}`);
}
