import { useEffect, useRef } from 'react';
import { UserRole } from '../types/domain';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { handleRoleDowngrade } from '../domain/subscription/handleRoleDowngrade';
import { errorHandler } from '../lib/errorHandler';

const roleScore: Record<UserRole, number> = { free: 1, pro: 2, enterprise: 3 };

export const useAuthSync = (): void => {
  const { setAuth, setLoading } = useAuthStore();
  const previousRoleRef = useRef<UserRole | null>(null);

  useEffect(() => {
    const syncProfile = async (userId: string | null) => {
      if (!userId) {
        setAuth({ user: null, session: null, profile: null });
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const profile = await authService.getProfile(userId);

      const previousRole = previousRoleRef.current;
      const nextRole = profile?.role ?? 'free';
      if (previousRole && roleScore[nextRole] < roleScore[previousRole]) {
        await handleRoleDowngrade({ userId, newRole: nextRole });
      }

      previousRoleRef.current = nextRole;
      setAuth({ user: data.session?.user ?? null, session: data.session ?? null, profile });
      setLoading(false);
    };

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        await syncProfile(data.session?.user?.id ?? null);
      })
      .catch((error) => {
        errorHandler.log(error, 'auth.bootstrap');
        setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncProfile(session?.user?.id ?? null).catch((error) => {
        errorHandler.log(error, 'auth.onAuthStateChange');
      });
    });

    return () => authListener.subscription.unsubscribe();
  }, [setAuth, setLoading]);
};
