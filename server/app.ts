import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { existsSync, createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { SCENARIOS, ScenarioIdSchema, RaceOrderSchema, RunRequestSchema, createPlan, getScenario, getScenarioProgram } from '../domain/index';
import { ALLOWED_ARTIFACTS, ARTIFACT_ROOT, executeRun, runnerMode, browserCoolingDown } from './runner';
import { QueueFullError, RunQueue } from './queue';
import { interpretNarration } from './interpreter';

const InterpretRequest = z.object({
  text: z.string().max(4000),
  scenarioId: ScenarioIdSchema.default('checkout'),
  current: z.object({ order: RaceOrderSchema.optional() }).passthrough().optional(),
  order: RaceOrderSchema.optional(),
}).strict();
const ArtifactParams = z.object({ id: z.uuid(), filename: z.string() });

export async function createApp({ port = Number(process.env.PORT || 4318), logger = true } = {}) {
  const app = Fastify({ logger, bodyLimit: 16 * 1024, requestTimeout: 120_000 });
  const queue = new RunQueue(4);
  const limits = new Map<string, { start: number; count: number }>();
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'same-origin');
    if (request.method === 'POST' && request.url.startsWith('/api/')) {
      const now = Date.now();
      let window = limits.get(request.ip);
      if (!window || now - window.start > 60_000) { window = { start: now, count: 0 }; limits.set(request.ip, window); }
      window.count += 1;
      if (limits.size > 512) for (const [key, value] of limits) if (now - value.start > 60_000) limits.delete(key);
      if (window.count > 60) return reply.code(429).header('Retry-After', '30').send({ error: 'A few too many rehearsals at once. Try again in 30 seconds.' });
    }
  });

  app.get('/api/health', async () => ({ ok: true, service: 'latch', engine: runnerMode() === 'simulation' || browserCoolingDown() ? 'simulation' : 'playwright', runnerMode: runnerMode(), fallbackAvailable: true, browserInstalled: existsSync(chromium.executablePath()), queueDepth: queue.size, interpreter: process.env.OPENAI_API_KEY ? 'structured-model' : 'bounded-local', modelConfigured: Boolean(process.env.OPENAI_API_KEY) }));
  app.get('/api/scenarios', async () => ({ scenarios: SCENARIOS }));
  app.post('/api/demo', async () => ({ sessionId: randomUUID(), scenarioId: 'checkout', scenario: getScenario('checkout'), scenarios: SCENARIOS, plan: createPlan('checkout'), mode: 'demo', dataSource: 'synthetic' }));

  app.post('/api/interpret', async (request, reply) => {
    const input = InterpretRequest.safeParse(request.body);
    if (!input.success) return reply.code(400).send({ error: 'Provide narration under 4,000 characters and a supported scenario.' });
    const parsed = await interpretNarration(input.data.text, { scenarioId: input.data.scenarioId, order: input.data.current?.order ?? input.data.order });
    if (!parsed.ok) return parsed;
    return { ...parsed, scenario: parsed.plan };
  });

  app.post('/api/runs', async (request, reply) => {
    const parsed = RunRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Choose a supported scenario, response order, and implementation.' });
    try { return await queue.add(() => executeRun(parsed.data, `http://127.0.0.1:${port}`)); }
    catch (error) {
      if (error instanceof QueueFullError) return reply.code(429).header('Retry-After', '5').send({ error: error.message });
      request.log.error({ err: error }, 'Browser rehearsal failed');
      return reply.code(503).send({ error: 'The browser rehearsal could not complete. Please retry.', code: 'RUNNER_UNAVAILABLE' });
    }
  });

  app.get('/api/runs/:id', async (request, reply) => {
    const parsed = z.object({ id: z.uuid() }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid run identifier.' });
    try { return JSON.parse(await readFile(path.join(ARTIFACT_ROOT, parsed.data.id, 'result.json'), 'utf8')); }
    catch { return reply.code(404).send({ error: 'This run is no longer available. Run the rehearsal again.' }); }
  });

  app.get('/api/artifacts/:id/:filename', async (request, reply) => {
    const parsed = ArtifactParams.safeParse(request.params);
    if (!parsed.success || !ALLOWED_ARTIFACTS.has(parsed.data.filename)) return reply.code(404).send({ error: 'Artifact not found.' });
    const file = path.join(ARTIFACT_ROOT, parsed.data.id, parsed.data.filename);
    if (!existsSync(file)) return reply.code(404).send({ error: 'Artifact expired or unavailable. Run the rehearsal again.' });
    const isSvg = parsed.data.filename.endsWith('.svg');
    const isImage = parsed.data.filename.endsWith('.png') || isSvg;
    const contentType = isSvg ? 'image/svg+xml' : isImage ? 'image/png' : parsed.data.filename.endsWith('.zip') ? 'application/zip' : parsed.data.filename.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8';
    if (isSvg) reply.header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    reply.header('Content-Type', contentType);
    reply.header('Content-Disposition', `${isImage ? 'inline' : 'attachment'}; filename="${parsed.data.filename}"`);
    reply.header('Cache-Control', 'private, max-age=300');
    return reply.send(createReadStream(file));
  });

  // The fixture can be explored directly; rehearsals intercept these requests
  // in a fresh browser and release the same synthetic responses through gates.
  app.route({ method: ['GET', 'POST', 'DELETE'], url: '/fixtures/api/*', handler: async (request, reply) => {
    const url = new URL(request.url, 'http://local');
    let matched;
    if (url.pathname === '/fixtures/api/quote') {
      const ordinal = z.object({ requestOrdinal: z.number().int().min(1) }).passthrough().safeParse(request.body);
      const program = getScenarioProgram('checkout');
      matched = ordinal.success && ordinal.data.requestOrdinal > 1 ? program.requests.second : program.requests.first;
    } else {
      for (const scenario of SCENARIOS) {
        const program = getScenarioProgram(scenario.id);
        matched = Object.values(program.requests).find(candidate => candidate.path === url.pathname + url.search);
        if (matched) break;
      }
    }
    if (!matched) return reply.code(404).send({ error: 'Unknown synthetic request.' });
    return reply.code(matched.status).send(matched.body);
  } });

  const dist = path.resolve('dist');
  const staticRoot = process.env.NODE_ENV === 'production' && existsSync(dist) ? dist : path.resolve('public');
  await app.register(fastifyStatic, { root: staticRoot, prefix: '/', index: false });
  app.get('/', (_request, reply) => {
    if (existsSync(path.join(staticRoot, 'index.html'))) return reply.sendFile('index.html');
    return reply.code(404).send({ error: 'Build the workbench with npm run build, or use the Vite development server.' });
  });
  app.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api/') && !request.url.startsWith('/fixtures/') && existsSync(path.join(staticRoot, 'index.html'))) return reply.sendFile('index.html');
    return reply.code(404).send({ error: 'Not found.' });
  });
  return app;
}
