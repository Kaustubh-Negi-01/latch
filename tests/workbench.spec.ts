import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { simulateRace } from '../domain/simulation';

const expectedEngine = process.env.LATCH_EXPECT_SIMULATION ? 'simulation' : 'playwright';

const scenarios = [
  { id: 'checkout', nav: '01 Double-click checkout', title: 'Review your order', fixture: 'checkout', expected: '129.00', stale: '149.00' },
  { id: 'workspace', nav: '02 Workspace switch', title: 'Invoices', fixture: 'workspace', expected: 'nimbus', stale: 'acme' },
  { id: 'search', nav: '03 Stale search results', title: 'Find a document', fixture: 'search', expected: 'invoice', stale: 'inv' },
];

for (const scenario of scenarios) {
  test(`${scenario.id}: dedicated preview, deterministic variants and valid evidence downloads`, async ({ page, request }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: scenario.nav }).click();
    for (const variant of ['buggy', 'fixed'] as const) {
      await page.getByRole('button', { name: variant === 'buggy' ? 'Buggy app' : 'Guarded app', exact: true }).click();
      const fixture = page.frameLocator('iframe');
      await expect(fixture.getByRole('heading', { name: scenario.title, exact: true })).toBeVisible();
      await expect(fixture.locator('html')).toHaveAttribute('data-fixture', scenario.fixture);
      await expect(fixture.getByText(variant === 'buggy' ? 'Known buggy implementation' : 'Corrected implementation')).toBeVisible();
      const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/runs') && response.request().method() === 'POST', { timeout: 40_000 });
      await page.getByRole('button', { name: 'Run scenario', exact: true }).click();
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      const run = await response.json();
      expect(run).toMatchObject({ scenarioId: scenario.id, variant, order: 'stale-last', engine: expectedEngine, status: variant === 'buggy' ? 'failed' : 'passed', assertion: { expected: scenario.expected, actual: variant === 'buggy' ? scenario.stale : scenario.expected } });
      if (expectedEngine === 'simulation') {
        await expect(page.getByText('Deterministic simulation', {exact:true})).toBeVisible();
        await expect(page.getByRole('link',{name:'Simulation report'})).toBeVisible();
      }
      expect(run.events.filter((event: {kind:string}) => event.kind === 'render')).toHaveLength(2);
      await expect(page.getByText(variant === 'buggy' ? 'Race reproduced' : 'Assertion passed', { exact: true })).toBeVisible();
      await expect(page.locator('.browser-screenshot')).toBeVisible();
      await expect.poll(() => page.locator('.browser-screenshot').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      for (const shot of run.screenshots) {
        const image = await request.get(shot.url);
        expect(image.status()).toBe(200);
        expect(image.headers()['content-type']).toContain(expectedEngine === 'simulation' ? 'image/svg+xml' : 'image/png');
      }
      const trace = await request.get(run.artifacts.trace);
      expect(trace.status()).toBe(200);
      expect((await trace.body()).subarray(0, 2).toString()).toBe('PK');
      const spec = await request.get(run.artifacts.spec);
      expect(spec.status()).toBe(200);
      expect(await spec.text()).toContain(`/fixtures/${scenario.fixture}.html`);
      await page.getByRole('button', { name: 'Playwright test' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      if (variant === 'fixed') {
        await mkdir('work/export-checks', { recursive: true });
        await writeFile(`work/export-checks/${scenario.id}-trace.zip`, await trace.body());
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('link', { name: 'Download regression bundle' }).click();
        const download = await downloadPromise;
        await download.saveAs(`work/export-checks/${scenario.id}.zip`);
        expect(await download.failure()).toBeNull();
      }
    }
    if (scenario.id === 'checkout') {
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
      if(expectedEngine==='playwright') {
        await mkdir('docs',{recursive:true});
        await page.setViewportSize({width:1440,height:1050});
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({path:'docs/workbench.png',fullPage:true});
      }
    }
    expect(errors).toEqual([]);
  });

  test(`${scenario.id}: original completion order passes on both implementations`, async ({ request }) => {
    for (const variant of ['buggy', 'fixed']) {
      const response = await request.post('/api/runs', { data: { scenarioId: scenario.id, order: 'stale-first', variant } });
      expect(response.status()).toBe(200);
      const result=await response.json();
      expect(result).toMatchObject({ status: 'passed', assertion: { passed: true } });
      expect(result.assertion.actual).toBe(simulateRace({scenarioId:scenario.id as 'checkout'|'workspace'|'search',order:'stale-first',variant:variant as 'buggy'|'fixed'}).actual);
    }
  });
}

test('dictation updates active scenario, named actor order, timeline and run parameters', async ({ page }) => {
  await page.goto('/');
  const narration = page.getByRole('textbox', { name: 'Scenario narration', exact: true });
  await narration.fill('Switch to the Acme and Nimbus workspace. Let Acme finish before Nimbus.');
  await page.getByRole('button', { name: 'Update scenario', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Right workspace. Wrong invoices.' })).toBeVisible();
  await expect(page.getByLabel('Response completion order')).toHaveValue('stale-first');
  await expect(page.locator('.request-lane').first().locator('.lane-track')).toHaveClass(/short/);
  await narration.fill('Keep this workspace, let the first finish first. Actually let Nimbus finish first.');
  await page.getByRole('button', { name: 'Update scenario', exact: true }).click();
  await expect(page.getByLabel('Response completion order')).toHaveValue('stale-last');
  await expect(page.locator('.request-lane').first().locator('.lane-track')).toHaveClass(/long/);
  await narration.fill('Search for inv then invoice. Let the first response finish first.');
  await page.getByRole('button', { name: 'Update scenario', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New query. Old results.' })).toBeVisible();
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Find a document' })).toBeVisible();
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/runs'));
  await page.getByRole('button', { name: 'Run scenario', exact: true }).click();
  const response = await responsePromise;
  expect(response.request().postDataJSON()).toEqual({ scenarioId: 'search', order: 'stale-first', variant: 'buggy' });
  expect(await response.json()).toMatchObject({ status: 'passed' });
  await narration.fill('Make it better somehow.');
  await page.getByRole('button', { name: 'Update scenario', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('response order');
  await expect(page.getByLabel('Response completion order')).toHaveValue('stale-first');
});

test('unknown fixture paths never render the parent workbench', async ({ request }) => {
  expect((await request.get('/fixtures/missing.html')).status()).toBe(404);
});

test('judge entry, mobile layout, accessibility and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '1-Click Judge Demo Mode', exact: true })).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  await mkdir('.impeccable/review', { recursive: true });
  await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: '1-Click Judge Demo Mode', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: '03 Stale search results' }).click();
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Find a document' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.sidebar').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
  await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true });
});
