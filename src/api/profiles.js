import { api, qs } from '../apiClient';

export async function getMyProfile() {
  return api.get('/profile');
}

// Creates a company and makes the current user its owner.
export async function createCompany(name, fullName) {
  const data = await api.post('/companies', { name, full_name: fullName || null });
  return data?.id;
}

// Typeahead search for companies to join (returns [] for queries under 2 chars).
export async function searchCompanies(query) {
  return (await api.get(`/companies${qs({ search: query })}`)) ?? [];
}

// Requests to join an existing company as a pending member (needs approval).
export async function joinCompany(companyId, fullName) {
  return api.post('/companies/join', { company_id: companyId, full_name: fullName || null });
}

// Skip company setup — user can use the app without belonging to a company.
export function skipCompanySetup() {
  return api.post('/profile/skip');
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
