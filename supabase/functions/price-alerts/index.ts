import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(`[price-alerts] ${message}`, meta ?? {});
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(`[price-alerts] ${message}`, meta ?? {});
  },
};

const sanitizeCoinId = (coinId: string): string => coinId.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

const enqueueMissingJobs = async (): Promise<void> => {
  const { data: alerts } = await supabase.from('alerts').select('id');
  if (!alerts?.length) return;

  const payload = alerts.map((alert) => ({ alert_id: alert.id }));
  await supabase.from('alert_jobs').upsert(payload, { onConflict: 'alert_id' });
};

Deno.serve(async () => {
  await enqueueMissingJobs();

  const { data: jobs, error: jobsError } = await supabase
    .from('alert_jobs')
    .select('id, alert_id, attempts')
    .eq('status', 'pending')
    .lte('run_at', new Date().toISOString())
    .order('created_at')
    .limit(100);

  if (jobsError) {
    logger.error('Unable to fetch jobs', { error: String(jobsError) });
    return new Response('Unable to fetch jobs', { status: 500 });
  }

  for (const job of jobs ?? []) {
    const { data: alert } = await supabase.from('alerts').select('*').eq('id', job.alert_id).maybeSingle();
    if (!alert) continue;

    const sanitizedCoin = sanitizeCoinId(alert.coin_id);
    if (!sanitizedCoin) continue;

    try {
      await supabase.from('alert_jobs').update({ status: 'processing' }).eq('id', job.id);

      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${sanitizedCoin}&vs_currencies=usd`);
      if (!response.ok) throw new Error('Price provider unavailable');

      const data = (await response.json()) as Record<string, { usd: number }>;
      const currentPrice = data[sanitizedCoin]?.usd;
      const targetPrice = Number(alert.target_price);
      if (!currentPrice || !Number.isFinite(targetPrice)) throw new Error('Invalid price payload');

      const triggered =
        (alert.direction === 'above' && currentPrice >= targetPrice) ||
        (alert.direction === 'below' && currentPrice <= targetPrice);

      if (triggered) {
        logger.info('Alert triggered', { userId: alert.user_id, coinId: sanitizedCoin, targetPrice });
      }

      await supabase
        .from('alert_jobs')
        .update({ status: 'completed', last_error: null, updated_at: new Date().toISOString() })
        .eq('id', job.id);
    } catch (err) {
      const attempts = Number(job.attempts) + 1;
      const terminal = attempts >= 5;

      await supabase
        .from('alert_jobs')
        .update({
          status: terminal ? 'failed' : 'pending',
          attempts,
          last_error: String(err),
          run_at: new Date(Date.now() + attempts * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      logger.error('Alert job failed', { alertId: job.alert_id, attempts, error: String(err) });
    }
  }

  return new Response('ok');
});
