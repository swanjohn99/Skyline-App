import { api } from '../apiClient';

export async function listAdminCompanies() {
  return (await api.get('/admin/companies')) ?? [];
}

export async function deleteAdminCompany(id) {
  await api.del(`/admin/companies/${id}`);
}

export async function listAdminUsers() {
  return (await api.get('/admin/users')) ?? [];
}

export async function deleteAdminUser(id) {
  await api.del(`/admin/users/${id}`);
}

export async function updateAdminUser(id, changes) {
  await api.patch(`/admin/users/${id}`, changes);
}
