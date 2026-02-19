import { favoritesService } from '../../services/favoritesService';
import { errorHandler } from '../../lib/errorHandler';

export const removeFavorite = async (favoriteId: string): Promise<void> => {
  try {
    await favoritesService.remove(favoriteId);
  } catch (error) {
    throw errorHandler.toAppError(error, 'Failed to remove favorite');
  }
};
