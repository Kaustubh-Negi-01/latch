/**
 * Shared, self-contained protocol used by the server runner and embedded in the
 * downloadable Playwright test. Keep this function free of module-scope values:
 * its JavaScript source is copied into the export, never evaluated dynamically.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('./program').ScenarioProgram} program
 * @param {import('./model').RaceOrder} order
 * @param {import('./model').Variant} variant
 * @param {string} baseURL
 * @param {(event: any) => void | Promise<void>} [onEvent]
 */
export async function runRaceProtocol(page, program, order, variant, baseURL, onEvent) {
  const events = [];
  const startedAt = Date.now();
  const routes = {};
  const resolvers = {};
  const ready = {};
  const actors = ['first', 'second'];
  const timeoutMs = 10000;
  for (const actor of actors) ready[actor] = new Promise((resolve) => { resolvers[actor] = resolve; });

  async function emit(kind, actor, detail) {
    const event = { kind, actor, id: actor ? program.requests[actor].eventId : 'assert', at: Date.now() - startedAt, ...detail };
    events.push(event);
    if (onEvent) await onEvent(event);
  }

  async function waitForRequest(actor) {
    let timer;
    try {
      await Promise.race([
        ready[actor],
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Fixture did not send the ${actor} request within ${timeoutMs}ms.`)), timeoutMs); }),
      ]);
    } finally { clearTimeout(timer); }
  }

  const routeHandler = async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = `${url.pathname}${url.search}`;
    // First unmatched request wins. This also distinguishes two rapid POSTs to
    // the same checkout endpoint without modifying the application request.
    const actor = actors.find((id) => !routes[id] && program.requests[id].path === path && program.requests[id].method === request.method());
    if (!actor) {
      await route.abort('blockedbyclient');
      return;
    }
    routes[actor] = route;
    await emit('request', actor, { path, method: request.method(), label: `${actor} request held` });
    resolvers[actor]();
  };

  await page.route('**/fixtures/api/**', routeHandler);
  try {
    const target = new URL(program.fixturePath, baseURL);
    target.searchParams.set('fixed', variant === 'fixed' ? '1' : '0');
    await page.goto(target.href, { waitUntil: 'domcontentloaded' });
    for (const action of program.actions) {
      await emit('action', action.actor, { label: action.type === 'fill' ? `Fill ${action.value}` : `Click ${action.testId}` });
      if (action.type === 'fill') await page.getByTestId(action.testId).fill(action.value);
      else await page.getByTestId(action.testId).click();
      await waitForRequest(action.actor);
    }
    const sequence = order === 'stale-last' ? ['second', 'first'] : ['first', 'second'];
    for (const actor of sequence) {
      const response = program.requests[actor];
      await emit('release', actor, { label: `${actor} response released`, status: response.status });
      await routes[actor].fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) });
      // Fulfill completing does not mean the page's asynchronous handler has
      // rendered. Wait for the fixture's explicit post-render settlement marker.
      await page.waitForFunction((eventId) => Array.isArray(window.__latchEvents) && window.__latchEvents.some((event) => event.id === eventId && event.kind === 'settled'), response.eventId, { timeout: timeoutMs });
      const settled = await page.evaluate((eventId) => {
        const related = window.__latchEvents.filter((event) => event.id === eventId);
        const marker = related.find((event) => event.kind === 'settled');
        const outcome = related.filter((event) => ['applied', 'ignored', 'error'].includes(event.kind)).at(-1);
        return { ...marker, outcome: outcome?.kind, outcomeLabel: outcome?.label, detail: outcome?.detail };
      }, response.eventId);
      await emit('render', actor, { label: settled.outcomeLabel || `${actor} response settled`, settlement: settled });
      if (settled.outcome === 'error') throw new Error(`The ${actor} fixture request failed: ${settled.detail || 'unknown error'}`);
    }
    const expected = program.assertion.expected;
    const actual = await page.getByTestId(program.assertion.testId).getAttribute(program.assertion.attribute);
    const passed = actual === expected;
    await emit('assert', null, { label: passed ? 'Invariant preserved' : 'Invariant violated', actual, expected, passed });
    return { actual, expected, passed, events };
  } finally {
    await page.unroute('**/fixtures/api/**', routeHandler);
  }
}
