import { api } from '../apiClient';

// Returns { user, session } when logged in, otherwise null.
export async function getSession() {
  try {
    const data = await api.get('/auth/session');
    return data?.user ? { user: data.user, session: data.session ?? null } : null;
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

export async function signInWithPassword(email, password, rememberMe = false) {
  const data = await api.post('/auth/login', { email, password, remember_me: rememberMe });
  return data;
}

export async function signUpWithPassword(email, password, rememberMe = false) {
  const data = await api.post('/auth/signup', { email, password, remember_me: rememberMe });
  return data;
}

export async function heartbeat() {
  const data = await api.post('/auth/heartbeat');
  return data;
}

export function signOut() {
  return api.post('/auth/logout');
}

export function requestPasswordReset(email) {
  return api.post('/auth/forgot-password', { email });
}

export function resetPassword(token, password) {
  return api.post('/auth/reset-password', { token, password });
}
