import { useEffect, useState, useCallback } from 'react';
import { getSession, onAuthStateChange, signOut as apiSignOut } from '../api/auth';
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

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const initialSession = await getSession();
      if (!active) return;
      setSession(initialSession);
      if (initialSession) await loadProfile();
      if (active) setLoading(false);
    }
    bootstrap();

    const { data: listener } = onAuthStateChange(async (nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) {
        await loadProfile();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

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
    canManageTeam: role === ROLES.OWNER || role === ROLES.SUPER_ADMIN,
    needsOnboarding: Boolean(session) && !loading && !profile,
    refreshProfile: loadProfile,
    signOut: apiSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
