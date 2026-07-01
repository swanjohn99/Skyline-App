import { api, qs } from '../apiClient';

export async function listEntityContacts(entityType, entityId) {
  return (await api.get(`/entity-contacts${qs({ entity_type: entityType, entity_id: entityId })}`)) ?? [];
}

export async function createEntityContact(data) {
  return api.post('/entity-contacts', data);
}

export async function updateEntityContact(id, data) {
  return api.patch(`/entity-contacts/${id}`, data);
}

export async function deleteEntityContact(id) {
  return api.del(`/entity-contacts/${id}`);
}

export async function listEntityProjectTypes(entityType, entityId) {
  return (await api.get(`/entity-project-types${qs({ entity_type: entityType, entity_id: entityId })}`)) ?? [];
}

export async function setEntityProjectTypes(entityType, entityId, projectTypeIds) {
  return api.post('/entity-project-types', {
    entity_type: entityType,
    entity_id: entityId,
    project_type_ids: projectTypeIds,
  });
}

export async function listProjectTypes(activeOnly = true) {
  return (await api.get(`/project-types${qs({ active: activeOnly ? 1 : 0 })}`)) ?? [];
}

export async function createProjectType(data) {
  return api.post('/project-types', data);
}

export async function updateProjectType(id, data) {
  return api.patch(`/project-types/${id}`, data);
}

export async function deleteProjectType(id) {
  return api.del(`/project-types/${id}`);
}
