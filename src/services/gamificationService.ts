import { UserProfile, Achievement } from '../types';
import { updateUserProfile, getUserProfile } from './userService';

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_paper', title: 'Первый сценарий', description: 'Запустить первый paper-сценарий', icon: '🚀' },
  { id: 'positive_result', title: 'Проверенная гипотеза', description: 'Получить положительную динамику в симуляции и сохранить ограничения', icon: '🧪' },
  { id: 'loss_survivor', title: 'Дисциплина риска', description: 'Разобрать просадку и не скрывать её в отчёте', icon: '🛡️' },
  { id: 'risk_control', title: 'Контроль риска', description: 'Проверить сценарий с ограниченным риском', icon: '⚡' },
  { id: 'diversified', title: 'Широкий обзор', description: 'Сравнить активы из разных исследовательских наборов', icon: '🌐' },
  { id: 'method_compare', title: 'Сравнение методов', description: 'Сопоставить два paper-сценария на одном наборе данных', icon: '👯' }
];

export const checkAchievements = (user: UserProfile): Achievement[] => {
  const unlocked: Achievement[] = [];
  const existingIds = user.achievements?.map(a => a.id) || [];

  // 1. First paper scenario (legacy local profile signal)
  if (user.positions.length > 0 && !existingIds.includes('first_paper')) {
    unlocked.push(ALL_ACHIEVEMENTS.find(a => a.id === 'first_paper')!);
  }

  // 2. Positive paper outcome (legacy local profile signal)
  const paperDelta = user.equity - 100000;
  if (paperDelta > 1000 && !existingIds.includes('positive_result')) {
    unlocked.push(ALL_ACHIEVEMENTS.find(a => a.id === 'positive_result')!);
  }

  // 3. Risk-control scenario (legacy local profile signal)
  const hasHighLev = user.positions.some(p => p.leverage >= 20);
  if (hasHighLev && !existingIds.includes('risk_control')) {
    unlocked.push(ALL_ACHIEVEMENTS.find(a => a.id === 'risk_control')!);
  }
  
  // If new achievements
  if (unlocked.length > 0) {
    const newAchievements = [...(user.achievements || []), ...unlocked.map(a => ({...a, unlockedAt: new Date().toISOString()}))];
    // Level up logic: 1 Badge = 100 XP. Level = XP / 200
    const newXP = (user.xp || 0) + (unlocked.length * 100);
    const newLevel = Math.floor(newXP / 200) + 1;
    
    updateUserProfile({
      achievements: newAchievements,
      xp: newXP,
      level: newLevel
    });
    
    return unlocked;
  }

  return [];
};

export const getLevelProgress = (user: UserProfile) => {
    const currentLevelXP = (user.level - 1) * 200;
    const nextLevelXP = user.level * 200;
    const currentXP = user.xp || 0;
    const progress = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(Math.max(progress, 0), 100);
};
