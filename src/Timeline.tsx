import { Activity, ArrowDown, Check, Clock3, CornerDownRight } from 'lucide-react';
import type { Example, Order, Run } from './types';

export default function Timeline({ example, order, run }: { example: Example; order: Order; run?: Run }) {
  const staleLast = order === 'stale-last';
  const failed = run?.status === 'failed';
  return <div className="timeline">
    <div className="telemetry-heading"><span><Activity size={14} />Request waterfall</span><code>{run ? run.engine === 'simulation' ? '[ENGINE::SIMULATION]' : '[ENGINE::CHROMIUM]' : '[SCHEDULE::PLANNED]'}</code></div>
    <div className="timeline-ruler"><span>Request sent</span><span>1st release</span><span>2nd release</span></div>
    <div className="request-lane">
      <div className="lane-label"><span className="request-number">01</span><div><strong>{example.first}</strong><span>{example.request}</span></div></div>
      <div className={`lane-track ${staleLast ? 'long' : 'short'} ${failed && staleLast ? 'violating' : ''}`}><span className="track-start" /><span className="track-line" /><span className="response-dot">{run ? <Check size={12} /> : <Clock3 size={12} />}</span><span className="release-caption">{staleLast ? 'Returns last' : 'Returns first'}</span></div>
    </div>
    <div className="request-lane">
      <div className="lane-label"><span className="request-number latest">02</span><div><strong>{example.second}</strong><span>{example.request}</span></div></div>
      <div className={`lane-track ${staleLast ? 'short' : 'long'} latest-track`}><span className="track-start" /><span className="track-line" /><span className="response-dot">{run ? <Check size={12} /> : <Clock3 size={12} />}</span><span className="release-caption">{staleLast ? 'Returns first' : 'Returns last'}</span></div>
    </div>
    <div className={`timeline-explanation ${failed ? 'is-failed' : ''}`}><CornerDownRight size={16} /><span>{run ? failed ? 'The older response overwrote the current state.' : 'The final state satisfies the assertion.' : staleLast ? 'The earlier request gets the last word. Should it?' : 'Responses complete in the order they were sent.'}</span><ArrowDown size={14} /></div>
    <div className="telemetry-footer"><span>02 REQUESTS <span aria-hidden="true">/</span> ORDERED GATES</span><span>{run ? `${run.events.length} EVENTS · ${(run.durationMs / 1000).toFixed(2)}s ${run.engine === 'simulation' ? 'SIMULATION' : 'RUN'}` : 'SEQUENCE VIEW · NOT TO TIME SCALE'}</span></div>
  </div>;
}
