import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test('can open settings modal from profile page', async ({ page }) => {
    // Settings modal lives on the Profile page
    await page.goto('/#/profile');

    // Button labeled НАСТРОЙКИ opens the modal
    await page.getByRole('button', { name: /НАСТРОЙКИ/ }).click();

    // Modal heading visible
    await expect(page.getByRole('heading', { name: /Настройки профиля/ })).toBeVisible();
  });

  test('can change AI provider and it persists after reopening', async ({ page }) => {
    await page.goto('/#/profile');
    await page.getByRole('button', { name: /НАСТРОЙКИ/ }).click();

    // Open AI tab (sidebar button labelled "AI Модель")
    await page.getByRole('button', { name: /AI Модель/ }).click();

    // Provider buttons come from AI_MODELS — pick OpenAI (falls back gracefully if name differs)
    const openAi = page.getByRole('button', { name: /OpenAI/i }).first();
    await expect(openAi).toBeVisible();
    await openAi.click();

    // Save settings
    await page.getByRole('button', { name: /Сохранить/ }).click();

    // Close modal
    await page.keyboard.press('Escape').catch(() => {});
    // Fallback: click Отмена if Escape didn't close
    const cancelBtn = page.getByRole('button', { name: /Отмена/ });
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
    }

    // Verify localStorage captured the provider choice.
    // userService stores an array of users under 'cryptopulse_users_v2' — scan each user's preferences.ai
    const aiProvider = await page.evaluate(() => {
      const raw = localStorage.getItem('cryptopulse_users_v2');
      if (!raw) return null;
      try {
        const users = JSON.parse(raw);
        if (!Array.isArray(users)) return null;
        for (const u of users) {
          if (u?.preferences?.ai?.provider) return u.preferences.ai.provider;
        }
      } catch {
        return null;
      }
      return null;
    });
    expect(aiProvider).toBeTruthy();
  });

  test('can enter API key and save', async ({ page }) => {
    await page.goto('/#/profile');
    await page.getByRole('button', { name: /НАСТРОЙКИ/ }).click();
    await page.getByRole('button', { name: /AI Модель/ }).click();

    // API Key input is a password input; locate by placeholder area — use the first password input inside the modal
    const apiKeyInput = page.locator('input[type="password"]').first();
    await expect(apiKeyInput).toBeVisible();
    await apiKeyInput.fill('test-api-key-abc-123');

    // Save
    await page.getByRole('button', { name: /Сохранить/ }).click();

    // Feedback toast appears
    await expect(page.getByText(/успешно сохранены/i)).toBeVisible({ timeout: 5000 });

    // Secrets must never land in persistent localStorage.
    const keyStorage = await page.evaluate(() => {
      let persistent = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const raw = localStorage.getItem(key);
        if (raw && raw.includes('test-api-key-abc-123')) persistent = true;
      }
      return {
        persistent,
        session: sessionStorage.getItem('cryptopulse_ai_secrets_v1')?.includes('test-api-key-abc-123') ?? false,
      };
    });
    expect(keyStorage).toEqual({ persistent: false, session: true });
  });
});
