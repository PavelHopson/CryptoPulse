import { supabase } from '../lib/supabase';
import { Profile } from '../types/domain';

export const authService = {
  signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  signUpWithEmail(email: string, password: string) {
    return supabase.auth.signUp({ email, password });
  },
  signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  },
  signOut() {
    return supabase.auth.signOut();
  },
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  },
};
