import { test, expect } from '@playwright/test';

test.describe('Strategy Lab', () => {
  test('runs a deterministic paper backtest', async ({ page }) => {
    await page.goto('/#/strategy-lab');

    await expect(page.getByRole('heading', { name: /ПРОВЕРЬ ИДЕЮ, НЕ РИСКУЯ ДЕНЬГАМИ/ })).toBeVisible();
    await expect(page.getByText('DEMO DATASET')).toBeVisible();

    await page.getByRole('button', { name: /ЗАПУСТИТЬ BACKTEST/ }).click();

    await expect(page.getByText('RESEARCH GATES')).toBeVisible();
    await expect(page.getByText('ЖУРНАЛ PAPER-СЦЕНАРИЕВ')).toBeVisible();
    await expect(page.getByText(/Receipt фиксирует dataset/)).toBeVisible();

    const history = await page.evaluate(() => localStorage.getItem('cryptopulse_strategy_history_v1'));
    expect(history).toContain('cryptopulse.strategy-receipt.v1');

    await page.reload();
    await expect(page.getByText(/LOCAL HISTORY · 1\/10/)).toBeVisible();
  });

  test('imports a local CSV dataset before running', async ({ page }) => {
    await page.goto('/#/strategy-lab');

    const start = new Date(Date.UTC(2025, 0, 1));
    const rows = Array.from({ length: 60 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return `${date.toISOString().slice(0, 10)},${100 + index}`;
    });
    const csv = `date,close\n${rows.join('\n')}\n`;
    await page.locator('input[type="file"]').setInputFiles({
      name: 'research.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });

    await expect(page.getByText('LOCAL CSV')).toBeVisible();
    await expect(page.getByText('Источник: research.csv')).toBeVisible();
    await page.getByRole('button', { name: /ЗАПУСТИТЬ BACKTEST/ }).click();
    await expect(page.getByText('RESEARCH GATES')).toBeVisible();
  });
});
