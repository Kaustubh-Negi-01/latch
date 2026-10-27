import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import archiver from 'archiver';
import { compilePlaywrightSpec, createPlan, type RunRequest } from '../domain/index';

export const ARTIFACT_ROOT = path.resolve(process.env.LATCH_DATA_DIR || path.join(tmpdir(), 'latch-runs'));
export const ALLOWED_ARTIFACTS = new Set(['before.png', 'response-1.png', 'response-2.png', 'final.png', 'before.svg', 'response-1.svg', 'response-2.svg', 'final.svg', 'regression.spec.ts', 'trace.zip', 'simulation-report.zip', 'regression-bundle.zip', 'result.json']);

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

export async function createBundle(directory: string, request: RunRequest, evidence: { engine: 'playwright' | 'simulation'; reason?: string } = {engine:'playwright'}) {
  const bundleDir = path.join(directory, 'bundle');
  await mkdir(path.join(bundleDir, 'fixtures'), { recursive: true });
  const fixtureRoot = path.resolve('public', 'fixtures');
  for (const file of ['checkout.html', 'workspace.html', 'search.html', 'latch-lab.html', 'fixture.js', 'fixture.css']) {
    await copyFile(path.join(fixtureRoot, file), path.join(bundleDir, 'fixtures', file));
  }
  const spec = compilePlaywrightSpec(createPlan(request.scenarioId, request.order), { baseURL: 'http://127.0.0.1:4173', variant: request.variant });
  await writeFile(path.join(directory, 'regression.spec.ts'), spec);
  await writeFile(path.join(bundleDir, 'regression.spec.ts'), spec);
  await writeFile(path.join(bundleDir, 'run-mode.json'), JSON.stringify(evidence, null, 2));
  await writeFile(path.join(bundleDir, 'EVIDENCE.md'), evidence.engine === 'simulation' ? 'This run used a deterministic fixture model, not a browser. The included Playwright test is executable and can independently verify the fixture in Chromium. Download the separately labeled simulation report for modeled snapshots.\n' : 'The online run executed in Chromium. Download its separate Playwright trace for captured browser evidence.\n');
  const playwrightPackage = JSON.parse(await readFile(path.resolve('node_modules', '@playwright', 'test', 'package.json'), 'utf8'));
  await writeFile(path.join(bundleDir, 'package.json'), JSON.stringify({ name: 'latch-exported-rehearsal', private: true, type: 'module', scripts: { test: 'playwright test --workers=1' }, devDependencies: { '@playwright/test': playwrightPackage.version } }, null, 2));
  await writeFile(path.join(bundleDir, 'serve.mjs'), serveSource);
  await writeFile(path.join(bundleDir, 'playwright.config.mjs'), `import {defineConfig} from '@playwright/test';\nexport default defineConfig({testDir:'.',testMatch:'regression.spec.ts',timeout:30000,retries:0,use:{headless:true,trace:'on',launchOptions:{args:['--no-sandbox','--disable-dev-shm-usage']}},webServer:{command:'node serve.mjs',url:'http://127.0.0.1:4173/fixtures/checkout.html',reuseExistingServer:false}});\n`);
  await writeFile(path.join(bundleDir, 'README.md'), `# Latch executable rehearsal\n\nThis bundle contains a real Playwright regression and standalone synthetic fixture apps.\n\nRun:\n\n\`\`\`sh\nnpm install\nnpx playwright install chromium\nnpm test\n\`\`\`\n\nRecorded scenario: ${request.scenarioId}; response order: ${request.order}; implementation: ${request.variant}.\n\nA buggy implementation with stale-last order is expected to fail the regression assertion. A failure proves the invariant is violated; it does not mean the bundle is broken. Set LATCH_VARIANT=fixed to rerun against the corrected fixture.\n\nThe same named request gates and DOM settlement barriers power the online runner and this exported spec. Synthetic quote amounts and invoice records are illustrative.\n`);
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(path.join(directory, 'regression-bundle.zip'));
    const archive = archiver('zip', { zlib: { level: 8 } });
    output.on('close', resolve); output.on('error', reject); archive.on('error', reject);
    archive.pipe(output); archive.directory(bundleDir, false); void archive.finalize().catch(reject);
  });
}

