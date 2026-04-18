import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('loads and shows market table', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // CryptoPulse logo — rendered as "CRYPTO" + "PULSE" split spans, so check partial
    await expect(page.getByText('CRYPTO', { exact: false }).first()).toBeVisible();

    // Market category links in nav
    await expect(page.getByRole('link', { name: 'КРИПТО' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'ФОРЕКС' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'ФЬЮЧЕРСЫ' }).first()).toBeVisible();

    // Market table or skeleton should render — wait for either
    // Dashboard renders <table>; skeleton rows appear while loading
    await expect(page.locator('table, [class*="skeleton" i]').first()).toBeVisible({ timeout: 15000 });
  });

  test('can switch market category', async ({ page }) => {
    await page.goto('/');

    // Click ФОРЕКС link
    await page.getByRole('link', { name: 'ФОРЕКС' }).first().click();

    // HashRouter → URL contains #/forex
    await expect(page).toHaveURL(/#\/forex/);

    // Click ФЬЮЧЕРСЫ
    await page.getByRole('link', { name: 'ФЬЮЧЕРСЫ' }).first().click();
    await expect(page).toHaveURL(/#\/futures/);
  });

  test('theme toggle works', async ({ page }) => {
    await page.goto('/');

    // Default theme should be cyberpunk
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'cyberpunk');

    // Open theme picker — button with title="Switch theme"
    await page.getByTitle('Switch theme').first().click();

    // Pick Midnight
    await page.getByRole('button', { name: /midnight/i }).click();

    // data-theme should have switched
    await expect(html).toHaveAttribute('data-theme', 'midnight');

    // localStorage should persist
    const stored = await page.evaluate(() => localStorage.getItem('cryptopulse-theme'));
    expect(stored).toBe('midnight');
  });
});
