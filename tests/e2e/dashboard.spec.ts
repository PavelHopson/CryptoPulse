import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads and shows market table', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // The compact mobile header exposes the market entry point; the desktop
    // header exposes the wordmark. Use the control that is visible per layout.
    if (testInfo.project.name === 'mobile-chromium') {
      await expect(page.getByRole('button', { name: 'Открыть разделы рынка' })).toBeVisible();
    } else {
      await expect(page.getByText('CRYPTO', { exact: false }).first()).toBeVisible();
    }

    // Crypto is available in both the desktop and mobile navigation.
    await expect(page.getByRole('link', { name: 'КРИПТО' }).first()).toBeVisible();

    // Forex and futures are desktop-only links; mobile keeps them behind the
    // market entry point instead of putting every category into the bottom bar.
    if (testInfo.project.name !== 'mobile-chromium') {
      await expect(page.getByRole('link', { name: 'ФОРЕКС' }).first()).toBeVisible();
      await expect(page.getByRole('link', { name: 'ФЬЮЧЕРСЫ' }).first()).toBeVisible();
    }

    // Market table or skeleton should render — wait for either
    // Dashboard renders <table>; skeleton rows appear while loading
    await expect(page.locator('table, [class*="skeleton" i]').first()).toBeVisible({ timeout: 15000 });
  });

  test('can switch market category', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Mobile navigation exposes the primary market entry only');
    await page.goto('/');

    // Click ФОРЕКС link
    await page.getByRole('link', { name: 'ФОРЕКС' }).first().click();

    // HashRouter → URL contains #/forex
    await expect(page).toHaveURL(/#\/forex/);

    // Click ФЬЮЧЕРСЫ
    await page.getByRole('link', { name: 'ФЬЮЧЕРСЫ' }).first().click();
    await expect(page).toHaveURL(/#\/futures/);
  });

  test('opens market sections on mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'Market sections menu is a mobile-only flow');
    await page.goto('/');

    await page.getByRole('button', { name: 'Открыть разделы рынка' }).click();

    const menu = page.getByRole('dialog', { name: 'РАЗДЕЛЫ РЫНКА' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: /^ФОРЕКС/ })).toBeVisible();
    await expect(menu.getByRole('link', { name: /^ФЬЮЧЕРСЫ/ })).toBeVisible();

    await menu.getByRole('link', { name: /^ФОРЕКС/ }).click();
    await expect(page).toHaveURL(/#\/forex/);
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/');

    // Default theme should be cyberpunk
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'cyberpunk');

    // Open theme picker — button with title="Switch theme"
    await page.locator('[title="Switch theme"]:visible').first().click();

    // Pick Midnight
    await page.getByRole('menuitemradio', { name: /midnight/i }).click();

    // data-theme should have switched
    await expect(html).toHaveAttribute('data-theme', 'midnight');

    // localStorage should persist
    const stored = await page.evaluate(() => localStorage.getItem('cryptopulse-theme'));
    expect(stored).toBe('midnight');
  });
});
