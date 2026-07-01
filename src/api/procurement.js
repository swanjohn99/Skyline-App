import { api, qs } from '../apiClient';

export async function listVendors() {
  return (await api.get('/vendors')) ?? [];
}

export async function createVendor(data) {
  return api.post('/vendors', data);
}

export async function updateVendor(id, data) {
  return api.patch(`/vendors/${id}`, data);
}

export async function deleteVendor(id) {
  return api.del(`/vendors/${id}`);
}

export async function listChemicals() {
  return (await api.get('/chemicals')) ?? [];
}

export async function createChemical(data) {
  return api.post('/chemicals', data);
}

export async function updateChemical(id, data) {
  return api.patch(`/chemicals/${id}`, data);
}

export async function deleteChemical(id) {
  return api.del(`/chemicals/${id}`);
}

export async function listVendorPricing(params = {}) {
  return (await api.get(`/vendor-pricing${qs(params)}`)) ?? [];
}

export async function getLatestVendorPrice(vendorId, chemicalId, asOf) {
  return api.get(`/vendor-pricing/latest${qs({ vendor_id: vendorId, chemical_id: chemicalId, as_of: asOf })}`);
}

export async function createVendorPrice(data) {
  return api.post('/vendor-pricing', data);
}
