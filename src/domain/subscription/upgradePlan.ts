import { subscriptionService } from '../../services/subscriptionService';
import { errorHandler } from '../../lib/errorHandler';

export const upgradePlan = async (priceId: string): Promise<void> => {
  try {
    await subscriptionService.checkout(priceId);
  } catch (error) {
    throw errorHandler.toAppError(error, 'Failed to start checkout');
  }
};
