import { api } from '../apiClient';

export async function listLenders() {
  return (await api.get('/lenders')) ?? [];
}

export async function createLender(lender) {
  return api.post('/lenders', lender);
}

export async function updateLender(id, changes) {
  await api.patch(`/lenders/${id}`, changes);
}

export async function deleteLender(id) {
  await api.del(`/lenders/${id}`);
}
