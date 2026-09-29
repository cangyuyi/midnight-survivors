export class SpatialGrid {
  private cells = new Map<number, number[]>();
  private freeBuckets: number[][] = [];
  constructor(private readonly size = 96, private readonly maxBuckets = 2600) {}
  clear(): void {
    for (const bucket of this.cells.values()) {
      bucket.length = 0;
      if (this.freeBuckets.length < this.maxBuckets) this.freeBuckets.push(bucket);
    }
    this.cells.clear();
  }
  add(index: number, x: number, y: number): void {
    const key = this.key(x, y); let bucket = this.cells.get(key);
    if (!bucket) { bucket = this.freeBuckets.pop() ?? []; this.cells.set(key, bucket); }
    bucket.push(index);
  }
  query(x: number, y: number, radius: number, visit: (index: number) => void): void {
    const minX = Math.floor((x - radius) / this.size), maxX = Math.floor((x + radius) / this.size);
    const minY = Math.floor((y - radius) / this.size), maxY = Math.floor((y + radius) / this.size);
    for (let cy = minY; cy <= maxY; cy++) for (let cx = minX; cx <= maxX; cx++) {
      const bucket = this.cells.get(cy * 65536 + cx); if (bucket) for (let i = 0; i < bucket.length; i++) visit(bucket[i]!);
    }
  }
  private key(x: number, y: number): number { return Math.floor(y / this.size) * 65536 + Math.floor(x / this.size); }
}
