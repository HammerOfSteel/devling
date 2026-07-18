/**
 * Fixed-capacity FIFO replay buffer (todo.md §5.6): late-joining or
 * reconnecting viewers receive the last N envelopes so a blipped browser
 * doesn't miss the show.
 */
export class ReplayRing<T> {
  private buf: T[] = [];

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new RangeError(`ring capacity must be a non-negative integer, got ${capacity}`);
    }
  }

  push(item: T): void {
    if (this.capacity === 0) return;
    this.buf.push(item);
    if (this.buf.length > this.capacity) this.buf.shift();
  }

  /** Oldest → newest snapshot copy. */
  toArray(): T[] {
    return [...this.buf];
  }

  get size(): number {
    return this.buf.length;
  }
}
