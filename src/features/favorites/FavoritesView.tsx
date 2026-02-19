import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addFavorite } from '../../domain/favorites/addFavorite';
import { removeFavorite } from '../../domain/favorites/removeFavorite';
import { EmptyState } from '../../components/EmptyState';
import { Loader } from '../../components/Loader';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { useAuthStore } from '../../store/authStore';
import { favoritesService } from '../../services/favoritesService';
import { errorHandler } from '../../lib/errorHandler';
import { analytics } from '../../lib/analytics';
import { rateLimiter } from '../../lib/rateLimiter';

export const FavoritesView = (): JSX.Element => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();

  const queryKey = ['favorites', user?.id];
  const { data, isLoading } = useQuery({
    queryKey,
    enabled: Boolean(user),
    queryFn: () => favoritesService.list(user!.id),
  });

  useRealtimeTable('favorites', () => {
    void queryClient.invalidateQueries({ queryKey });
  });

  const addMutation = useMutation({
    mutationFn: () => addFavorite({ userId: user!.id, coinId: 'bitcoin', role: profile!.role }),
    onSuccess: async () => {
      analytics.track('feature_used', { feature: 'add_favorite' });
      toast.success('Signal pinned');
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      const appError = errorHandler.toAppError(error, 'Unable to add favorite');
      if (appError.code === 'PLAN_LIMIT_REACHED') {
        analytics.track('upgrade_triggered', { source: 'favorites_limit' });
      }
      toast.error(appError.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (favoriteId: string) => removeFavorite(favoriteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      const appError = errorHandler.toAppError(error, 'Unable to remove favorite');
      toast.error(appError.message);
    },
  });

  const add = useCallback(() => {
    if (!user || !profile) return;
    rateLimiter.assertWithinBudget(`favorites-add-${user.id}`, 30, 60_000);
    addMutation.mutate();
  }, [addMutation, profile, user]);

  if (isLoading) return <Loader />;
  if (!data?.length) {
    return (
      <section className="space-y-3">
        <button className="rounded-xl border border-cyan-300/60 bg-cyan-400/15 px-3 py-2 text-cyan-100" onClick={add}>Pin BTC Signal</button>
        <EmptyState title="Signal vault is empty" description="Pin coins to sync your watchlist across devices in realtime." />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <button className="rounded-xl border border-cyan-300/60 bg-cyan-400/15 px-3 py-2 text-cyan-100" onClick={add} disabled={addMutation.isPending}>Pin BTC Signal</button>
      {data.map((favorite) => (
        <div key={favorite.id} className="neon-card flex items-center justify-between p-3">
          <span>
            {favorite.coin_id}
            {favorite.active === false ? ' (inactive)' : ''}
          </span>
          <button className="text-rose-300" onClick={() => removeMutation.mutate(favorite.id)}>
            Unpin
          </button>
        </div>
      ))}
    </section>
  );
};
