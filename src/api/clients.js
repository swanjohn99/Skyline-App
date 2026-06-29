import { api } from '../apiClient';

export async function listClients() {
  return (await api.get('/clients')) ?? [];
}

export async function getClient(id) {
  return api.get(`/clients/${id}`);
}

export async function createClient(client) {
  return api.post('/clients', client);
}

export async function updateClient(id, changes) {
  await api.patch(`/clients/${id}`, changes);
}

export async function deleteClient(id) {
  await api.del(`/clients/${id}`);
}
