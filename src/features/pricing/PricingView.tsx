import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { upgradePlan } from '../../domain/subscription/upgradePlan';
import { errorHandler } from '../../lib/errorHandler';
import { analytics } from '../../lib/analytics';
import { rateLimiter } from '../../lib/rateLimiter';

const plans = [
  {
    name: 'Pro',
    priceId: 'price_pro_monthly',
    subtitle: 'Solo Operator Tier',
    features: '100 favorites • 5 comparisons • portfolio + alerts',
  },
  {
    name: 'Enterprise',
    priceId: 'price_enterprise_monthly',
    subtitle: 'Trading Desk Tier',
    features: 'Unlimited limits • API priority • dedicated success lane',
  },
];

export const PricingView = (): JSX.Element => {
  const upgradeMutation = useMutation({
    mutationFn: (priceId: string) => upgradePlan(priceId),
    onMutate: (priceId) => {
      analytics.track('upgrade_checkout_started', { priceId });
    },
    onError: (error) => {
      toast.error(errorHandler.toAppError(error).message);
    },
  });

  return (
    <section className="space-y-4">
      <div className="neon-card p-4">
        <h1 className="text-2xl font-semibold neon-title">Upgrade Matrix</h1>
        <p className="text-sm text-fuchsia-200/70">Unlock premium modules and execution speed.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.name} className="neon-card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/70">{plan.subtitle}</p>
            <h2 className="mb-2 text-2xl font-semibold text-white">{plan.name}</h2>
            <p className="mb-5 text-slate-300">{plan.features}</p>
            <button
              className="w-full rounded-xl border border-cyan-300/60 bg-cyan-400/20 px-4 py-2 font-medium text-cyan-100 transition hover:bg-cyan-400/30"
              onClick={() => {
                rateLimiter.assertWithinBudget('checkout-start', 10, 60_000);
                upgradeMutation.mutate(plan.priceId);
              }}
              disabled={upgradeMutation.isPending}
            >
              Initiate {plan.name} Link
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};
