import type { ActorId, ScenarioId } from './model';

export interface FixtureRequest {
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  status: number;
  body: Record<string, unknown>;
  eventId: 'old' | 'new';
}
export interface FixtureAction {
  actor: ActorId;
  type: 'click' | 'fill';
  testId: string;
  value?: string;
}
export interface ScenarioProgram {
  scenarioId: ScenarioId;
  fixturePath: string;
  requests: Record<ActorId, FixtureRequest>;
  actions: [FixtureAction, FixtureAction];
  assertion: { testId: string; attribute: string; expected: string };
}

export const SCENARIO_PROGRAMS: Record<ScenarioId, ScenarioProgram> = {
  checkout: {
    scenarioId: 'checkout',
    fixturePath: '/fixtures/checkout.html',
    requests: {
      first: { path: '/fixtures/api/quote', method: 'POST', status: 200, eventId: 'old', body: { requestId: 'quote-41', revision: 41, total: 149.00 } },
      second: { path: '/fixtures/api/quote', method: 'POST', status: 200, eventId: 'new', body: { requestId: 'quote-42', revision: 42, total: 129.00 } },
    },
    actions: [
      { actor: 'first', type: 'click', testId: 'apply-promo' },
      { actor: 'second', type: 'click', testId: 'apply-promo' },
    ],
    assertion: { testId: 'result', attribute: 'data-proof', expected: '129.00' },
  },
  workspace: {
    scenarioId: 'workspace',
    fixturePath: '/fixtures/workspace.html',
    requests: {
      first: {
        path: '/fixtures/api/workspace/acme', method: 'GET', status: 200, eventId: 'old',
        body: { workspace: 'acme', name: 'Acme Studio', invoices: [
          { id: 'INV-1042', client: 'Acme Studio', amount: 8400, status: 'Due' },
          { id: 'INV-1043', client: 'Acme Studio', amount: 2650, status: 'Paid' },
        ] },
      },
      second: {
        path: '/fixtures/api/workspace/nimbus', method: 'GET', status: 200, eventId: 'new',
        body: { workspace: 'nimbus', name: 'Nimbus Labs', invoices: [
          { id: 'INV-2018', client: 'Nimbus Labs', amount: 12600, status: 'Due' },
          { id: 'INV-2019', client: 'Nimbus Labs', amount: 4800, status: 'Draft' },
        ] },
      },
    },
    actions: [{ actor: 'first', type: 'click', testId: 'old-action' }, { actor: 'second', type: 'click', testId: 'new-action' }],
    assertion: { testId: 'result', attribute: 'data-proof', expected: 'nimbus' },
  },
  search: {
    scenarioId: 'search',
    fixturePath: '/fixtures/search.html',
    requests: {
      first: {
        path: '/fixtures/api/search?q=inv', method: 'GET', status: 200, eventId: 'old',
        body: { query: 'inv', results: [
          { id: 'inventory-17', title: 'Inventory — warehouse devices', kind: 'Inventory' },
          { id: 'invoice-1042', title: 'Invoice INV-1042 — Acme Studio', kind: 'Invoice' },
        ] },
      },
      second: {
        path: '/fixtures/api/search?q=invoice', method: 'GET', status: 200, eventId: 'new',
        body: { query: 'invoice', results: [
          { id: 'invoice-1042', title: 'Invoice INV-1042 — Acme Studio', kind: 'Invoice' },
          { id: 'invoice-2018', title: 'Invoice INV-2018 — Nimbus Labs', kind: 'Invoice' },
        ] },
      },
    },
    actions: [{ actor: 'first', type: 'fill', testId: 'query', value: 'inv' }, { actor: 'second', type: 'fill', testId: 'query', value: 'invoice' }],
    assertion: { testId: 'result', attribute: 'data-proof', expected: 'invoice' },
  },
  optimistic: {
    scenarioId: 'optimistic',
    fixturePath: '/fixtures/latch-lab.html?scenario=optimistic',
    requests: {
      first: { path: '/fixtures/api/delete/INV-1042', method: 'DELETE', status: 409, eventId: 'old', body: { error: 'Invoice is locked for review' } },
      second: { path: '/fixtures/api/delete/INV-1043', method: 'DELETE', status: 200, eventId: 'new', body: { deleted: 'INV-1043' } },
    },
    actions: [{ actor: 'first', type: 'click', testId: 'old-action' }, { actor: 'second', type: 'click', testId: 'new-action' }],
    assertion: { testId: 'result', attribute: 'data-proof', expected: 'INV-1042,INV-1044,INV-1045' },
  },
};

export function getScenarioProgram(scenarioId: ScenarioId): ScenarioProgram {
  const program = SCENARIO_PROGRAMS[scenarioId];
  if (!program) throw new Error(`Unknown scenario: ${String(scenarioId)}`);
  // Consumers cannot mutate the canonical export/runner contract.
  return JSON.parse(JSON.stringify(program)) as ScenarioProgram;
}
