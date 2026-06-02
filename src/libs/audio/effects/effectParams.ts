import type { EffectParam, EffectParamType, EffectParamValue } from "../../../types/multitrack";

export type { EffectParam, EffectParamType, EffectParamValue };

export function getNumberParam(params: EffectParam[], name: string, fallback: number): number {
  const value = getParamValue(params, name);

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getStringParam(params: EffectParam[], name: string, fallback: string): string {
  const value = getParamValue(params, name);

  return typeof value === "string" ? value : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getParamValue(params: EffectParam[], name: string): EffectParamValue | undefined {
  return params.find((param) => param.name === name)?.value;
}
