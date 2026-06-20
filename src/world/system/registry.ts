import type { ObjectDef, ObjectResult } from "./types";

const REGISTRY = new Map<string, ObjectDef<object>>();

export function defineObject<P extends object>(kind: string, def: ObjectDef<P>): void {
  if (REGISTRY.has(kind)) throw new Error(`object kind already defined: ${kind}`);
  REGISTRY.set(kind, def as unknown as ObjectDef<object>);
}

export function hasObject(kind: string): boolean {
  return REGISTRY.has(kind);
}

export function objectKinds(): string[] {
  return [...REGISTRY.keys()];
}

/** Build an instance: merge caller params over the type defaults, then build(). */
export function buildObject(kind: string, params?: Record<string, unknown>): ObjectResult {
  const def = REGISTRY.get(kind);
  if (!def) throw new Error(`unknown object kind: ${kind}`);
  const merged = { ...def.params, ...(params ?? {}) };
  return def.build(merged);
}
