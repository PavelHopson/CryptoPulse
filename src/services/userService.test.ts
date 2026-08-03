import { beforeEach, describe, expect, it } from 'vitest';
import {
  changePassword,
  getUserProfile,
  initializeUserSecurity,
  loginUser,
  registerUser,
  resetAccount,
} from './userService';

const USERS_KEY = 'cryptopulse_users_v2';
const SESSION_KEY = 'cryptopulse_session_id';
const AI_SECRETS_KEY = 'cryptopulse_ai_secrets_v1';

describe('local user security boundary', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('migrates legacy plaintext credentials and API keys out of persistent storage', async () => {
    localStorage.setItem(USERS_KEY, JSON.stringify([{
      id: 'legacy-user',
      name: 'Legacy',
      email: 'legacy@example.com',
      password: 'legacy-password',
      balance: 100,
      equity: 100,
      positions: [],
      transactions: [],
      is_pro: false,
      member_since: '2026-01-01T00:00:00.000Z',
      preferences: {
        currency: 'USD',
        language: 'RU',
        notifications: { email: false, push: false, priceAlerts: false },
        twoFactorEnabled: false,
        ai: { provider: 'openai', model: 'gpt-4o-mini', apiKey: 'legacy-api-key' },
      },
      achievements: [],
      level: 1,
      xp: 0,
    }]));
    localStorage.setItem(SESSION_KEY, 'legacy-user');

    await initializeUserSecurity();

    const persisted = localStorage.getItem(USERS_KEY)!;
    expect(persisted).not.toContain('legacy-password');
    expect(persisted).not.toContain('legacy-api-key');
    expect(JSON.parse(persisted)[0].credential).toMatchObject({
      algorithm: 'PBKDF2-SHA256',
      iterations: 600_000,
    });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('legacy-user');
    expect(sessionStorage.getItem(AI_SECRETS_KEY)).toContain('legacy-api-key');
    expect(getUserProfile().preferences.ai?.apiKey).toBe('legacy-api-key');
  });

  it('registers and authenticates without persisting a plaintext password or session', async () => {
    const registration = await registerUser('Alice', 'Alice@example.com', 'correct horse battery staple');
    expect(registration.success).toBe(true);

    const persisted = localStorage.getItem(USERS_KEY)!;
    expect(persisted).not.toContain('correct horse battery staple');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeTruthy();

    sessionStorage.removeItem(SESSION_KEY);
    expect((await loginUser('alice@example.com', 'wrong password')).success).toBe(false);
    expect((await loginUser('alice@example.com', 'correct horse battery staple')).success).toBe(true);
  });

  it('changes the local password and invalidates the previous credential', async () => {
    await registerUser('Bob', 'bob@example.com', 'old password 123');
    expect((await changePassword('old password 123', 'new password 456')).success).toBe(true);

    sessionStorage.removeItem(SESSION_KEY);
    expect((await loginUser('bob@example.com', 'old password 123')).success).toBe(false);
    expect((await loginUser('bob@example.com', 'new password 456')).success).toBe(true);
  });

  it('keeps the credential when resetting demo portfolio data', async () => {
    await registerUser('Casey', 'casey@example.com', 'reset safe password');
    resetAccount();

    sessionStorage.removeItem(SESSION_KEY);
    expect((await loginUser('casey@example.com', 'reset safe password')).success).toBe(true);
  });

  it('revokes the previously bundled personal credential instead of migrating it', async () => {
    localStorage.setItem(USERS_KEY, JSON.stringify([{
      id: 'pavel-hopson-id',
      name: 'Legacy personal profile',
      email: 'legacy-personal@example.com',
      password: 'already-exposed-password',
      balance: 0,
      equity: 0,
      positions: [],
      transactions: [],
      is_pro: true,
      member_since: '2026-01-01T00:00:00.000Z',
      preferences: {
        currency: 'USD',
        language: 'RU',
        notifications: { email: false, push: false, priceAlerts: false },
        twoFactorEnabled: false,
      },
      achievements: [],
      level: 1,
      xp: 0,
    }]));

    await initializeUserSecurity();

    const personal = JSON.parse(localStorage.getItem(USERS_KEY)!)[0];
    expect(personal.password).toBeUndefined();
    expect(personal.credential).toBeUndefined();
    expect((await loginUser('legacy-personal@example.com', 'already-exposed-password')).success).toBe(false);
  });
});
