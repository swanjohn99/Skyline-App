import { api } from '../apiClient';

export async function getMyProfile() {
  return api.get('/profile');
}

// Creates a company and makes the current user its owner.
export async function createCompany(name, fullName) {
  const data = await api.post('/companies', { name, full_name: fullName || null });
  return data?.id;
}

export async function listMembers() {
  return (await api.get('/members')) ?? [];
}

export async function setMemberActive(id, isActive) {
  await api.patch(`/members/${id}`, { is_active: isActive });
}

export async function setMemberRole(id, role) {
  await api.patch(`/members/${id}`, { role });
}
