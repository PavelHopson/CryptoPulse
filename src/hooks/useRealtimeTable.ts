import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useRealtimeTable = (table: string, onChange: () => void): void => {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, onChange]);
};
