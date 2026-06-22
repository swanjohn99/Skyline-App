import { api } from '../apiClient';

export async function listProjects() {
  return (await api.get('/projects')) ?? [];
}

export async function getProject(id) {
  return api.get(`/projects/${id}`);
}

// Projects that can still receive expenses/payments (not completed/rejected).
export async function listOpenProjects() {
  return (await api.get('/projects?open=1')) ?? [];
}

export async function createProject(project) {
  return api.post('/projects', project);
}

export async function updateProject(id, changes) {
  await api.patch(`/projects/${id}`, changes);
}

export async function deleteProject(id) {
  await api.del(`/projects/${id}`);
}
