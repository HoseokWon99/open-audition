import { describe, expect, it } from "vitest";
import { Interval } from "./interval";

describe("Interval", () => {
  it("contains values from start through before end", () => {
    const interval = new Interval(1, 4);

    expect(interval.contains(1)).toBe(true);
    expect(interval.contains(3.999)).toBe(true);
    expect(interval.contains(4)).toBe(false);
  });

  it("detects overlap without treating touching boundaries as intersection", () => {
    expect(new Interval(1, 4).intersects(new Interval(3, 6))).toBe(true);
    expect(new Interval(1, 4).intersects(new Interval(-1, 2))).toBe(true);
    expect(new Interval(1, 4).intersects(new Interval(4, 6))).toBe(false);
    expect(new Interval(1, 4).intersects(new Interval(-1, 1))).toBe(false);
    expect(new Interval(1, 1).intersects(new Interval(0, 2))).toBe(false);
  });

  it("returns the overlapping section of two intervals", () => {
    expect(new Interval(1, 6).intersection(new Interval(4, 8))).toEqual(new Interval(4, 6));
    expect(new Interval(1, 6).intersection(new Interval(-2, 3))).toEqual(new Interval(1, 3));
  });

  it("returns a zero-duration interval when intervals do not overlap", () => {
    expect(new Interval(1, 4).intersection(new Interval(4, 8))).toEqual(new Interval(4, 4));
    expect(new Interval(5, 8).intersection(new Interval(1, 3))).toEqual(new Interval(5, 5));
  });
});
