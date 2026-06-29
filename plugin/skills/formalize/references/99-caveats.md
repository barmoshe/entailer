# 99 — Caveats: where this method lies to you

Read before trusting any verdict. A logician's pass is powerful *and* narrow; these
are the failure modes that make a confident report wrong.

## The translation is the weak link

The entire verdict rides on the formalization being **faithful**. A wrong
translation yields a *rigorous, confident, wrong* answer — the worst kind. The
validity check cannot detect its own bad inputs.

- **Always show the symbol dictionary and the formalization** so a human can audit
  the translation. A verdict without visible formalization must not ship.
- **Flag genuine ambiguity; never silently pick a reading** (`06`). Show competing
  readings when they change the verdict.
- **Mark supplied premises** `[supplied]` and call out when the argument only works
  given a premise the author didn't state (and may not accept).
- Prefer reporting **low confidence in the translation** over asserting a verdict
  built on a shaky one.

## Validity is not truth, twice over

1. **Valid ≠ sound.** We establish that the conclusion *follows from the premises*.
   Whether the premises are *true* — especially empirical or domain premises — is
   usually outside what logic can settle (`05`). Report them separately.
2. **Invalid ≠ false.** "Doesn't follow" is a claim about *form*. The conclusion may
   well be true for reasons the argument didn't capture. Never present an invalid
   argument as a refuted conclusion.

## Gödel's shadow (from `01`/`05`)

- **Truth outruns provability.** A true conclusion can be underivable from the
  stated premises. Report that as a **gap**, not a falsehood.
- **No self-certified consistency.** We report *witnessed* inconsistency (a derivable
  contradiction / unsatisfiable finite subset). For "no contradiction found," say
  exactly that — not "proven consistent."
- **FOL is only semi-decidable.** A found derivation certifies *valid*; failing to
  find one does **not** certify *invalid* — that needs a counter-model (`03`/`04`).

## What classical logic flattens

Plain propositional/first-order logic cannot natively express the following, and
will silently distort them. We now have apparatus for each — they remain **outside
the binary validity verdict**, but **route**, don't dead-end (`06`):
- **Modal** ("must/possibly/necessarily"), **deontic** ("shall/may/required" — very
  common in specs & contracts), **temporal** ("always/eventually/until") → `18`,
- **Probabilistic/vague** ("most/likely/tall/reasonable") → `19`,
- **Causal** content — the material conditional `→` is **not** causation; "after,
  therefore because" is a fallacy (`07`), and logic won't catch a causal overclaim
  dressed as a conditional → `20`.

## Not everything is a deduction

The validity verdict applies **only to deductive arguments** — those that claim the
conclusion *follows necessarily*. Most real prose (specs, RFCs, postmortems, design
rationale) argues **inductively, abductively, or defeasibly**: the conclusion is
*probable* or *best-explaining* or *defeasibly warranted*, not entailed. Such an
argument has a logically possible counter-model **by design** — that does **not** make
it invalid. Reporting an inductive/abductive/defeasible argument as **INVALID** is a
category error and a trust-destroying false positive. Classify it (`16`/`17`) and grade
it by **strength / explanatory quality / defeater status**; reserve INVALID + a
counter-model for arguments that actually assert deductive necessity.

## Vacuity and triviality can fake a "pass" (see `10`)

- A **vacuously true** conditional (unsatisfiable antecedent) is *valid* but says
  nothing — don't report it as a meaningful guarantee.
- An **inconsistent** premise set entails *everything* (explosion). If the premises
  are contradictory, every conclusion is "valid" — which means the validity verdict
  is worthless until you've checked consistency **first**. Check consistency before
  celebrating a derivation.
- A **circular** argument (begging the question) is valid but establishes nothing.
  Flag "valid but vacuous/circular" distinctly from "valid and informative."

## Scope discipline

- **Don't over-formalize.** Rhetoric, examples, motivation, and hedging are not
  premises. Formalize only what does argumentative work, or you'll manufacture
  fallacies that aren't there.
- **Don't under-formalize.** Collapsing structured statements into single atoms
  (`02`) hides the very form you're checking; going propositional when quantifiers
  matter (`03`) misses real validity. Right-size the logic.
- **False positives cost trust** as fast as misses. Every flagged issue needs a
  stated reason and, for formal fallacies, a counter-model.

## Solver caveats (`08`)

- A solver result is only as good as the **encoding** — same translation risk, now
  hidden in SMT-LIB. Show the emitted input.
- Z3 can return **`unknown`** on quantified problems; that is *not* a verdict.
- The base path must never *depend* on a solver the environment may lack.

## The honesty contract (restate in the report when relevant)

> We checked whether the conclusion **follows** from the **stated (and supplied)**
> premises under **this formalization**. We did **not** verify that the premises are
> true, that the formalization is the only faithful one, or that no issue exists
> outside what we modeled. Validity, soundness, and consistency are reported as
> separate claims.

## Machine-readable taxonomy (entailer)

The disclosure string `@entailer/core` attaches to every `LogicReport`
(`honestyContract`). Generated by `scripts/gen-taxonomy.mjs`.

<!-- entailer-data: honesty -->
```json
{
  "honestyContract": "This report certifies the logical validity and consistency of the displayed formalization only. Validity is not truth: a valid argument can rest on false premises, and premise truth is out of scope. The formalization is a translation of the prose and may be unfaithful; audit the symbol dictionary. The absence of a found contradiction is not a proof of consistency."
}
```
