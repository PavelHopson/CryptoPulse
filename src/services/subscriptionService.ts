import { loadStripe } from '@stripe/stripe-js';
import { env } from '../lib/env';
import { AppError, errorHandler } from '../lib/errorHandler';
import { supabase } from '../lib/supabase';
import { Invoice, Subscription } from '../types/domain';

const assertPriceId = (priceId: string): string => {
  const normalized = priceId.trim();
  if (!/^price_[a-zA-Z0-9_]+$/.test(normalized)) {
    throw new AppError('Invalid price id', 'VALIDATION_ERROR');
  }
  return normalized;
};

export const subscriptionService = {
  async checkout(priceId: string): Promise<void> {
    try {
      const safePriceId = assertPriceId(priceId);
      const { data, error } = await supabase.functions.invoke<{ sessionId: string }>('create-checkout', {
        body: { priceId: safePriceId },
      });
      if (error) throw error;

      if (!env.stripePublicKey) throw new AppError('Missing Stripe public key', 'MISSING_STRIPE_KEY');
      const stripe = await loadStripe(env.stripePublicKey);
      if (!stripe) throw new AppError('Unable to initialize Stripe', 'STRIPE_INIT_ERROR');

      await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (error) {
      throw errorHandler.toAppError(error, 'Unable to start checkout');
    }
  },
  async cancelAtPeriodEnd(): Promise<void> {
    const { error } = await supabase.functions.invoke('cancel-subscription', { body: { cancelAtPeriodEnd: true } });
    if (error) throw errorHandler.toAppError(error, 'Unable to cancel subscription');
  },
  async downgradePlan(targetPlan: 'free' | 'pro'): Promise<void> {
    const { error } = await supabase.functions.invoke('downgrade-subscription', { body: { targetPlan } });
    if (error) throw errorHandler.toAppError(error, 'Unable to downgrade plan');
  },
  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw errorHandler.toAppError(error, 'Unable to fetch subscription');
    return data;
  },
  async getInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase.functions.invoke<Invoice[]>('list-invoices');
    if (error) throw errorHandler.toAppError(error, 'Unable to fetch invoices');
    return data ?? [];
  },
};
