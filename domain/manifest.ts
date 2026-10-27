import type { Invariant, RaceOrder, ScenarioId } from './model';

export interface ScenarioManifest {
  id: ScenarioId;
  title: string;
  shortLabel: string;
  description: string;
  narration: string;
  expectedInvariant: string;
  invariant: Invariant;
  defaultOrder: RaceOrder;
  fixtureName: string;
  dataSource: 'synthetic';
  actors: readonly [
    { id: 'first'; label: string; requestLabel: string; action: string },
    { id: 'second'; label: string; requestLabel: string; action: string },
  ];
  seedDescription: string;
  bugExplanation: string;
  fixExplanation: string;
}

export const SCENARIOS: readonly ScenarioManifest[] = [
  {
    id: 'checkout',
    title: 'The discount that disappeared',
    shortLabel: 'Apply promo twice',
    description: 'Two rapid Apply Promo clicks start overlapping requests. The older response arrives last and overwrites the newer checkout total.',
    narration: 'On checkout, double click Apply Promo. Let the second request finish first and the first request finish last. The total must keep the latest quote.',
    expectedInvariant: 'After both promo requests settle, the checkout total must match the latest quote.',
    invariant: 'latest-quote-owns-total',
    defaultOrder: 'stale-last',
    fixtureName: 'Checkout quote laboratory',
    dataSource: 'synthetic',
    actors: [
      { id: 'first', label: 'Quote 41', requestLabel: 'First promo request', action: 'Click Apply Promo' },
      { id: 'second', label: 'Quote 42', requestLabel: 'Second promo request', action: 'Click Apply Promo again' },
    ],
    seedDescription: 'Synthetic checkout prices and versioned quotes demonstrate the reported double-click failure; amounts are illustrative.',
    bugExplanation: 'A slower, older promo quote overwrites the total after the newer quote has already rendered.',
    fixExplanation: 'Only the latest requested quote may update the checkout total.',
  },
  {
    id: 'workspace',
    title: 'The workspace that came back',
    shortLabel: 'Workspace switch',
    description: 'An older workspace response replaces the data for the workspace you just selected.',
    narration: 'First open Acme Studio, then switch to Nimbus Labs. Let the second request finish first and the first request finish last. Nimbus must keep its own data.',
    expectedInvariant: 'The selected workspace and the rendered workspace data must match.',
    invariant: 'selected-workspace-owns-data',
    defaultOrder: 'stale-last',
    fixtureName: 'Workspace operations console',
    dataSource: 'synthetic',
    actors: [
      { id: 'first', label: 'Acme Studio', requestLabel: 'Load Acme', action: 'Open Acme Studio workspace' },
      { id: 'second', label: 'Nimbus Labs', requestLabel: 'Load Nimbus', action: 'Switch to Nimbus Labs workspace' },
    ],
    seedDescription: 'Two synthetic engineering workspaces with different project lists, owners, and deployment status.',
    bugExplanation: 'The first response commits after a newer workspace selection and overwrites its data.',
    fixExplanation: 'Only the request that owns the current selection can commit its result.',
  },
  {
    id: 'search',
    title: 'The search that went backwards',
    shortLabel: 'Search results',
    description: 'A slow response for an earlier query overwrites the results for the latest query.',
    narration: 'Search for inv, then search for invoice. Let the second request finish first and the first request finish last. Keep the invoice results on screen.',
    expectedInvariant: 'The rendered search results must belong to the latest search query.',
    invariant: 'latest-search-owns-results',
    defaultOrder: 'stale-last',
    fixtureName: 'Engineering knowledge search',
    dataSource: 'synthetic',
    actors: [
      { id: 'first', label: 'inv', requestLabel: 'Search inv', action: 'Search for inv' },
      { id: 'second', label: 'invoice', requestLabel: 'Search invoice', action: 'Search for invoice' },
    ],
    seedDescription: 'Synthetic invoice and inventory search records with overlapping query prefixes.',
    bugExplanation: 'The earlier query resolves last and replaces results without checking the current query.',
    fixExplanation: 'A response may render only when its request version matches the latest search.',
  },
  {
    id: 'optimistic',
    title: 'The invoice that came back',
    shortLabel: 'Optimistic delete',
    description: 'Rolling back one failed delete restores a stale list snapshot and resurrects another, successfully deleted invoice.',
    narration: 'Delete invoice 1042, then delete invoice 1043. Let the second request finish first and the first request finish last. Restore only the invoice whose deletion failed.',
    expectedInvariant: 'The failed deletion must restore invoice 1042 while the successful deletion keeps invoice 1043 removed.',
    invariant: 'failed-delete-restores-item',
    defaultOrder: 'stale-last',
    fixtureName: 'Invoice operations console',
    dataSource: 'synthetic',
    actors: [
      { id: 'first', label: 'Delete INV-1042', requestLabel: 'Delete 1042 (fails)', action: 'Optimistically delete invoice 1042' },
      { id: 'second', label: 'Delete INV-1043', requestLabel: 'Delete 1043 (succeeds)', action: 'Optimistically delete invoice 1043' },
    ],
    seedDescription: 'Four synthetic invoices, including a locked invoice whose deletion is rejected.',
    bugExplanation: 'An old list snapshot restores a different invoice that has already been successfully deleted.',
    fixExplanation: 'Reconcile a failed mutation by item identity rather than restoring a whole stale snapshot.',
  },
];

export function getScenario(id: ScenarioId): ScenarioManifest {
  const scenario = SCENARIOS.find((entry) => entry.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${String(id)}`);
  return scenario;
}
