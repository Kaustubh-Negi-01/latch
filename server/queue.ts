export class QueueFullError extends Error {
  constructor() { super('The rehearsal queue is full. Try again in a moment.'); }
}

/** Bound browser work independently of HTTP concurrency. */
export class RunQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;
  constructor(private readonly capacity = 4) {}
  get size() { return this.pending; }
  async add<T>(work: () => Promise<T>): Promise<T> {
    if (this.pending >= this.capacity) throw new QueueFullError();
    this.pending += 1;
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try { return await work(); }
    finally { this.pending -= 1; release(); }
  }
}
