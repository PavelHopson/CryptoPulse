import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useRequireRole } from '../../hooks/useRequireRole';
import { analytics } from '../../lib/analytics';

export const PortfolioView = (): JSX.Element => {
  const canAccess = useRequireRole('pro');

  useEffect(() => {
    analytics.track(canAccess ? 'feature_used' : 'paywall_shown', {
      feature: canAccess ? 'portfolio_view' : 'portfolio',
    });
  }, [canAccess]);

  if (!canAccess) {
    return <Navigate to="/pricing" replace />;
  }

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Portfolio</h1>
      <div className="rounded border border-slate-800 p-4">Track holdings, ROI, and P/L with realtime updates.</div>
    </section>
  );
};
