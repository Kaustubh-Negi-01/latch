import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getScenarioProgram, runRaceProtocol, type RunRequest } from '../domain/index';

import { ARTIFACT_ROOT, createBundle } from './artifacts';
import type { RunEvent, RunResult } from './run-types';
export { ARTIFACT_ROOT, ALLOWED_ARTIFACTS } from './artifacts';
export type { RunEvent, RunResult } from './run-types';
let browserPromise: Promise<Browser> | undefined;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true, timeout: 10_000, args: ['--disable-dev-shm-usage', '--no-sandbox'] }).then(browser => {
      browser.on('disconnected', () => { browserPromise = undefined; });
      return browser;
    }).catch(error => { browserPromise = undefined; throw error; });
  }
  return browserPromise;
}

export async function closeBrowser() { const browser = await browserPromise?.catch(() => undefined); await browser?.close(); }

export async function executeBrowserRun(request: RunRequest, baseURL: string): Promise<RunResult> {
  const started = Date.now();
  const id = randomUUID();
  const directory = path.join(ARTIFACT_ROOT, id);
  await mkdir(directory, { recursive: true });
  const events: RunEvent[] = [];
  const screenshots: RunResult['screenshots'] = [];
  const artifact = (file: string) => `/api/artifacts/${id}/${file}`;
  let context: BrowserContext | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let traced = false;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      void context?.close().catch(() => undefined);
      reject(new Error('The browser rehearsal exceeded its 30 second limit. Please retry.'));
    }, 30_000);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const browser = await getBrowser();
      context = await browser.newContext({ viewport: { width: 960, height: 660 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(baseURL).origin || !url.pathname.startsWith('/fixtures/')) return route.abort('blockedbyclient');
        await route.continue();
      });
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true }); traced = true;
      const page = await context.newPage();
      page.setDefaultTimeout(8_000); page.setDefaultNavigationTimeout(10_000);
      let renderCount = 0;
      const program = getScenarioProgram(request.scenarioId);
      const protocolResult = await runRaceProtocol(page, program, request.order, request.variant, baseURL, async event => {
        events.push({ id: `${events.length + 1}-${event.id}`, label: event.label, kind: event.kind, atMs: event.at, actor: event.actor, detail: 'settlement' in event && event.settlement ? String(event.settlement) : undefined });
        if (event.kind === 'action' && screenshots.length === 0) {
          await page.screenshot({ path: path.join(directory, 'before.png'), fullPage: true });
          screenshots.push({ id: 'before', label: 'Before requests', url: artifact('before.png') });
        }
        if (event.kind === 'render') {
          renderCount += 1;
          const filename = `response-${renderCount}.png`;
          await page.screenshot({ path: path.join(directory, filename), fullPage: true });
          screenshots.push({ id: `response-${renderCount}`, label: `After response ${renderCount}`, url: artifact(filename) });
        }
      });
      await page.screenshot({ path: path.join(directory, 'final.png'), fullPage: true });
      screenshots.push({ id: 'final', label: 'Final browser state', url: artifact('final.png') });
      await context.tracing.stop({ path: path.join(directory, 'trace.zip') }); traced = false;
      await createBundle(directory, request);
      const result: RunResult = {
        id, status: protocolResult.passed ? 'passed' : 'failed', scenarioId: request.scenarioId, order: request.order, variant: request.variant,
        events, assertion: { expected: protocolResult.expected, actual: protocolResult.actual ?? '(missing)', passed: protocolResult.passed }, screenshots,
        durationMs: Date.now() - started, artifacts: { spec: artifact('regression.spec.ts'), trace: artifact('trace.zip'), bundle: artifact('regression-bundle.zip') }, engine: 'playwright', createdAt: new Date().toISOString(),
      };
      await writeFile(path.join(directory, 'result.json'), JSON.stringify(result, null, 2));
      return result;
    })()]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (traced) await context?.tracing.stop({ path: path.join(directory, 'trace.zip') }).catch(() => undefined);
    await context?.close().catch(() => undefined);
  }
}
