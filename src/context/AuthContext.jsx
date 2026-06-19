import { useEffect, useState, useCallback } from 'react';
import {
  getSession,
  signOut as apiSignOut,
  signInWithPassword,
  signUpWithPassword,
} from '../api/auth';
import { getMyProfile } from '../api/profiles';
import { ROLES } from '../constants';
import { AuthContext } from './auth';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await getMyProfile());
    } catch (err) {
      console.error('Failed to load profile:', err);
      setProfile(null);
    }
  }, []);

  // Re-reads the session cookie + profile. Used on boot and after auth changes.
  const refreshSession = useCallback(async () => {
    const nextSession = await getSession();
    setSession(nextSession);
    if (nextSession) {
      await loadProfile();
    } else {
      setProfile(null);
    }
    return nextSession;
  }, [loadProfile]);

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

  const signIn = useCallback(async (email, password) => {
    await signInWithPassword(email, password);
    await refreshSession();
  }, [refreshSession]);

  const signUp = useCallback(async (email, password) => {
    await signUpWithPassword(email, password);
    await refreshSession();
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setSession(null);
    setProfile(null);
  }, []);

  const role = profile?.role ?? null;

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role,
    companyName: profile?.companies?.name ?? null,
    loading,
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
    isOwner: role === ROLES.OWNER,
    canManageTeam: (role === ROLES.OWNER || role === ROLES.SUPER_ADMIN) && Boolean(profile?.company_id),
    hasCompany: Boolean(profile?.company_id),
    needsOnboarding: Boolean(session) && !loading && !profile,
    // Has a profile but access not yet granted (joined a company, awaiting approval).
    isPendingApproval: Boolean(profile) && profile?.company_id && profile?.is_active === false,
    refreshProfile: loadProfile,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
