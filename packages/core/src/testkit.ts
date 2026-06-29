/**
 * Test-only helpers (excluded from the build via tsconfig). A seeded PRNG +
 * random propositional-formula generator so the property tests are deterministic
 * across runs without taking a dependency on fast-check.
 */
import { and, atom, iff, implies, not, or, type Formula } from "./ast.js";

/** mulberry32 — a tiny deterministic 32-bit PRNG. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A random propositional formula of bounded depth over `atomNames`.
 * Connectives only — no constants — to keep the oracle comparison crisp.
 */
export function randomFormula(
  rng: () => number,
  depth: number,
  atomNames: readonly string[] = ["a", "b", "c", "d"],
): Formula {
  if (depth <= 0 || rng() < 0.3) {
    const name = atomNames[Math.floor(rng() * atomNames.length)]!;
    return atom(name);
  }
  const pick = rng();
  const sub = (): Formula => randomFormula(rng, depth - 1, atomNames);
  if (pick < 0.2) return not(sub());
  if (pick < 0.4) return and(sub(), sub());
  if (pick < 0.6) return or(sub(), sub());
  if (pick < 0.8) return implies(sub(), sub());
  return iff(sub(), sub());
}

/** A deterministic batch of `count` random formulas. */
export function randomBatch(
  seed: number,
  count: number,
  depth = 4,
  atomNames?: readonly string[],
): Formula[] {
  const rng = makeRng(seed);
  return Array.from({ length: count }, () => randomFormula(rng, depth, atomNames));
}
