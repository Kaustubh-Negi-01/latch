import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApp } from './app';

describe('public rehearsal API boundaries', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await createApp({ logger: false }); });
  afterAll(async () => { await app.close(); });
  it('serves one-click demo data without authentication', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/demo' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ scenarioId: 'checkout', dataSource: 'synthetic', plan: { order: 'stale-last' } });
  });
  it('rejects arbitrary target URLs and unsupported executable inputs', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/runs', payload: { scenarioId: 'checkout', order: 'stale-last', variant: 'buggy', url: 'http://example.invalid' } });
    expect(response.statusCode).toBe(400);
  });
  it('interprets a spoken order correction without needing a model key', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/interpret', payload: { text: 'No, let the first request finish first.', scenarioId: 'checkout' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, mode: 'local', plan: { order: 'stale-first' } });
  });
  it('does not convert ambiguity into a runnable guess', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/interpret', payload: { text: 'Maybe this is broken.', scenarioId: 'checkout' } });
    expect(response.json()).toMatchObject({ needsClarification: true });
  });
  it('does not expose arbitrary artifact paths', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/artifacts/2c52928e-e548-43d6-a9a5-f74eca61da36/package.json' });
    expect(response.statusCode).toBe(404);
  });
});
