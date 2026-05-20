export const clamp = (value: number, lower: number, upper: number): number =>
  Math.max(lower, Math.min(upper, value));

export const clamp01 = (value: number): number => clamp(value, 0, 1);
