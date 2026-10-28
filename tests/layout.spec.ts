import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('desktop workbench fits without document or fixture scrolling and has one execution action', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  const assertFit = async () => {
    expect(await page.evaluate(() => ({
      vertical: document.documentElement.scrollHeight <= innerHeight,
      horizontal: document.documentElement.scrollWidth <= innerWidth,
    }))).toEqual({ vertical: true, horizontal: true });
    for (const selector of ['.experiment-heading', '.timeline', '.fixture-window', '.narration-panel', '.evidence-panel']) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual((await page.viewportSize())!.height);
    }
    await expect(page.getByRole('button', { name: 'Run Scenario', exact: true })).toHaveCount(1);
    await expect(page.getByText('1-click demo', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Judge Demo Mode/ })).toHaveCount(0);
  };
  for (const name of ['01 Double-click checkout', '02 Workspace switch', '03 Stale search results']) {
    await page.getByRole('button', { name, exact: true }).click();
    for (const [width, height] of [[1920, 1080], [1920, 900], [1440, 900], [1366, 768]]) {
      await page.setViewportSize({ width, height });
      await assertFit();
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    const fixture = page.frameLocator('iframe');
    await expect(fixture.locator('html')).toBeVisible();
    expect(await fixture.locator('html').evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    for (const variant of ['Buggy app', 'Guarded app']) {
      await page.getByRole('button', { name: variant, exact: true }).click();
      await page.getByRole('button', { name: 'Run Scenario', exact: true }).click();
      await expect(page.getByText(variant === 'Buggy app' ? 'Race reproduced' : 'Assertion passed', { exact: true })).toBeVisible();
      for (const [width, height] of [[1920, 1080], [1440, 900]]) {
        await page.setViewportSize({ width, height });
        await assertFit();
      }
      await page.setViewportSize({ width: 1920, height: 1080 });
    }
  }
  const badge = page.getByRole('button', { name: '[FIXTURE::SEEDED]', exact: true });
  await badge.click();
  const explanation = page.getByRole('dialog', { name: 'About synthetic fixtures' });
  await expect(explanation).toContainText('safely intercept network requests and export runnable Playwright CI/CD tests without CORS or auth limits.');
  await page.keyboard.press('Escape');
  await expect(explanation).not.toBeVisible();
  if (process.env.LATCH_CAPTURE_DESIGN) {
    await mkdir('outputs/layout', { recursive: true });
    for (const theme of ['light', 'dark']) {
      if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.mouse.move(0, 0);
      await page.screenshot({ path: `outputs/layout/${theme}-1080p.png` });
    }
  }
});
