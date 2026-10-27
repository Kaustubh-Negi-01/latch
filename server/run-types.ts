import type { RunRequest } from '../domain/index';

export interface RunEvent { id: string; label: string; kind: string; atMs: number; detail?: string; actor?: string | null }
export interface RunResult {
  id: string; status: 'passed' | 'failed'; scenarioId: RunRequest['scenarioId']; order: RunRequest['order']; variant: RunRequest['variant'];
  events: RunEvent[]; assertion: { expected: string; actual: string; passed: boolean };
  screenshots: { id: string; label: string; url: string }[]; durationMs: number;
  artifacts: { spec: string; trace: string; bundle: string }; engine: 'playwright' | 'simulation'; simulationReason?: string; createdAt: string;
}

