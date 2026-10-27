import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

test('themes, responsive panels, dictation focus and keyboard evidence review', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to workbench' })).toBeFocused();
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1050 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width <= 390) {
        const column = await page.locator('.context-column').boundingBox();
        for (const selector of ['.narration-panel', '.evidence-panel']) {
          const panel = await page.locator(selector).boundingBox();
          expect(Math.abs(panel!.width - column!.width)).toBeLessThan(1);
        }
      }
    }
    const narration = page.getByRole('textbox', { name: 'Scenario narration', exact: true });
    await narration.focus();
    await expect(page.getByText('Input active · dictate with Wispr', { exact: true })).toBeVisible();
    expect(await page.locator('.audio-wave i').first().evaluate(el => getComputedStyle(el).animationName)).toBe('dictation-wave');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('.audio-wave i').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await narration.blur();
  }
  await page.getByRole('button', { name: '1-Click Judge Demo Mode', exact: true }).click();
  await expect(page.getByText('Race reproduced', { exact: true })).toBeVisible();
  const scrubber = page.getByRole('slider', { name: 'Evidence scrubber' });
  await scrubber.focus();
  await page.keyboard.press('Home');
  await expect(scrubber).toHaveValue('0');
  await expect(page.locator('.filmstrip button').first()).toHaveAttribute('aria-pressed', 'true');
  const firstCapture = await page.locator('.browser-screenshot').getAttribute('src');
  await page.keyboard.press('End');
  await expect(page.locator('.filmstrip button').last()).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('.browser-screenshot').getAttribute('src')).not.toBe(firstCapture);
  await page.getByRole('button', { name: 'Test the guarded app', exact: true }).click();
  await expect(page.getByText('Assertion passed', { exact: true })).toBeVisible();
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  await page.locator('.workspace-footer').scrollIntoViewIfNeeded();
  expect((await page.locator('.topbar').boundingBox())!.y).toBe(0);
  await expect(page.getByRole('button', { name: 'Judge Demo Mode', exact: true })).toBeVisible();
  if (process.env.LATCH_CAPTURE_DESIGN) {
    await mkdir('outputs/design', { recursive: true });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.mouse.move(0, 0);
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await page.getByRole('button', { name: 'Switch to light theme' }).click();
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `outputs/design/${theme}-desktop.png`, fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `outputs/design/${theme}-mobile.png`, fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1050 });
    }
  }
});
