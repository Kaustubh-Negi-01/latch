import { createPlan, type RaceOrder, type ScenarioId, type ScenarioPlan } from './model';
import { getScenario } from './manifest';

export interface NarrationContext { scenarioId: ScenarioId; order?: RaceOrder }
export type NarrationResult =
  | { ok: true; plan: ScenarioPlan; mode: 'local'; summary: string; sourceText: string }
  | { ok: false; needsClarification: true; message: string; examples: string[] };

const recoveryExamples = [
  'Let the second request finish first.',
  'No, let the first request finish first.',
];

function clarification(message: string): NarrationResult {
  return { ok: false, needsClarification: true, message, examples: recoveryExamples };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectScenario(text: string): ScenarioId[] {
  const found: ScenarioId[] = [];
  if (/\b(?:checkout|promo|coupon|quote)\b/.test(text)) found.push('checkout');
  if (/\b(?:workspace|acme|nimbus)\b/.test(text)) found.push('workspace');
  if (/\b(?:search|searching|query)\b/.test(text)) found.push('search');
  if (/\b(?:delete|deletion|rollback|optimistic)\b/.test(text)) found.push('optimistic');
  return found;
}

function detectOrder(text: string): RaceOrder | 'conflict' | undefined {
  const older = '(?:first|older|old|earlier|original)';
  const newer = '(?:second|newer|new|later|latest)';
  const object = '(?:\\s+(?:slow|slower|fast|faster))?(?:\\s+(?:request|response|quote|promise|one))?';
  const finish = '\\s+(?:(?:should|must|will|can)\\s+)?(?:finish(?:es|ed)?|complete(?:s|d)?|resolve(?:s|d)?|return(?:s|ed)?|arrive(?:s|d)?|come(?:s)?|came)(?:\\s+back)?\\s+';
  const lastCues = [
    `${older}${object}${finish}(?:last|second|after)`,
    `${newer}${object}${finish}(?:first|before)`,
    `(?:release|return|resolve|finish|complete)\\s+(?:the\\s+)?${older}${object}\\s+last`,
    `(?:release|return|resolve|finish|complete)\\s+(?:the\\s+)?${newer}${object}\\s+first`,
    '\\b(?:stale|older|first) (?:response |request )?last\\b',
  ];
  const firstCues = [
    `${older}${object}${finish}(?:first|before)`,
    `${newer}${object}${finish}(?:last|second|after)`,
    `(?:release|return|resolve|finish|complete)\\s+(?:the\\s+)?${older}${object}\\s+first`,
    `(?:release|return|resolve|finish|complete)\\s+(?:the\\s+)?${newer}${object}\\s+last`,
    '\\b(?:stale|older|first) (?:response |request )?first\\b',
    '\\b(?:normal|original) (?:response |request |completion )?order\\b',
  ];
  const staleLast = lastCues.some((pattern) => new RegExp(pattern).test(text));
  const staleFirst = firstCues.some((pattern) => new RegExp(pattern).test(text));
  if (staleLast && staleFirst) return 'conflict';
  return staleLast ? 'stale-last' : staleFirst ? 'stale-first' : undefined;
}

/** A deliberately bounded parser: it recognizes fixture language and ordering,
 * not arbitrary browser automation. The UI can offer model interpretation for
 * unsupported phrasing, but must validate that result against ScenarioPlanSchema.
 */
export function parseNarration(text: string, context: NarrationContext = { scenarioId: 'checkout' }): NarrationResult {
  if (typeof text !== 'string' || !text.trim()) return clarification('Describe which request should finish first.');
  if (text.length > 4000) return clarification('Keep this rehearsal to one scenario and one response order.');
  let normalized = normalize(text);
  const originalScenarios = detectScenario(normalized);
  // Spoken self-corrections override the abandoned clause, without confusing
  // “no login” or “no error” with a correction marker.
  const corrections = [...normalized.matchAll(/\b(?:no|actually|correction)\s*,?\s+(?=(?:let|make|the|first|second|older|newer|return|release|finish|complete)\b)/g)];
  const correction = corrections.at(-1);
  if (correction?.index !== undefined) normalized = normalized.slice(correction.index + correction[0].length);
  if (/\b(?:not|never|don't|do not|shouldn't|mustn't)\b.{0,45}\b(?:finish|complete|resolve|return|arrive|release)\b/.test(normalized)) {
    return clarification('State the completion order positively, for example: “Let the second request finish first.”');
  }
  const scenarios = detectScenario(normalized);
  if (scenarios.length > 1) return clarification('This rehearsal supports one fixture at a time. Choose checkout, workspace switch, search, or two invoice deletions.');
  const scenarioId = scenarios[0] ?? (originalScenarios.length === 1 ? originalScenarios[0] : context.scenarioId);
  // Named actors refer to the same two requests shown in the timeline.
  const orderText = scenarioId === 'workspace'
    ? normalized.replace(/\bacme(?: studio)?(?:'s)?(?: (?:request|response|invoices))?/g, 'first request').replace(/\bnimbus(?: labs)?(?:'s)?(?: (?:request|response|invoices))?/g, 'second request')
    : normalized;
  let order = detectOrder(orderText);
  if (!order && /\b(?:(?:reverse|swap|invert|switch) (?:the )?(?:response |request |completion )?order|do the opposite)\b/.test(normalized)) {
    if (!context.order) return clarification('Choose the current response order before asking to reverse it.');
    order = context.order === 'stale-last' ? 'stale-first' : 'stale-last';
  }
  if (order === 'conflict') return clarification('I heard conflicting response orders. Say which request should finish first.');
  if (!order) return clarification('I could not determine the response order. Say “first request finishes first” or “second request finishes first.”');
  const scenario = getScenario(scenarioId);
  const plan = createPlan(scenarioId, order);
  return {
    ok: true,
    plan,
    mode: 'local',
    sourceText: text,
    summary: `${scenario.shortLabel}: ${order === 'stale-last' ? 'second response, then first response' : 'first response, then second response'}. ${scenario.expectedInvariant}`,
  };
}
