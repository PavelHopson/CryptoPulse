import Stripe from 'npm:stripe@16.12.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' });
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.info(`[stripe-webhook] ${message}`, meta ?? {});
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(`[stripe-webhook] ${message}`, meta ?? {});
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(`[stripe-webhook] ${message}`, meta ?? {});
  },
};

const notifyFailure = async (message: string, meta?: Record<string, unknown>): Promise<void> => {
  const webhookUrl = Deno.env.get('ALERT_WEBHOOK_URL');
  if (!webhookUrl) return;
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ service: 'stripe-webhook', message, meta }),
  });
};

const rateWindowMs = 60_000;
const rateLimit = 120;
const requestHits = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (key: string): boolean => {
  const now = Date.now();
  const current = requestHits.get(key);
  if (!current || now > current.resetAt) {
    requestHits.set(key, { count: 1, resetAt: now + rateWindowMs });
    return true;
  }
  current.count += 1;
  return current.count <= rateLimit;
};

const withRetry = async (task: () => Promise<void>, retries = 3): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await task();
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
};

Deno.serve(async (request) => {
  try {
    const signature = request.headers.get('stripe-signature');
    const payload = await request.text();
    const source = request.headers.get('x-forwarded-for') ?? 'unknown';

    if (!checkRateLimit(source)) {
      logger.warn('rate limit exceeded', { source });
      return new Response('Rate limit exceeded', { status: 429 });
    }

    if (!signature) return new Response('Missing signature', { status: 400 });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '');
    } catch {
      return new Response('Invalid signature', { status: 400 });
    }

    logger.info('stripe event received', { eventType: event.type });

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.user_id;
      if (!userId) return new Response('Missing user metadata', { status: 400 });

      const plan = subscription.items.data[0]?.price.lookup_key ?? 'free';
      const role = plan.includes('enterprise') ? 'enterprise' : plan.includes('pro') ? 'pro' : 'free';

      await withRetry(async () => {
        const { error } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: String(subscription.customer),
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          plan,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        });
        if (error) throw error;
      });

      await withRetry(async () => {
        const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
        if (error) throw error;
      });

      await withRetry(async () => {
        const { error } = await supabase.from('subscription_events').insert({
          user_id: userId,
          event_type: event.type,
          payload: event,
        });
        if (error) throw error;
      });
    }

    return new Response('ok');
  } catch (error) {
    logger.error('webhook processing failed', { error: String(error) });
    await notifyFailure('webhook processing failed', { error: String(error) });
    return new Response('internal error', { status: 500 });
  }
});
