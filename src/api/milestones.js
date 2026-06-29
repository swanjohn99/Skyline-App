import { api } from '../apiClient';

export function listMilestones() {
  return api.get('/milestones');
}

export function listMilestonesByProject(projectId) {
  return api.get(`/milestones?project_id=${encodeURIComponent(projectId)}`);
}

export function createMilestone(payload) {
  return api.post('/milestones', payload);
}

export function updateMilestone(id, payload) {
  return api.patch(`/milestones/${id}`, payload);
}

export function deleteMilestone(id) {
  return api.del(`/milestones/${id}`);
}
