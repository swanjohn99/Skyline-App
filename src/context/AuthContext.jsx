import { useEffect, useState, useCallback } from 'react';
import {
  getSession,
  signOut as apiSignOut,
  signInWithPassword,
  signUpWithPassword,
} from '../api/auth';
import { getMyProfile } from '../api/profiles';
import { ROLES } from '../constants';
import { setUnauthorizedHandler } from '../authSessionHandler';
import { AuthContext } from './auth';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setSession(null);
    setProfile(null);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await getMyProfile());
    } catch (err) {
      if (err.status === 401) {
        clearAuth();
        return;
      }
      console.error('Failed to load profile:', err);
      setProfile(null);
    }
  }, [clearAuth]);

  // Re-reads the session cookie + profile. Used on boot and after auth changes.
  const refreshSession = useCallback(async () => {
    try {
      const nextSession = await getSession();
      setSession(nextSession);
      if (nextSession) {
        await loadProfile();
      } else {
        setProfile(null);
      }
      return nextSession;
    } catch (err) {
      if (err.status === 401) {
        clearAuth();
        return null;
      }
      throw err;
    }
  }, [loadProfile, clearAuth]);

  useEffect(() => {
    setUnauthorizedHandler(clearAuth);
    return () => setUnauthorizedHandler(null);
  }, [clearAuth]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refreshSession();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [refreshSession]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !loading) {
        refreshSession();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshSession, loading]);

  const signIn = useCallback(async (email, password) => {
    await signInWithPassword(email, password);
    await refreshSession();
  }, [refreshSession]);

  const signUp = useCallback(async (email, password) => {
    await signUpWithPassword(email, password);
    await refreshSession();
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    try {
      await apiSignOut();
    } catch {
      // Session may already be invalid on the server.
    }
    clearAuth();
  }, [clearAuth]);

  const role = profile?.role ?? null;

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role,
    companyName: profile?.companies?.name ?? null,
    companyLogoPath: profile?.companies?.logo_path ?? null,
    companyFaviconPath: profile?.companies?.favicon_path ?? null,
    loading,
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
    isOwner: role === ROLES.OWNER,
    canManageTeam: (role === ROLES.OWNER || role === ROLES.SUPER_ADMIN) && Boolean(profile?.company_id),
    hasCompany: Boolean(profile?.company_id),
    needsOnboarding: Boolean(session) && !loading && !profile,
    isPendingApproval: Boolean(profile) && profile?.company_id && profile?.is_active === false,
    refreshProfile: loadProfile,
    refreshSession,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
