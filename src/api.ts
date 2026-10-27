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

export const checkRunnerHealth = async (signal: AbortSignal): Promise<boolean> => {
  for(let attempt=0;attempt<3;attempt+=1) {
    if(signal.aborted) return false;
    try {
      const response=await fetch('/api/health',{signal:AbortSignal.any([signal,AbortSignal.timeout(5000)])});
      if(response.ok) return true;
    } catch { if(signal.aborted) return false; }
    if(attempt<2) await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
  }
  return false;
};
