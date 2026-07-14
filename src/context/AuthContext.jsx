import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getSession,
  signOut as apiSignOut,
  signInWithPassword,
  signUpWithPassword,
  heartbeat as apiHeartbeat,
} from '../api/auth';
import { getMyProfile } from '../api/profiles';
import { ROLES } from '../constants';
import { setUnauthorizedHandler } from '../authSessionHandler';
import { AuthContext } from './auth';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const IDLE_TICK_MS = 15 * 1000;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionMeta, setSessionMeta] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idleWarning, setIdleWarning] = useState(false);
  const heartbeatBusyRef = useRef(false);

  const clearAuth = useCallback(() => {
    setSession(null);
    setSessionMeta(null);
    setProfile(null);
    setIdleWarning(false);
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

  const refreshSession = useCallback(async () => {
    try {
      const nextSession = await getSession();
      setSession(nextSession);
      setSessionMeta(nextSession?.session ?? null);
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

  const extendSession = useCallback(async () => {
    if (heartbeatBusyRef.current) return;
    heartbeatBusyRef.current = true;
    try {
      const data = await apiHeartbeat();
      if (data?.session) setSessionMeta(data.session);
      setIdleWarning(false);
    } catch (err) {
      if (err.status === 401) clearAuth();
    } finally {
      heartbeatBusyRef.current = false;
    }
  }, [clearAuth]);

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

  // Heartbeat every 5 min while tab is visible so readers-without-clicks stay signed in.
  useEffect(() => {
    if (!session) return undefined;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      extendSession();
    };
    const timer = setInterval(tick, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [session, extendSession]);

  // Idle warning: show banner ~warning_minutes before expires_at; auto-clear on expiry.
  useEffect(() => {
    if (!session || !sessionMeta?.expires_at) {
      setIdleWarning(false);
      return undefined;
    }
    const check = () => {
      const expiresAt = new Date(sessionMeta.expires_at).getTime();
      const warnMs = (sessionMeta.warning_minutes ?? 2) * 60 * 1000;
      const now = Date.now();
      if (now >= expiresAt) {
        clearAuth();
      } else if (now >= expiresAt - warnMs) {
        setIdleWarning(true);
      } else {
        setIdleWarning(false);
      }
    };
    check();
    const timer = setInterval(check, IDLE_TICK_MS);
    return () => clearInterval(timer);
  }, [session, sessionMeta, clearAuth]);

  const signIn = useCallback(async (email, password, rememberMe = false) => {
    const data = await signInWithPassword(email, password, rememberMe);
    if (data?.session) setSessionMeta(data.session);
    await refreshSession();
  }, [refreshSession]);

  const signUp = useCallback(async (email, password, rememberMe = false) => {
    const data = await signUpWithPassword(email, password, rememberMe);
    if (data?.session) setSessionMeta(data.session);
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
    sessionMeta,
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
    idleWarning,
    extendSession,
    dismissIdleWarning: () => setIdleWarning(false),
    refreshProfile: loadProfile,
    refreshSession,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
