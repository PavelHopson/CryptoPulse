
import { UserProfile, Position, CoinData, Transaction, AssetAllocation, PerformancePoint, UserActivity } from '../types';

const STORAGE_KEY_USERS = 'cryptopulse_users_v2';
const STORAGE_KEY_SESSION = 'cryptopulse_session_id';
const STORAGE_KEY_ACTIVITY = 'cryptopulse_user_activity';
const SESSION_KEY_AI_SECRETS = 'cryptopulse_ai_secrets_v1';
const PASSWORD_ITERATIONS = 600_000;
const PASSWORD_ALGORITHM = 'PBKDF2-SHA256' as const;
const MAX_PASSWORD_LENGTH = 128;
const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

interface PasswordCredential {
  algorithm: typeof PASSWORD_ALGORITHM;
  hash: string;
  iterations: number;
  salt: string;
}

type StoredUserProfile = UserProfile & {
  credential?: PasswordCredential;
  /** Legacy field accepted only long enough to migrate it out of localStorage. */
  password?: string;
};

const INITIAL_STATE: StoredUserProfile = {
  id: 'demo-user',
  name: "Трейдер (Демо)",
  email: "demo@cryptopulse.ai",
  credential: {
    algorithm: PASSWORD_ALGORITHM,
    hash: 'pDJzIjIjP+wtWNwj4fjdbIhNSIVuwVbM7Hx+HlPfhuw=',
    iterations: PASSWORD_ITERATIONS,
    salt: 'Y3J5cHRvcHVsc2UtZGVtbw==',
  },
  avatar: '',
  balance: 100000,
  equity: 100000,
  positions: [],
  transactions: [],
  is_pro: false, // Changed default to false to show ads for new users
  member_since: new Date().toISOString(),
  preferences: {
    currency: 'USD',
    language: 'RU',
    notifications: {
      email: true,
      push: true,
      priceAlerts: false
    },
    twoFactorEnabled: false
  },
  achievements: [],
  level: 1,
  xp: 0
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function createCredential(password: string): Promise<PasswordCredential> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    algorithm: PASSWORD_ALGORITHM,
    hash: bytesToBase64(await derivePasswordHash(password, salt, PASSWORD_ITERATIONS)),
    iterations: PASSWORD_ITERATIONS,
    salt: bytesToBase64(salt),
  };
}

async function verifyCredential(password: string, credential: PasswordCredential): Promise<boolean> {
  if (credential.algorithm !== PASSWORD_ALGORITHM || credential.iterations !== PASSWORD_ITERATIONS) return false;
  try {
    const actual = await derivePasswordHash(password, base64ToBytes(credential.salt), credential.iterations);
    const expected = base64ToBytes(credential.hash);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

function loadAllUsers(): StoredUserProfile[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getAiSecrets(): Record<string, string> {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY_AI_SECRETS) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function setAiSecret(userId: string, apiKey: string): void {
  const secrets = getAiSecrets();
  if (apiKey) secrets[userId] = apiKey;
  else delete secrets[userId];
  if (Object.keys(secrets).length > 0) sessionStorage.setItem(SESSION_KEY_AI_SECRETS, JSON.stringify(secrets));
  else sessionStorage.removeItem(SESSION_KEY_AI_SECRETS);
}

function sanitizeForPersistentStorage(user: StoredUserProfile): StoredUserProfile {
  const safeUser: StoredUserProfile = {
    ...user,
    preferences: {
      ...user.preferences,
      ...(user.preferences.ai ? { ai: { ...user.preferences.ai, apiKey: '' } } : {}),
    },
  };
  delete safeUser.password;
  return safeUser;
}

const saveAllUsers = (users: StoredUserProfile[]) => {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users.map(sanitizeForPersistentStorage)));
};

const getAllUsers = (): StoredUserProfile[] => {
  const users = loadAllUsers();
  if (!users.find(u => u.id === 'demo-user')) {
    users.push(structuredClone(INITIAL_STATE));
    saveAllUsers(users);
  }
  return users;
};

function toPublicProfile(user: StoredUserProfile): UserProfile {
  const { credential: _credential, password: _password, ...publicUser } = user;
  const secret = user.id ? getAiSecrets()[user.id] : undefined;
  return {
    ...publicUser,
    preferences: {
      ...publicUser.preferences,
      ...(publicUser.preferences.ai
        ? { ai: { ...publicUser.preferences.ai, apiKey: secret || '' } }
        : {}),
    },
  };
}

export async function initializeUserSecurity(): Promise<void> {
  const users = loadAllUsers();
  let changed = false;

  for (const user of users) {
    const apiKey = user.preferences?.ai?.apiKey;
    if (user.id && apiKey) {
      setAiSecret(user.id, apiKey);
      user.preferences.ai!.apiKey = '';
      changed = true;
    }

    // A privileged personal credential was previously bundled in the client. It is compromised
    // by definition and must never be converted into another still-valid local credential.
    if (user.id === 'pavel-hopson-id') {
      if (user.password || user.credential) changed = true;
      delete user.password;
      delete user.credential;
    } else if (typeof user.password === 'string') {
      if (user.password.length > 0 && user.password.length <= MAX_PASSWORD_LENGTH) {
        user.credential = await createCredential(user.password);
      }
      delete user.password;
      changed = true;
    }
  }

  if (!users.find(user => user.id === 'demo-user')) {
    users.push(structuredClone(INITIAL_STATE));
    changed = true;
  }

  const legacySession = localStorage.getItem(STORAGE_KEY_SESSION);
  if (legacySession && !sessionStorage.getItem(STORAGE_KEY_SESSION)) {
    sessionStorage.setItem(STORAGE_KEY_SESSION, legacySession);
  }
  if (legacySession) {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    changed = true;
  }

  if (changed) saveAllUsers(users);
}

export const logUserActivity = (userId: string, type: UserActivity['type'], details: string) => {
  const storedLogs = localStorage.getItem(STORAGE_KEY_ACTIVITY);
  const logs: UserActivity[] = storedLogs ? JSON.parse(storedLogs) : [];
  
  const newLog: UserActivity = {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    type,
    details,
    timestamp: new Date().toISOString(),
  };

  // Keep last 500 logs total
  const updatedLogs = [newLog, ...logs].slice(0, 500);
  localStorage.setItem(STORAGE_KEY_ACTIVITY, JSON.stringify(updatedLogs));
};

// --- Public API ---

export const getUserProfile = (): UserProfile => {
  const users = getAllUsers();
  const sessionId = sessionStorage.getItem(STORAGE_KEY_SESSION);
  
  if (!sessionId) {
     // No session, try to default to demo
     const demo = users.find(u => u.id === 'demo-user');
     if (demo) {
       sessionStorage.setItem(STORAGE_KEY_SESSION, 'demo-user');
       return toPublicProfile(demo);
     }
     return toPublicProfile(users[0]);
  }

  const user = users.find(u => u.id === sessionId);
  
  if (!user) {
      // Session ID invalid (user deleted?), fallback to demo
      const demo = users.find(u => u.id === 'demo-user');
      if (demo) {
        sessionStorage.setItem(STORAGE_KEY_SESSION, 'demo-user');
        return toPublicProfile(demo);
      }
      return toPublicProfile(users[0]);
  }
  
  return toPublicProfile(user);
};

export const registerUser = async (name: string, email: string, password: string): Promise<{ success: boolean, message: string }> => {
  await initializeUserSecurity();
  const users = getAllUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (password.length < 8 || password.length > MAX_PASSWORD_LENGTH) {
    return { success: false, message: 'Пароль должен содержать от 8 до 128 символов' };
  }
  
  if (users.find(u => u.email.toLowerCase() === normalizedEmail)) {
    return { success: false, message: 'Пользователь с таким email уже существует' };
  }

  const newUser: StoredUserProfile = {
    ...structuredClone(INITIAL_STATE),
    id: Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    email: normalizedEmail,
    credential: await createCredential(password),
    avatar: '',
    member_since: new Date().toISOString(),
    balance: 10000, // Bonus
    equity: 10000,
    transactions: [],
    positions: [],
    achievements: [],
    level: 1,
    xp: 0,
    is_pro: false // Explicitly false for new registrations
  };

  users.push(newUser);
  saveAllUsers(users);
  sessionStorage.setItem(STORAGE_KEY_SESSION, newUser.id!);
  logUserActivity(newUser.id!, 'LOGIN', 'New user registration');
  return { success: true, message: 'Регистрация успешна' };
};

export const loginUser = async (email: string, password: string): Promise<{ success: boolean, message: string }> => {
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    return { success: false, message: 'Неверный email или пароль' };
  }
  await initializeUserSecurity();
  const users = getAllUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = users.find(u => u.email.toLowerCase() === normalizedEmail);
  
  if (user?.id && user.credential && await verifyCredential(password, user.credential)) {
    sessionStorage.setItem(STORAGE_KEY_SESSION, user.id);
    logUserActivity(user.id, 'LOGIN', 'Login via email');
    return { success: true, message: 'Вход выполнен успешно' };
  }
  return { success: false, message: 'Неверный email или пароль' };
};

export const logoutUser = () => {
  sessionStorage.removeItem(STORAGE_KEY_SESSION);
  sessionStorage.removeItem(SESSION_KEY_AI_SECRETS);
  localStorage.removeItem(STORAGE_KEY_SESSION);
  window.location.reload();
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> => {
  if (newPassword.length < 8 || newPassword.length > MAX_PASSWORD_LENGTH) {
    return { success: false, message: 'Новый пароль должен содержать от 8 до 128 символов' };
  }
  await initializeUserSecurity();
  const current = getUserProfile();
  const users = getAllUsers();
  const index = users.findIndex(user => user.id === current.id);
  const stored = users[index];
  if (!stored?.credential || !await verifyCredential(currentPassword, stored.credential)) {
    return { success: false, message: 'Текущий пароль указан неверно' };
  }
  stored.credential = await createCredential(newPassword);
  saveAllUsers(users);
  logUserActivity(stored.id!, 'SECURITY_UPDATE', 'Local password changed');
  return { success: true, message: 'Пароль изменён для этого браузера' };
};

export const updateUserProfile = (updates: Partial<UserProfile>): UserProfile => {
  const current = getUserProfile();
  if (!current.id) return current;

  const users = getAllUsers();
  const index = users.findIndex(u => u.id === current.id);
  
  if (index === -1) return current;

  // Perform deep merge for preferences
  const updatedUser: StoredUserProfile = { ...users[index], ...updates };
  if (updates.preferences) {
    updatedUser.preferences = {
      ...current.preferences,
      ...updates.preferences,
      notifications: {
        ...current.preferences.notifications,
        ...updates.preferences.notifications
      }
    };
  }

  if (current.id && updates.preferences?.ai) {
    setAiSecret(current.id, updates.preferences.ai.apiKey);
  }

  users[index] = updatedUser;
  saveAllUsers(users);
  
  // Logging
  if (updates.avatar) logUserActivity(current.id, 'PROFILE_UPDATE', 'Avatar changed');
  else if (updates.name || updates.email) logUserActivity(current.id, 'PROFILE_UPDATE', 'Profile details updated');
  else if (updates.preferences) logUserActivity(current.id, 'PROFILE_UPDATE', 'Preferences updated');
  else if (updates.is_pro !== undefined) logUserActivity(current.id, 'PROFILE_UPDATE', `Subscription status changed to ${updates.is_pro ? 'PRO' : 'FREE'}`);

  return toPublicProfile(updatedUser);
};

export const resetAccount = (): UserProfile => {
  const current = getUserProfile();
  if (!current.id) return current;
  const users = getAllUsers();
  const index = users.findIndex(u => u.id === current.id);
  if (index === -1) return current;

  const resetUser: StoredUserProfile = {
    ...users[index],
    balance: 100000,
    equity: 100000,
    positions: [],
    transactions: [],
    achievements: [],
    level: 1,
    xp: 0
  };

  users[index] = resetUser;
  saveAllUsers(users);
  logUserActivity(current.id, 'SECURITY_UPDATE', 'Account reset performed');

  return toPublicProfile(resetUser);
};

export const depositFunds = (amount: number, currency: 'USD' | 'EUR' | 'RUB', method: string) => {
  const profile = getUserProfile();
  if (!profile.id) return profile;
  
  let usdAmount = amount;
  if (currency === 'RUB') usdAmount = amount / 92.5;
  if (currency === 'EUR') usdAmount = amount * 1.08;

  const transaction: Transaction = {
    id: Math.random().toString(36).substr(2, 9),
    type: 'DEPOSIT',
    amount: usdAmount,
    currency: 'USD', 
    status: 'COMPLETED',
    date: new Date().toISOString()
  };

  const updated = {
    ...profile,
    balance: profile.balance + usdAmount,
    transactions: [transaction, ...(profile.transactions || [])]
  };

  updateUserProfile(updated);
  logUserActivity(profile.id, 'BALANCE_ADJUSTMENT', `Deposit: +$${usdAmount.toFixed(2)} via ${method}`);
  return updated;
};

export const executeTrade = (
  asset: CoinData, 
  type: 'LONG' | 'SHORT', 
  amount: number, 
  leverage: number = 1
): { success: boolean; message: string } => {
  const profile = getUserProfile();
  
  const totalValue = asset.current_price * amount;
  const marginRequired = totalValue / leverage;

  if (profile.balance < marginRequired) {
    return { success: false, message: `Недостаточно средств. Требуется: $${marginRequired.toFixed(2)}` };
  }

  const newPosition: Position = {
    id: Math.random().toString(36).substr(2, 9),
    assetId: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    type,
    entryPrice: asset.current_price,
    amount,
    leverage,
    timestamp: Date.now(),
  };

  const updated = {
    ...profile,
    balance: profile.balance - marginRequired,
    positions: [newPosition, ...profile.positions]
  };
  
  updateUserProfile(updated);
  return { success: true, message: `Ордер ${type} исполнен: ${amount} ${asset.symbol}` };
};

export const closePosition = (positionId: string, currentPrice: number): UserProfile => {
  const profile = getUserProfile();
  const positionIndex = profile.positions.findIndex(p => p.id === positionId);
  
  if (positionIndex === -1) return profile;

  const pos = profile.positions[positionIndex];
  
  let pnl = 0;
  if (pos.type === 'LONG') {
    pnl = (currentPrice - pos.entryPrice) * pos.amount;
  } else {
    pnl = (pos.entryPrice - currentPrice) * pos.amount;
  }

  const margin = (pos.entryPrice * pos.amount) / pos.leverage;
  
  const updated = {
    ...profile,
    balance: profile.balance + margin + pnl,
    positions: profile.positions.filter(p => p.id !== positionId)
  };
  
  updateUserProfile(updated);
  return updated;
};

export const calculateEquity = (profile: UserProfile, currentPrices: Record<string, number>): number => {
  let unrealizedPnL = 0;
  
  profile.positions.forEach(pos => {
    const currentPrice = currentPrices[pos.assetId] || pos.entryPrice;
    if (pos.type === 'LONG') {
      unrealizedPnL += (currentPrice - pos.entryPrice) * pos.amount;
    } else {
      unrealizedPnL += (pos.entryPrice - currentPrice) * pos.amount;
    }
  });
  
  const totalUsedMargin = profile.positions.reduce((sum, pos) => {
    return sum + ((pos.entryPrice * pos.amount) / pos.leverage);
  }, 0);

  return profile.balance + totalUsedMargin + unrealizedPnL;
};

export const getAssetAllocation = (user: UserProfile, currentPrices: Record<string, number>): AssetAllocation[] => {
  const totalEquity = calculateEquity(user, currentPrices);
  const allocation: AssetAllocation[] = [];

  if (user.balance > 0) {
    allocation.push({
      name: 'US Dollar',
      symbol: 'USD',
      value: user.balance,
      percentage: 0, 
      color: '#10b981'
    });
  }

  user.positions.forEach((pos, index) => {
    const price = currentPrices[pos.assetId] || pos.entryPrice;
    let pnl = 0;
    if (pos.type === 'LONG') {
      pnl = (price - pos.entryPrice) * pos.amount;
    } else {
      pnl = (pos.entryPrice - price) * pos.amount;
    }
    const margin = (pos.entryPrice * pos.amount) / pos.leverage;
    const posValue = Math.max(0, margin + pnl); 

    if (posValue > 0) {
      allocation.push({
        name: pos.name,
        symbol: pos.symbol,
        value: posValue,
        percentage: 0,
        color: COLORS[index % COLORS.length]
      });
    }
  });

  return allocation.map(item => ({
    ...item,
    percentage: (item.value / totalEquity) * 100
  })).sort((a, b) => b.value - a.value);
};

export const getPerformanceHistory = (user: UserProfile): PerformancePoint[] => {
  const points: PerformancePoint[] = [];
  const days = 30;
  const now = Date.now();
  let currentValue = user.equity; 
  
  for (let i = 0; i < days; i++) {
    points.push({
      date: new Date(now - i * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      value: currentValue
    });
    
    const change = 1 + (Math.random() - 0.5) * 0.05;
    currentValue = currentValue / change;
  }
  
  return points.reverse();
};
