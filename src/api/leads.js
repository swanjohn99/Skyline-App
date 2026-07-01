import { api, qs } from '../apiClient';

export async function listLeads() {
  return (await api.get('/leads')) ?? [];
}

export async function getLeadFunnel() {
  return api.get('/leads/funnel');
}

export async function getLead(id) {
  return api.get(`/leads/${id}`);
}

export async function createLead(data) {
  return api.post('/leads', data);
}

export async function updateLead(id, data) {
  return api.patch(`/leads/${id}`, data);
}

export async function deleteLead(id) {
  return api.del(`/leads/${id}`);
}

export async function convertLead(id) {
  return api.post(`/leads/${id}/convert`);
}
