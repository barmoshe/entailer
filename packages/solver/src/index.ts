/**
 * @entailer/solver — opt-in SMT escalation (DESIGN §6).
 *
 * The trusted, dependency-free part is the **SMT-LIB emitter**: a pure function
 * from the Formula AST to an SMT-LIB script. The Z3 run sits behind a lazy
 * capability probe over the optional `z3-solver` peer; if it is absent or fails
 * to init, every call degrades to `UNKNOWN` (with the emitted script attached for
 * audit) instead of throwing. The solver is an amplifier, never a gate: the
 * deterministic core verdict never depends on it.
 */
import { isPropositional, propAtomKey, type Formula } from "@entailer/core";

export class OutOfFragmentError extends Error {
  constructor(message = "the SMT emitter handles the propositional fragment only") {
    super(message);
    this.name = "OutOfFragmentError";
  }
}

const IDENT = /^[A-Za-z][A-Za-z0-9_]*$/;
/** A valid SMT-LIB symbol — quoted with `|...|` when it isn't a plain identifier. */
function smtSymbol(key: string): string {
  return IDENT.test(key) ? key : `|${key}|`;
}

/** Collect the propositional atom keys of a formula list, deduped + sorted. */
function atomKeysOf(formulas: readonly Formula[]): string[] {
  const acc = new Set<string>();
  const walk = (f: Formula): void => {
    switch (f.type) {
      case "atom":
      case "pred":
        acc.add(propAtomKey(f));
        return;
      case "top":
      case "bottom":
        return;
      case "not":
        walk(f.sub);
        return;
      case "and":
      case "or":
      case "implies":
      case "iff":
        walk(f.left);
        walk(f.right);
        return;
      case "forall":
      case "exists":
        throw new OutOfFragmentError();
    }
  };
  for (const f of formulas) walk(f);
  return [...acc].sort();
}

/** Render a propositional formula as an SMT-LIB term. */
export function toSmtTerm(f: Formula): string {
  switch (f.type) {
    case "top":
      return "true";
    case "bottom":
      return "false";
    case "atom":
    case "pred":
      return smtSymbol(propAtomKey(f));
    case "not":
      return `(not ${toSmtTerm(f.sub)})`;
    case "and":
      return `(and ${toSmtTerm(f.left)} ${toSmtTerm(f.right)})`;
    case "or":
      return `(or ${toSmtTerm(f.left)} ${toSmtTerm(f.right)})`;
    case "implies":
      return `(=> ${toSmtTerm(f.left)} ${toSmtTerm(f.right)})`;
    case "iff":
      return `(= ${toSmtTerm(f.left)} ${toSmtTerm(f.right)})`;
    case "forall":
    case "exists":
      throw new OutOfFragmentError();
  }
}

export interface EmitOptions {
  readonly premises: readonly Formula[];
  /** When present, emits the refutation script (`assert (not conclusion)`). */
  readonly conclusion?: Formula;
  readonly getModel?: boolean;
}

/**
 * Emit an SMT-LIB script. With a conclusion it is the refutation script for
 * validity (`unsat` ⇒ valid); without one it is the consistency script for the
 * premise set (`unsat` ⇒ inconsistent).
 */
export function emitSmtLib(opts: EmitOptions): string {
  const all = opts.conclusion ? [...opts.premises, opts.conclusion] : [...opts.premises];
  for (const f of all) {
    if (!isPropositional(f)) throw new OutOfFragmentError();
  }
  const keys = atomKeysOf(all);
  const lines = ["(set-logic QF_UF)"];
  for (const k of keys) lines.push(`(declare-const ${smtSymbol(k)} Bool)`);
  for (const p of opts.premises) lines.push(`(assert ${toSmtTerm(p)})`);
  if (opts.conclusion) lines.push(`(assert (not ${toSmtTerm(opts.conclusion)}))`);
  lines.push("(check-sat)");
  if (opts.getModel) lines.push("(get-model)");
  return lines.join("\n") + "\n";
}

// ---- Capability probe + runner --------------------------------------------

let availability: Promise<boolean> | null = null;

/** Lazily probe for a usable `z3-solver`. Cached; never throws. */
export function isAvailable(): Promise<boolean> {
  if (availability) return availability;
  availability = (async () => {
    try {
      const mod: any = await import("z3-solver");
      return typeof (mod.init ?? mod.default?.init) === "function";
    } catch {
      return false;
    }
  })();
  return availability;
}

export type SmtVerdict = "VALID" | "INVALID" | "UNKNOWN";

export interface SmtResult {
  readonly verdict: SmtVerdict;
  readonly method: string;
  readonly smtlib: string;
  /** Raw solver result when Z3 ran. */
  readonly raw?: "sat" | "unsat" | "unknown";
  readonly reason?: string;
}

/** Run a script through Z3's `eval_smtlib2_string`, defensively. */
async function runZ3(script: string): Promise<"sat" | "unsat" | "unknown" | null> {
  try {
    const mod: any = await import("z3-solver");
    const init = mod.init ?? mod.default?.init;
    const { Z3, em } = await init();
    const cfg = Z3.mk_config();
    const ctx = Z3.mk_context(cfg);
    Z3.del_config(cfg);
    const out: string = await Z3.eval_smtlib2_string(ctx, script);
    void em; // keep the module instance referenced
    const first = out.trim().split(/\s+/)[0];
    if (first === "sat" || first === "unsat" || first === "unknown") return first;
    return "unknown";
  } catch {
    return null;
  }
}

/**
 * Check `premises ⊨ conclusion` via SMT. `unsat` on `Γ ∪ {¬φ}` ⇒ VALID; `sat` ⇒
 * INVALID. If Z3 is unavailable or errors, returns UNKNOWN with the emitted
 * script attached — never a guess.
 */
export async function checkValiditySmt(
  premises: readonly Formula[],
  conclusion: Formula,
): Promise<SmtResult> {
  const smtlib = emitSmtLib({ premises, conclusion, getModel: true });
  if (!(await isAvailable())) {
    return {
      verdict: "UNKNOWN",
      method: "smt-unavailable",
      smtlib,
      reason: "z3-solver is not installed; install it to enable SMT escalation",
    };
  }
  const raw = await runZ3(smtlib);
  if (raw === null) {
    return { verdict: "UNKNOWN", method: "smt-error", smtlib, reason: "Z3 invocation failed" };
  }
  const verdict: SmtVerdict = raw === "unsat" ? "VALID" : raw === "sat" ? "INVALID" : "UNKNOWN";
  return { verdict, method: "z3-smtlib", smtlib, raw };
}

/**
 * Check joint satisfiability of a formula set via SMT. `unsat` ⇒ inconsistent.
 * UNKNOWN when Z3 is unavailable.
 */
export async function checkConsistencySmt(
  formulas: readonly Formula[],
): Promise<{ status: "SAT" | "UNSAT" | "UNKNOWN"; smtlib: string; reason?: string }> {
  const smtlib = emitSmtLib({ premises: formulas, getModel: true });
  if (!(await isAvailable())) {
    return { status: "UNKNOWN", smtlib, reason: "z3-solver is not installed" };
  }
  const raw = await runZ3(smtlib);
  if (raw === null) return { status: "UNKNOWN", smtlib, reason: "Z3 invocation failed" };
  return { status: raw === "unsat" ? "UNSAT" : raw === "sat" ? "SAT" : "UNKNOWN", smtlib };
}
