/**
 * The concept-cluster declaration — the input side of the domain-entailment lens.
 *
 * A human declares what a small set of concepts *mean* using the four-sided
 * definition language (relationships / defining rule / examples / vocabulary).
 * This declaration is the ground truth: the lens never infers meaning, it only
 * checks whether a codebase stays faithful to the meaning declared here.
 *
 * Core stays FS-free and YAML-free: the CLI parses `.entailer/domains/*.yaml`
 * and hands the plain object to {@link parseDomainSpec}. Only two relation verbs
 * are machine-checkable in v0.1 — `is-a` (subsumption, `A ⊑ B`) and `is-not`
 * (disjointness, `A ⊓ B = ⊥`). Subsumption is satisfiable by construction (a
 * `member` that *is* a `user` co-occurring with `user` is silence); only
 * disjointness is violable, which is what makes a leak a *contradiction* rather
 * than a matter of opinion.
 */
import { z } from "zod";

export const relationVerbSchema = z.enum(["is-a", "is-not"]);
export type RelationVerb = z.infer<typeof relationVerbSchema>;

/** One concept, declared on its four sides. Any side may be empty except a name. */
export const conceptSchema = z.object({
  concept: z.string().min(1),
  /** Raw `"member is-a user"` / `"is-not guest"` strings (subject defaults to this concept). */
  relationships: z.array(z.string()).default([]),
  /** Identifier fragments that name this concept in code (lower-cased on compile). */
  vocabulary: z.array(z.string()).default([]),
  /** A prose defining rule. Cross-checking it against the examples is reader-assisted (deferred). */
  rule: z.string().optional(),
  examples: z
    .object({
      positive: z.array(z.string()).default([]),
      negative: z.array(z.string()).default([]),
    })
    .default({ positive: [], negative: [] }),
});
export type Concept = z.infer<typeof conceptSchema>;

export const domainSpecSchema = z.object({
  cluster: z.string().min(1),
  concepts: z.array(conceptSchema).min(2, "a cluster needs at least two concepts to have a boundary"),
  /** Cluster-level axioms in the same `"A is-a B"` grammar. */
  relationships: z.array(z.string()).default([]),
  /** Glob(s) scoping the walk (the CLI resolves them; core just records them). */
  boundary: z.array(z.string()).min(1, "declare at least one boundary glob to scope the walk"),
});
export type DomainSpec = z.infer<typeof domainSpecSchema>;

/** A declared relation, compiled to its logical form. `source` keeps the raw string for receipts. */
export interface CompiledRelation {
  readonly kind: "sub" | "disjoint";
  readonly a: string;
  readonly b: string;
  readonly source: string;
}

/** Thrown when a declaration is well-shaped but not well-formed (bad relation / unknown concept). */
export class DomainSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainSpecError";
  }
}

/** Parse + validate the *shape* of an untrusted declaration object, throwing on any violation. */
export function parseDomainSpec(input: unknown): DomainSpec {
  return domainSpecSchema.parse(input);
}

const IS_NOT = " is-not ";
const IS_A = " is-a ";

/** Normalize a concept name for matching (trim + lower-case). */
export function normalizeConcept(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Compile every declared relationship (cluster-level + per-concept) into
 * {@link CompiledRelation}s. A per-concept string that omits its subject
 * (`"is-not guest"`) is read with the owning concept as the subject.
 *
 * Throws {@link DomainSpecError} on an unparseable verb or a reference to a
 * concept the cluster never declares — a malformed spec, not a code finding.
 */
export function compileRelations(spec: DomainSpec): CompiledRelation[] {
  const known = new Set(spec.concepts.map((c) => normalizeConcept(c.concept)));
  const out: CompiledRelation[] = [];

  const compileOne = (raw: string, ownerSubject?: string) => {
    const text = raw.trim();
    let verb: RelationVerb;
    let idx: number;
    // Check `is-not` first: it is the more specific token and must not be
    // shadowed by an `is-a` match inside a longer word.
    if (text.includes(IS_NOT)) {
      verb = "is-not";
      idx = text.indexOf(IS_NOT);
    } else if (text.includes(IS_A)) {
      verb = "is-a";
      idx = text.indexOf(IS_A);
    } else if (ownerSubject && (text.startsWith("is-not ") || text.startsWith("is-a "))) {
      // Subject-less per-concept form: prepend the owning concept.
      return compileOne(`${ownerSubject} ${text}`);
    } else {
      throw new DomainSpecError(
        `relationship "${raw}" must use "A is-a B" or "A is-not B" (only these two verbs are checkable in v0.1)`,
      );
    }
    const a = normalizeConcept(text.slice(0, idx));
    const b = normalizeConcept(text.slice(idx + (verb === "is-not" ? IS_NOT.length : IS_A.length)));
    for (const name of [a, b]) {
      if (!known.has(name)) {
        throw new DomainSpecError(
          `relationship "${raw}" references "${name}", which is not a concept in cluster "${spec.cluster}"`,
        );
      }
    }
    out.push({ kind: verb === "is-not" ? "disjoint" : "sub", a, b, source: raw });
  };

  for (const r of spec.relationships) compileOne(r);
  for (const c of spec.concepts) {
    for (const r of c.relationships) compileOne(r, normalizeConcept(c.concept));
  }
  return out;
}

/** The transitive `⊑` closure: `sub[x]` = every concept `x` is-a (directly or transitively). */
export function subsumptionClosure(relations: readonly CompiledRelation[]): Map<string, Set<string>> {
  const direct = new Map<string, Set<string>>();
  for (const r of relations) {
    if (r.kind !== "sub") continue;
    if (!direct.has(r.a)) direct.set(r.a, new Set());
    direct.get(r.a)!.add(r.b);
  }
  const closure = new Map<string, Set<string>>();
  for (const start of direct.keys()) {
    const seen = new Set<string>();
    const stack = [...(direct.get(start) ?? [])];
    while (stack.length > 0) {
      const next = stack.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      for (const up of direct.get(next) ?? []) stack.push(up);
    }
    closure.set(start, seen);
  }
  return closure;
}
