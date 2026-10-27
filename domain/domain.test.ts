import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { compilePlaywrightSpec } from './compiler';
import { SCENARIOS } from './manifest';
import { createPlan, RunRequestSchema, ScenarioPlanSchema } from './model';
import { parseNarration } from './parser';
import { getScenarioProgram } from './program';
import { runRaceProtocol } from './protocol.js';

describe('bounded execution plans', () => {
  it.each(SCENARIOS.map((scenario) => scenario.id))('validates both completion orders for %s', (scenarioId) => {
    for (const order of ['stale-last', 'stale-first'] as const) {
      expect(ScenarioPlanSchema.parse(createPlan(scenarioId, order))).toEqual(createPlan(scenarioId, order));
    }
  });

  it('rejects unknown steps, orders, injected fields, and a foreign assertion', () => {
    const plan = createPlan('checkout');
    expect(ScenarioPlanSchema.safeParse({ ...plan, steps: [{ kind: 'execute', code: 'arbitrary()' }, ...plan.steps.slice(1)] }).success).toBe(false);
    expect(ScenarioPlanSchema.safeParse({ ...plan, order: 'random' }).success).toBe(false);
    expect(ScenarioPlanSchema.safeParse({ ...plan, url: 'https://untrusted.example' }).success).toBe(false);
    expect(ScenarioPlanSchema.safeParse({ ...plan, invariant: 'failed-delete-restores-item' }).success).toBe(false);
    expect(RunRequestSchema.safeParse({ scenarioId: 'checkout', order: 'stale-last', variant: 'fixed', script: 'arbitrary()' }).success).toBe(false);
  });

  it('rejects missing handlers and releases that disagree with the chosen order', () => {
    const plan = createPlan('checkout');
    expect(ScenarioPlanSchema.safeParse({ ...plan, steps: plan.steps.slice(1) }).success).toBe(false);
    expect(ScenarioPlanSchema.safeParse({ ...plan, steps: createPlan('checkout', 'stale-first').steps }).success).toBe(false);
  });
});

describe('dictated intent and correction', () => {
  it.each(SCENARIOS)('understands the $id fixture narration', (scenario) => {
    const result = parseNarration(scenario.narration, { scenarioId: scenario.id });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan).toEqual(createPlan(scenario.id, 'stale-last'));
  });

  it.each([
    'No, let the first request finish first.',
    'Let the first response come back first.',
    'Return the second request last.',
    'The second response arrives after the first.',
  ])('interprets the first-completes-first correction: %s', (text) => {
    const result = parseNarration(text, { scenarioId: 'checkout', order: 'stale-last' });
    expect(result.ok && result.plan.order).toBe('stale-first');
  });

  it('discards the abandoned part of a spoken self-correction', () => {
    const result = parseNarration('Let the second request finish first. No let the first request finish first.', { scenarioId: 'checkout' });
    expect(result.ok && result.plan.order).toBe('stale-first');
  });

  it('uses named workspace actors and preserves a scenario across self-correction', () => {
    expect(parseNarration('Let Acme finish before Nimbus.', { scenarioId: 'checkout' })).toMatchObject({ ok: true, plan: { scenarioId: 'workspace', order: 'stale-first' } });
    expect(parseNarration('Workspace switch, first response finishes first. Actually let Nimbus finish first.', { scenarioId: 'checkout' })).toMatchObject({ ok: true, plan: { scenarioId: 'workspace', order: 'stale-last' } });
  });

  it('understands a past-tense checkout observation', () => {
    expect(parseNarration('I double clicked Apply Promo and the older slow response resolved last.')).toMatchObject({ ok: true, plan: { scenarioId: 'checkout', order: 'stale-last' } });
  });

  it('reverses the current order instead of hardcoding a reverse order', () => {
    expect(parseNarration('Reverse the order', { scenarioId: 'checkout', order: 'stale-last' })).toMatchObject({ ok: true, plan: { order: 'stale-first' } });
    expect(parseNarration('Do the opposite', { scenarioId: 'checkout', order: 'stale-first' })).toMatchObject({ ok: true, plan: { order: 'stale-last' } });
    expect(parseNarration('Reverse the order', { scenarioId: 'checkout' })).toMatchObject({ ok: false, needsClarification: true });
  });

  it.each([
    '',
    'Make it work better.',
    'The request is slow.',
    'First request finishes first and first request finishes last.',
    'Search then switch workspace. First request finishes last.',
    "Don't let the first request finish first.",
    'On checkout double click Apply Promo.',
  ])('asks for a useful clarification for ambiguous input: %s', (text) => {
    const result = parseNarration(text);
    expect(result).toMatchObject({ ok: false, needsClarification: true });
    if (!result.ok) {
      expect(result.message.length).toBeGreaterThan(20);
      expect(result.examples).toHaveLength(2);
    }
  });
});

describe('downloaded regression test', () => {
  it('emits stable, syntactically valid code with the shared protocol and explicit final DOM assertion', () => {
    const plan = createPlan('checkout');
    const source = compilePlaywrightSpec(plan);
    expect(source).toBe(compilePlaywrightSpec(plan));
    expect(source).toContain(runRaceProtocol.toString());
    expect(source).toContain('await expect(page.getByTestId(program.assertion.testId)).toHaveAttribute(');
    expect(source).toContain('window.__latchEvents');
    expect(source).not.toContain('waitForTimeout');
    const result = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      reportDiagnostics: true,
    });
    expect(result.diagnostics?.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)).toEqual([]);
  });

  it('quotes a base URL safely and rejects non-HTTP URLs', () => {
    const plan = createPlan('checkout');
    const baseURL = 'https://latch.example/?q=";throw new Error("injected")';
    expect(compilePlaywrightSpec(plan, { baseURL })).toContain(JSON.stringify(baseURL));
    expect(() => compilePlaywrightSpec(plan, { baseURL: 'javascript:alert(1)' })).toThrow('HTTP or HTTPS');
  });

  it('protects the canonical fixture program from consumer changes', () => {
    const program = getScenarioProgram('checkout');
    program.requests.first.body.total = 999;
    expect(getScenarioProgram('checkout').requests.first.body.total).toBe(149);
  });
});
