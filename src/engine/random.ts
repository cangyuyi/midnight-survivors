export class Random {
  private state: number;
  constructor(seed = Date.now()) { this.state = seed >>> 0 || 1; }
  next(): number { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state / 4294967296; }
  range(min: number, max: number): number { return min + this.next() * (max - min); }
  int(max: number): number { return Math.floor(this.next() * max); }
  pick<T>(items: readonly T[]): T { return items[this.int(items.length)]!; }
}
