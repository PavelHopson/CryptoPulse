import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { subscriptionService } from '../../services/subscriptionService';
import { Loader } from '../../components/Loader';
import { EmptyState } from '../../components/EmptyState';

const formatCountdown = (targetIso: string | null): string => {
  if (!targetIso) return 'Триал не активен';
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return 'Триал завершен';
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days} дн. осталось`;
};

export const BillingView = (): JSX.Element => {
  const userId = useAuthStore((state) => state.user?.id);

  const subQuery = useQuery({
    queryKey: ['billing', 'subscription', userId],
    enabled: Boolean(userId),
    queryFn: () => subscriptionService.getCurrentSubscription(userId!),
  });

  const invoicesQuery = useQuery({
    queryKey: ['billing', 'invoices', userId],
    enabled: Boolean(userId),
    queryFn: () => subscriptionService.getInvoices(),
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionService.cancelAtPeriodEnd(),
  });

  const subscription = subQuery.data;
  const renewalDate = useMemo(() => {
    if (!subscription?.current_period_end) return 'N/A';
    return new Date(subscription.current_period_end).toLocaleDateString();
  }, [subscription?.current_period_end]);

  if (subQuery.isLoading || invoicesQuery.isLoading) return <Loader />;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold neon-title">Центр биллинга</h1>
      {!subscription ? (
        <EmptyState title="Подписка отсутствует" description="Выберите тариф, чтобы открыть Pro-возможности." />
      ) : (
        <article className="neon-card space-y-2 p-4">
          <h2 className="text-xl text-cyan-200">Статус подписки</h2>
          <p>Тариф: <strong className="text-white">{subscription.plan}</strong></p>
          <p>Статус: <strong className="text-white">{subscription.status}</strong></p>
          <p>Следующее продление: <strong className="text-white">{renewalDate}</strong></p>
          <p>Осталось по триалу: <strong className="text-white">{formatCountdown(subscription.trial_end)}</strong></p>
          <button
            className="rounded-xl border border-amber-300/60 bg-amber-400/10 px-3 py-2 text-amber-200"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending || subscription.cancel_at_period_end}
          >
            {subscription.cancel_at_period_end ? 'Отмена уже запланирована' : 'Отменить в конце периода'}
          </button>
        </article>
      )}

      <article className="neon-card space-y-3 p-4">
        <h2 className="text-xl text-fuchsia-200">История инвойсов</h2>
        {!invoicesQuery.data?.length ? (
          <p className="text-slate-400">Инвойсов пока нет.</p>
        ) : (
          <div className="space-y-2">
            {invoicesQuery.data.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-900/50 p-2">
                <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                <span>{(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}</span>
                <span>{invoice.status}</span>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
};
