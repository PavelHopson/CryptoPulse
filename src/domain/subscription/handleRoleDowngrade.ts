import { favoritesService } from '../../services/favoritesService';
import { featureFlagService } from '../../services/featureFlagService';
import { UserRole } from '../../types/domain';
import { errorHandler } from '../../lib/errorHandler';
import { logger } from '../../lib/logger';

export const handleRoleDowngrade = async (input: { userId: string; newRole: UserRole }): Promise<void> => {
  try {
    const flag = await featureFlagService.getFlag('favorites_limit', input.newRole);
    const limit = flag?.limit_value ?? Number.MAX_SAFE_INTEGER;

    const favorites = await favoritesService.list(input.userId);
    const activeFavorites = favorites.filter((item) => item.active ?? true);

    if (activeFavorites.length <= limit) return;

    const overflow = activeFavorites.slice(limit);
    await favoritesService.markInactive(overflow.map((item) => item.id));

    logger.info('Role downgrade applied, overflow favorites deactivated', {
      userId: input.userId,
      newRole: input.newRole,
      deactivatedCount: overflow.length,
    });
  } catch (error) {
    throw errorHandler.toAppError(error, 'Failed to apply role downgrade');
  }
};
