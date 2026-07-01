import { api, qs } from '../apiClient';

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

export async function listGeneratedDocuments(projectId) {
  return (await api.get(`/documents${qs({ project_id: projectId })}`)) ?? [];
}

export async function generateDocument(projectId, templateType) {
  return api.post('/documents/generate', { project_id: projectId, template_type: templateType });
}

export async function listDocumentTemplates() {
  return (await api.get('/document-templates')) ?? [];
}

export function documentDownloadUrl(filePath) {
  if (!filePath) return null;
  return `${API_BASE}/${String(filePath).replace(/^\//, '')}`;
}

export async function uploadDocumentTemplate(templateType, file) {
  const formData = new FormData();
  formData.append('template_type', templateType);
  formData.append('template', file);
  return api.postForm('/document-templates', formData);
}

export async function listAuditLogs(params = {}) {
  return (await api.get(`/audit-logs${qs(params)}`)) ?? [];
}
