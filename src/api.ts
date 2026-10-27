import type { Order, Run, ScenarioId, Variant } from './types';

const post = async <T,>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || `Request failed (${response.status}). Try again.`);
  return payload as T;
};

export const runScenario = (scenarioId: ScenarioId, order: Order, variant: Variant) => post<Run>('/api/runs', { scenarioId, order, variant });
export type Interpretation = {
  ok?: boolean;
  needsClarification?: boolean;
  message?: string;
  mode?: string;
  summary?: string;
  warning?: string;
  plan?: { scenarioId: ScenarioId; order: Order };
  scenario?: { scenarioId: ScenarioId; order: Order };
  scenarioId?: ScenarioId;
  order?: Order;
};
export const interpret = (text: string, scenarioId: ScenarioId, order: Order) => post<Interpretation>('/api/interpret', { text, scenarioId, current: { scenarioId, order } });
