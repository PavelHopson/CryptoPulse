import { favoritesService } from '../../services/favoritesService';
import { UserRole } from '../../types/domain';
import { errorHandler } from '../../lib/errorHandler';

export const addFavorite = async (input: { userId: string; coinId: string; role: UserRole }): Promise<void> => {
  try {
    await favoritesService.add(input.userId, input.coinId, input.role);
  } catch (error) {
    throw errorHandler.toAppError(error, 'Failed to add favorite');
  }
};
