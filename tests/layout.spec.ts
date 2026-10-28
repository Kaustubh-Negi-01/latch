import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test('fixtures and all evidence frames render at full natural height with one execution action', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  const assertFit = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await page.locator('.fixture-window').boundingBox())!.height).toBeGreaterThanOrEqual(480);
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
      for (const [width, height] of [[1920, 1080], [1440, 900], [390, 844]]) {
        await page.setViewportSize({ width, height });
        if (height === 1080) await assertFit();
        const captures = page.locator('.filmstrip button');
        await expect(captures).toHaveCount(4);
        for (let frame = 0; frame < 4; frame += 1) {
          await captures.nth(frame).click();
          const image = page.locator('.browser-screenshot');
          await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
          const box = (await image.boundingBox())!;
          expect(box.height).toBeGreaterThanOrEqual(450);
          expect((await page.locator('.fixture-window').boundingBox())!.height).toBeGreaterThanOrEqual(480);
          const intrinsic = await image.evaluate(el => ({ width: (el as HTMLImageElement).naturalWidth, height: (el as HTMLImageElement).naturalHeight }));
          expect(Math.abs(box.height - Math.max(450, box.width * intrinsic.height / intrinsic.width))).toBeLessThan(1);
          expect(await image.evaluate(el => ({ fit: getComputedStyle(el).objectFit, position: getComputedStyle(el).objectPosition }))).toEqual({ fit: 'contain', position: '50% 0%' });
        }
        await expect(page.locator('.fixture-browser-bar > svg')).toHaveCount(0);
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

test('Run Scenario jumps to response order instantly before the runner responds', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    (window as unknown as { jumps: unknown[] }).jumps = [];
    Element.prototype.scrollIntoView = function (options) {
      original.call(this, options);
      if (this.id === 'response-order') (window as unknown as { jumps: unknown[] }).jumps.push({ options, top: this.getBoundingClientRect().top });
    };
  });
  for (const width of [1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/runs', async route => { await gate; await route.continue(); });
    try {
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
      await page.getByRole('button', { name: 'Run Scenario', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Running Scenario', exact: true })).toBeVisible();
      const jumps = await page.evaluate(() => (window as unknown as { jumps: { options: unknown; top: number }[] }).jumps);
      expect(jumps).toHaveLength(1);
      expect(jumps[0].options).toEqual({ behavior: 'instant', block: 'start' });
      const headerHeight = (await page.locator('.topbar').boundingBox())!.height;
      expect(Math.abs(jumps[0].top - headerHeight)).toBeLessThan(1);
    } finally { release(); }
    await expect(page.getByText('Race reproduced', { exact: true })).toBeVisible();
    await page.unroute('**/api/runs');
  }
});
