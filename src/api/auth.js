import { api } from '../apiClient';

// Returns a session-like object ({ user }) when logged in, otherwise null.
export async function getSession() {
  try {
    const data = await api.get('/auth/session');
    return data?.user ? { user: data.user } : null;
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

export async function signInWithPassword(email, password) {
  const data = await api.post('/auth/login', { email, password });
  return data.user;
}

export async function signUpWithPassword(email, password) {
  const data = await api.post('/auth/signup', { email, password });
  return data.user;
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
