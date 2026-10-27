import { describe, expect, it } from 'vitest';
import { simulateRace } from './simulation';

describe('finite fixture model', () => {
  for (const scenarioId of ['checkout','workspace','search','optimistic'] as const) {
    for (const order of ['stale-last','stale-first'] as const) {
      for (const variant of ['buggy','fixed'] as const) {
        it(`${scenarioId}, ${order}, ${variant} preserves the same latest-state invariant`, () => {
          const request={scenarioId,order,variant};
          const result=simulateRace(request);
          expect(result.passed).toBe(variant==='fixed'||order==='stale-first');
          expect(result.frames).toHaveLength(3);
          expect(simulateRace(request)).toEqual(result);
          if(scenarioId==='checkout') expect(result.actual).toBe(result.passed?'129.00':'149.00');
        });
      }
    }
  }
});
