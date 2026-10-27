import { describe, expect, it, vi } from 'vitest';
import { interpretNarration } from './interpreter';

const response = (selection: unknown) => new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(selection) }] }] }), { status: 200 });
const context = { scenarioId: 'checkout' as const };

describe('structured narration interpretation', () => {
  it('validates model selection and builds only a closed-vocabulary plan', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ scenarioId: 'checkout', order: 'stale-last' }));
    const result = await interpretNarration('The slower original promo came back after the newer quote.', context, { apiKey: 'test-only', fetcher });
    expect(result).toMatchObject({ ok: true, mode: 'model', plan: { scenarioId: 'checkout', order: 'stale-last', invariant: 'latest-quote-owns-total' } });
    const body = JSON.parse(fetcher.mock.calls[0][1]?.body as string);
    expect(body.text.format.strict).toBe(true);
    expect(body.store).toBe(false);
  });
  it('preserves model uncertainty instead of silently choosing an order', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ scenarioId: 'checkout', order: null }));
    const result = await interpretNarration('Sometimes the total changes.', context, { apiKey: 'test-only', fetcher });
    expect(result).toMatchObject({ ok: false, needsClarification: true, mode: 'model' });
  });
  it('rejects executable extras from model output and falls back explicitly', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ scenarioId: 'checkout', order: 'stale-last', code: 'process.exit()' }));
    const result = await interpretNarration('Let the second request finish first.', context, { apiKey: 'test-only', fetcher });
    expect(result).toMatchObject({ ok: true, mode: 'local', plan: { order: 'stale-last' } });
    expect(result).toHaveProperty('warning');
  });
  it('falls back after provider failure only when local phrasing is recognized', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    const result = await interpretNarration('A weird thing happened to my discount.', context, { apiKey: 'test-only', fetcher });
    expect(result).toMatchObject({ ok: false, needsClarification: true, mode: 'local' });
  });
  it('does not call a provider when no key is configured', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await interpretNarration('Let the first request finish first.', context, { apiKey: '', fetcher });
    expect(result).toMatchObject({ ok: true, mode: 'local', plan: { order: 'stale-first' } });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
