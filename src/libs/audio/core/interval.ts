export class Interval {
  constructor(
    readonly start: number,
    readonly end: number,
  ) {}

  get duration(): number {
    return this.end - this.start;
  }

  get isEmpty(): boolean {
    return this.duration <= 0;
  }

  contains(t: number): boolean {
    return !this.isEmpty && t >= this.start && t < this.end;
  }

  intersects(other: Interval): boolean {
    return (
      !this.isEmpty &&
      !other.isEmpty &&
      this.start < other.end &&
      other.start < this.end
    );
  }

  intersection(other: Interval): Interval {
    const start = Math.max(this.start, other.start);
    const end = Math.max(start, Math.min(this.end, other.end));
    return new Interval(start, end);
  }
}
