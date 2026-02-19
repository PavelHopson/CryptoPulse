import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { featureFlagService } from '../../services/featureFlagService';
import { Loader } from '../../components/Loader';

export const ComparisonView = (): JSX.Element => {
  const role = useAuthStore((state) => state.profile?.role ?? 'free');
  const { data, isLoading } = useQuery({
    queryKey: ['feature-flag', 'comparison_limit', role],
    queryFn: () => featureFlagService.getFlag('comparison_limit', role),
  });

  if (isLoading) return <Loader />;

  const limit = data?.limit_value ?? 'unlimited';

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold neon-title">Comparison Core</h1>
      <p className="text-slate-300">Current simultaneous comparison limit: <span className="text-cyan-200">{limit}</span>.</p>
      <div className="neon-card p-4">Multi-graph comparison module ready for overlay indicators and strategy presets.</div>
    </section>
  );
};
