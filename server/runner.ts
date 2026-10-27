import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { compilePlaywrightSpec, createPlan, getScenarioProgram, runRaceProtocol, type RunRequest } from '../domain/index';

export const ARTIFACT_ROOT = path.resolve(process.env.LATCH_DATA_DIR || path.join('work', 'runs'));
export const ALLOWED_ARTIFACTS = new Set(['before.png', 'response-1.png', 'response-2.png', 'final.png', 'regression.spec.ts', 'trace.zip', 'regression-bundle.zip', 'result.json']);
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

export interface RunEvent { id: string; label: string; kind: string; atMs: number; detail?: string; actor?: string | null }
export interface RunResult {
  id: string; status: 'passed' | 'failed'; scenarioId: RunRequest['scenarioId']; order: RunRequest['order']; variant: RunRequest['variant'];
  events: RunEvent[]; assertion: { expected: string; actual: string; passed: boolean };
  screenshots: { id: string; label: string; url: string }[]; durationMs: number;
  artifacts: { spec: string; trace: string; bundle: string }; engine: 'playwright'; createdAt: string;
}

const serveSource = `import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
createServer(async (req,res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!/^\\/fixtures\\/[a-zA-Z0-9._-]+$/.test(pathname)) { res.writeHead(404); res.end('Not found'); return; }
    const data = await readFile(path.join(root, pathname));
    const ext = path.extname(pathname);
    res.setHeader('Content-Type', ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1');
`;

async function createBundle(directory: string, request: RunRequest) {
  const bundleDir = path.join(directory, 'bundle');
  await mkdir(path.join(bundleDir, 'fixtures'), { recursive: true });
  const fixtureRoot = path.resolve('public', 'fixtures');
  for (const file of ['checkout.html', 'workspace.html', 'search.html', 'latch-lab.html', 'fixture.js', 'fixture.css']) {
    await copyFile(path.join(fixtureRoot, file), path.join(bundleDir, 'fixtures', file));
  }
  const spec = compilePlaywrightSpec(createPlan(request.scenarioId, request.order), { baseURL: 'http://127.0.0.1:4173', variant: request.variant });
  await writeFile(path.join(directory, 'regression.spec.ts'), spec);
  await writeFile(path.join(bundleDir, 'regression.spec.ts'), spec);
  const playwrightPackage = JSON.parse(await readFile(path.resolve('node_modules', '@playwright', 'test', 'package.json'), 'utf8'));
  await writeFile(path.join(bundleDir, 'package.json'), JSON.stringify({ name: 'latch-exported-rehearsal', private: true, type: 'module', scripts: { test: 'playwright test --workers=1' }, devDependencies: { '@playwright/test': playwrightPackage.version } }, null, 2));
  await writeFile(path.join(bundleDir, 'serve.mjs'), serveSource);
  await writeFile(path.join(bundleDir, 'playwright.config.mjs'), `import {defineConfig} from '@playwright/test';\nexport default defineConfig({testDir:'.',testMatch:'regression.spec.ts',timeout:30000,retries:0,use:{headless:true,trace:'on',launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}},webServer:{command:'node serve.mjs',url:'http://127.0.0.1:4173/fixtures/checkout.html',reuseExistingServer:false}});\n`);
  await writeFile(path.join(bundleDir, 'README.md'), `# Latch executable rehearsal\n\nThis bundle contains a real Playwright regression and standalone synthetic fixture apps.\n\nRun:\n\n\`\`\`sh\nnpm install\nnpx playwright install chromium\nnpm test\n\`\`\`\n\nRecorded scenario: ${request.scenarioId}; response order: ${request.order}; implementation: ${request.variant}.\n\nA buggy implementation with stale-last order is expected to fail the regression assertion. A failure proves the invariant is violated; it does not mean the bundle is broken. Set LATCH_VARIANT=fixed to rerun against the corrected fixture.\n\nThe same named request gates and DOM settlement barriers power the online runner and this exported spec. Synthetic quote amounts and invoice records are illustrative.\n`);
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(path.join(directory, 'regression-bundle.zip'));
    const archive = archiver('zip', { zlib: { level: 8 } });
    output.on('close', resolve); output.on('error', reject); archive.on('error', reject);
    archive.pipe(output); archive.directory(bundleDir, false); void archive.finalize();
  });
}

export async function executeRun(request: RunRequest, baseURL: string): Promise<RunResult> {
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
