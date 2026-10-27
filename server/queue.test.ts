import { describe, expect, it } from 'vitest';
import { QueueFullError, RunQueue } from './queue';

describe('bounded browser queue', () => {
  it('serializes runs, rejects excess work, and recovers after a failed run', async () => {
    const queue = new RunQueue(2);
    const started: string[] = [];
    let release!: () => void;
    const blocker = new Promise<void>(resolve => { release = resolve; });
    const first = queue.add(async () => { started.push('first'); await blocker; throw new Error('fixture failed'); });
    const handledFirst = first.catch(error => error.message);
    const second = queue.add(async () => { started.push('second'); return 'done'; });
    await expect(queue.add(async () => 'overflow')).rejects.toBeInstanceOf(QueueFullError);
    expect(started).toEqual(['first']);
    release();
    expect(await handledFirst).toBe('fixture failed');
    expect(await second).toBe('done');
    expect(started).toEqual(['first', 'second']);
    expect(queue.size).toBe(0);
    expect(await queue.add(async () => 'recovered')).toBe('recovered');
  });
});
