import { getScenarioProgram } from './program';
import type { ActorId, RunRequest } from './model';

export type SimulatedFrame = { label: string; actual: string; actor?: ActorId; outcome: string };

/** A finite fixture model. This produces modeled evidence, never a browser trace. */
export const simulateRace = (request: RunRequest) => {
  const program = getScenarioProgram(request.scenarioId);
  const sequence: ActorId[] = request.order === 'stale-last' ? ['second', 'first'] : ['first', 'second'];
  const initial = request.scenarioId === 'checkout' ? '149.00' : request.scenarioId === 'workspace' ? 'acme' : request.scenarioId === 'search' ? 'none' : 'INV-1044,INV-1045';
  let actual = initial;
  const frames: SimulatedFrame[] = [{ label: 'Modeled initial state', actual, outcome: 'Two actions have started their requests.' }];
  let invoices = ['INV-1044', 'INV-1045'];
  for (const actor of sequence) {
    const ignored = request.variant === 'fixed' && actor === 'first' && request.scenarioId !== 'optimistic';
    const response = program.requests[actor];
    if (!ignored) {
      if (request.scenarioId === 'checkout') actual = Number(response.body.total).toFixed(2);
      if (request.scenarioId === 'workspace') actual = String(response.body.workspace);
      if (request.scenarioId === 'search') actual = String(response.body.query);
      if (request.scenarioId === 'optimistic') {
        invoices = actor === 'first'
          ? request.variant === 'fixed' ? [...invoices, 'INV-1042'] : ['INV-1042', 'INV-1043', 'INV-1044', 'INV-1045']
          : invoices.filter(id => id !== 'INV-1043');
        actual = invoices.sort().join(',');
      }
    }
    frames.push({ label: `${actor === 'first' ? 'Earlier' : 'Latest'} response ${ignored ? 'ignored' : 'applied'}`, actual, actor, outcome: ignored ? 'The latest-request guard rejected the older response.' : 'The fixture model applied the response.' });
  }
  return { expected: program.assertion.expected, actual, passed: actual === program.assertion.expected, frames };
};
