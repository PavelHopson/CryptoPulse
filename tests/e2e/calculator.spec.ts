import { test, expect } from '@playwright/test';

test.describe('Position Calculator', () => {
  test('opens from header button', async ({ page }) => {
    await page.goto('/');

    // Header button has title="Position Calculator"
    await page.getByTitle('Position Calculator').click();

    // Modal heading
    await expect(page.getByRole('heading', { name: /КАЛЬКУЛЯТОР ПОЗИЦИИ/ })).toBeVisible();

    // Key metric labels
    await expect(page.getByText(/Ликвидация/)).toBeVisible();
    await expect(page.getByText(/Безубыток/)).toBeVisible();
  });

  test('computes PnL rows when inputs change', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Position Calculator').click();

    // Locate the three number inputs in the modal (entry price, position size, leverage range)
    const numberInputs = page.locator('input[type="number"]');
    await expect(numberInputs).toHaveCount(2);

    // Entry price = 50000
    await numberInputs.nth(0).fill('50000');
    // Position size = 1000
    await numberInputs.nth(1).fill('1000');

    // Leverage slider → set to 10 via keyboard
    const leverageSlider = page.locator('input[type="range"]');
    await leverageSlider.fill('10');

    // PnL table should show percent rows
    await expect(page.getByText('+25%', { exact: false })).toBeVisible();
    await expect(page.getByText('+10%', { exact: false })).toBeVisible();
    await expect(page.getByText('-10%', { exact: false })).toBeVisible();

    // The "Объем" (notional) should reflect 1000 * 10 = $10,000
    await expect(page.getByText(/\$10,000/)).toBeVisible();
  });

  test('can switch between LONG and SHORT', async ({ page }) => {
    await page.goto('/');
    await page.getByTitle('Position Calculator').click();

    const longBtn = page.getByRole('button', { name: /LONG/ });
    const shortBtn = page.getByRole('button', { name: /SHORT/ });

    await expect(longBtn).toBeVisible();
    await expect(shortBtn).toBeVisible();

    await shortBtn.click();
    // After switching, calculations still render — liquidation label still visible
    await expect(page.getByText(/Ликвидация/)).toBeVisible();
  });
});
