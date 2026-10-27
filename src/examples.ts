import type { Example } from './types';

export const examples: Example[] = [
  {
    id: 'checkout', name: 'Double-click checkout', title: 'Two clicks. One wrong total.',
    description: 'An earlier promo response arrives late and overwrites the latest checkout quote.',
    narration: 'Double-click Apply Promo on the checkout. Hold both requests. Let the second response finish first, then release the slower first response. The total must stay on the latest quote.',
    invariant: 'The checkout total must match the latest promo request.',
    first: 'Earlier quote', second: 'Latest quote', request: 'POST /promo', fixture: 'checkout',
  },
  {
    id: 'workspace', name: 'Workspace switch', title: 'Right workspace. Wrong invoices.',
    description: 'A delayed response from Acme overwrites the invoice list after switching to Nimbus.',
    narration: 'Open Acme invoices, then switch to Nimbus before the first request finishes. Let Nimbus finish first, then Acme. Every visible invoice must still belong to Nimbus.',
    invariant: 'Every visible invoice must belong to the selected workspace.',
    first: 'Acme invoices', second: 'Nimbus invoices', request: 'GET /invoices', fixture: 'workspace',
  },
  {
    id: 'search', name: 'Stale search results', title: 'New query. Old results.',
    description: 'An older search finishes late and replaces the results for the current query.',
    narration: 'Search for inv, then search for invoice before the first request returns. Let the second response finish first, then the earlier one. The results must match the latest query.',
    invariant: 'The results must match the latest search query.',
    first: 'Earlier search', second: 'Latest search', request: 'GET /search', fixture: 'search',
  },
];
