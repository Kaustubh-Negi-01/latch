import type { Page } from '@playwright/test';
import type { ActorId, RaceOrder, Variant } from './model';
import type { ScenarioProgram } from './program';

export interface ProtocolEvent {
  kind: 'action' | 'request' | 'release' | 'render' | 'assert';
  actor: ActorId | null;
  id: 'old' | 'new' | 'assert';
  at: number;
  label: string;
  path?: string;
  method?: string;
  status?: number;
  settlement?: Record<string, unknown>;
  actual?: string | null;
  expected?: string;
  passed?: boolean;
}

export interface ProtocolResult {
  actual: string | null;
  expected: string;
  passed: boolean;
  events: ProtocolEvent[];
}

export function runRaceProtocol(
  page: Page,
  program: ScenarioProgram,
  order: RaceOrder,
  variant: Variant,
  baseURL: string,
  onEvent?: (event: ProtocolEvent) => void | Promise<void>,
): Promise<ProtocolResult>;
