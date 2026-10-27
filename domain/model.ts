import { z } from 'zod';

export const ScenarioIdSchema = z.enum(['checkout', 'workspace', 'search', 'optimistic']);
export const RaceOrderSchema = z.enum(['stale-last', 'stale-first']);
export const VariantSchema = z.enum(['buggy', 'fixed']);
export type ScenarioId = z.infer<typeof ScenarioIdSchema>;
export type RaceOrder = z.infer<typeof RaceOrderSchema>;
export type Variant = z.infer<typeof VariantSchema>;
export type ActorId = 'first' | 'second';

export const InvariantSchema = z.enum([
  'latest-quote-owns-total',
  'selected-workspace-owns-data',
  'latest-search-owns-results',
  'failed-delete-restores-item',
]);
export type Invariant = z.infer<typeof InvariantSchema>;

export const SCENARIO_INVARIANTS: Record<ScenarioId, Invariant> = {
  checkout: 'latest-quote-owns-total',
  workspace: 'selected-workspace-owns-data',
  search: 'latest-search-owns-results',
  optimistic: 'failed-delete-restores-item',
};

export const PlanStepSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('action'), actor: z.enum(['first', 'second']) }).strict(),
  z.object({ kind: z.literal('release'), actor: z.enum(['first', 'second']) }).strict(),
  z.object({ kind: z.literal('assert'), invariant: InvariantSchema }).strict(),
]);
export type PlanStep = z.infer<typeof PlanStepSchema>;

export function expectedSteps(scenarioId: ScenarioId, order: RaceOrder): PlanStep[] {
  const releaseOrder: ActorId[] = order === 'stale-last' ? ['second', 'first'] : ['first', 'second'];
  return [
    { kind: 'action', actor: 'first' },
    { kind: 'action', actor: 'second' },
    ...releaseOrder.map((actor): PlanStep => ({ kind: 'release', actor })),
    { kind: 'assert', invariant: SCENARIO_INVARIANTS[scenarioId] },
  ];
}

// Every executable step is selected from this closed vocabulary. Narration and
// model output cannot introduce URLs, selectors, JavaScript, or shell commands.
export const ScenarioPlanSchema = z.object({
  scenarioId: ScenarioIdSchema,
  order: RaceOrderSchema,
  invariant: InvariantSchema,
  steps: z.array(PlanStepSchema).length(5),
}).strict().superRefine((plan, ctx) => {
  if (plan.invariant !== SCENARIO_INVARIANTS[plan.scenarioId]) {
    ctx.addIssue({ code: 'custom', path: ['invariant'], message: 'The assertion must belong to the selected fixture.' });
  }
  if (JSON.stringify(plan.steps) !== JSON.stringify(expectedSteps(plan.scenarioId, plan.order))) {
    ctx.addIssue({ code: 'custom', path: ['steps'], message: 'Steps must perform both actions, release both requests in the selected order, then assert.' });
  }
});
export type ScenarioPlan = z.infer<typeof ScenarioPlanSchema>;

export const RunRequestSchema = z.object({
  scenarioId: ScenarioIdSchema,
  order: RaceOrderSchema,
  variant: VariantSchema,
}).strict();
export type RunRequest = z.infer<typeof RunRequestSchema>;

export function createPlan(scenarioId: ScenarioId, order: RaceOrder = 'stale-last'): ScenarioPlan {
  return ScenarioPlanSchema.parse({
    scenarioId, order, invariant: SCENARIO_INVARIANTS[scenarioId], steps: expectedSteps(scenarioId, order),
  });
}

export function releaseOrder(order: RaceOrder): [ActorId, ActorId] {
  return order === 'stale-last' ? ['second', 'first'] : ['first', 'second'];
}
