import { api, qs } from '../apiClient';

export async function listCustomerAccounts() {
  return (await api.get('/customer-accounts')) ?? [];
}

export async function searchCustomerAccounts(query) {
  return (await api.get(`/customer-accounts${qs({ search: query })}`)) ?? [];
}

export async function getCustomerAccount(id) {
  return api.get(`/customer-accounts/${id}`);
}

export async function createCustomerAccount(account) {
  return api.post('/customer-accounts', account);
}

export async function updateCustomerAccount(id, changes) {
  await api.patch(`/customer-accounts/${id}`, changes);
}

export async function deleteCustomerAccount(id) {
  await api.del(`/customer-accounts/${id}`);
}
