import { useMemo } from 'react';
import { UserRole } from '../types/domain';
import { useAuthStore } from '../store/authStore';

const roleScore: Record<UserRole, number> = { free: 1, pro: 2, enterprise: 3 };

export const useRequireRole = (required: UserRole): boolean => {
  const currentRole = useAuthStore((state) => state.profile?.role ?? 'free');
  return useMemo(() => roleScore[currentRole] >= roleScore[required], [currentRole, required]);
};
