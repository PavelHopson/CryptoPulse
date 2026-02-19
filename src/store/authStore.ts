import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '../types/domain';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setAuth: (payload: Pick<AuthState, 'user' | 'session' | 'profile'>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  setAuth: ({ user, session, profile }) => set({ user, session, profile }),
  setLoading: (loading) => set({ loading }),
}));
