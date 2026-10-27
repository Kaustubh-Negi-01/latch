import type { RunRequest } from '../domain/index';
import { executeBrowserRun } from './browser-runner';
import { executeSimulationRun } from './simulation-runner';
import type { RunResult } from './run-types';

export { closeBrowser } from './browser-runner';
export { ARTIFACT_ROOT, ALLOWED_ARTIFACTS } from './artifacts';
export type { RunEvent, RunResult } from './run-types';

export type RunnerMode = 'auto' | 'playwright' | 'simulation';
export const runnerMode = (): RunnerMode => process.env.LATCH_RUNNER_MODE === 'simulation' ? 'simulation' : process.env.LATCH_RUNNER_MODE === 'playwright' ? 'playwright' : 'auto';
let browserRetryAfter = 0;
export const browserCoolingDown = () => Date.now() < browserRetryAfter;

export const executeRun = async (request: RunRequest, baseURL: string, options: { mode?: RunnerMode; browserRun?: typeof executeBrowserRun } = {}): Promise<RunResult> => {
  const mode = options.mode ?? runnerMode();
  if (mode === 'simulation') return executeSimulationRun(request,'Simulation selected for this host.');
  if (mode === 'auto' && browserCoolingDown()) return executeSimulationRun(request,'Browser temporarily unavailable; deterministic simulation is active.');
  try { return await (options.browserRun ?? executeBrowserRun)(request,baseURL); }
  catch (error) {
    if (mode === 'playwright') throw error;
    // A failed invariant is a normal result. Only execution failures reach here.
    browserRetryAfter = Date.now()+60_000;
    return executeSimulationRun(request,'Chromium could not complete this run; deterministic simulation is active.');
  }
};
