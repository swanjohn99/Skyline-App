// Thin fetch wrapper for the PHP API. Same-origin; session cookie is sent
// automatically via credentials: 'include'. Non-2xx responses throw an Error
// whose message is the API's { message } payload (matches existing catch usage).

import { notifyUnauthorized } from './authSessionHandler';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const VIEW_COMPANY_KEY = 'skyline_view_company_id';

export function getViewCompanyId() {
  try {
    return localStorage.getItem(VIEW_COMPANY_KEY) || '';
  } catch {
    return '';
  }
}

export function setViewCompanyId(id) {
  try {
    if (id) localStorage.setItem(VIEW_COMPANY_KEY, id);
    else localStorage.removeItem(VIEW_COMPANY_KEY);
  } catch {
    // ignore storage errors
  }
}

function appendViewCompany(path, method, body) {
  const companyId = getViewCompanyId();
  if (!companyId || path.includes('company_id=')) {
    return { path, body };
  }

  if (method === 'GET') {
    const sep = path.includes('?') ? '&' : '?';
    return { path: `${path}${sep}company_id=${encodeURIComponent(companyId)}`, body };
  }

  if (body !== undefined && typeof body === 'object' && body !== null && !body.company_id) {
    return { path, body: { ...body, company_id: companyId } };
  }

  const sep = path.includes('?') ? '&' : '?';
  return { path: `${path}${sep}company_id=${encodeURIComponent(companyId)}`, body };
}

async function request(method, path, body) {
  const { path: finalPath, body: finalBody } = appendViewCompany(path, method, body);
  const options = {
    method,
    credentials: 'include',
    headers: {},
  };

  if (finalBody !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(finalBody);
  }

  const res = await fetch(`${API_BASE}${finalPath}`, options);

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = data?.code;
    if (res.status === 401 && !finalPath.startsWith('/auth/session') && !finalPath.startsWith('/auth/logout')) {
      notifyUnauthorized();
    }
    throw err;
  }

  return data;
}

async function postForm(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.code = data?.code;
    if (res.status === 401 && !path.startsWith('/auth/session') && !path.startsWith('/auth/logout')) {
      notifyUnauthorized();
    }
    throw err;
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  postForm: (path, formData) => postForm(path, formData),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
};

// Builds a querystring from a params object, skipping null/undefined values.
export function qs(params) {
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}
