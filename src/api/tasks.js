import { api, qs } from '../apiClient';

export async function listTasks(params = {}) {
  return (await api.get(`/tasks${qs(params)}`)) ?? [];
}

export async function createTask(data) {
  return api.post('/tasks', data);
}

export async function updateTask(id, data) {
  return api.patch(`/tasks/${id}`, data);
}

export async function deleteTask(id) {
  return api.del(`/tasks/${id}`);
}

export async function listWarranties(projectId) {
  return (await api.get(`/warranties${qs({ project_id: projectId })}`)) ?? [];
}

export async function createWarranty(data) {
  return api.post('/warranties', data);
}

export async function updateWarranty(id, data) {
  return api.patch(`/warranties/${id}`, data);
}

export async function deleteWarranty(id) {
  return api.del(`/warranties/${id}`);
}
