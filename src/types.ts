export type ScenarioId = 'checkout' | 'workspace' | 'search' | 'optimistic';
export type Order = 'stale-last' | 'stale-first';
export type Variant = 'buggy' | 'fixed';
export type Run = {
  id: string;
  status: 'passed' | 'failed';
  scenarioId: ScenarioId;
  order: Order;
  variant: Variant;
  events: { id: string; label: string; kind: string; atMs: number; detail?: string }[];
  assertion: { expected: string; actual: string; passed: boolean };
  screenshots: { id: string; label: string; url: string }[];
  durationMs: number;
  artifacts: { spec: string; trace: string; bundle?: string };
};
export type Example = {
  id: ScenarioId;
  name: string;
  title: string;
  description: string;
  narration: string;
  invariant: string;
  first: string;
  second: string;
  request: string;
  fixture: string;
};
