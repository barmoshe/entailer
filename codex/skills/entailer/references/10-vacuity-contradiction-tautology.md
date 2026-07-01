# 10 — Vacuity, contradiction, tautology, and trivial truth

The "degenerate" truth-values that quietly break evaluations. A surprising share of
real bugs in specs and arguments live here: statements that are *technically* true
or *technically* valid while saying nothing, or premise sets that secretly prove
everything. This file is the dedicated detector. (Foundations in `02`; spec
manifestations in `07`.)

## The four statuses of a statement (recap, then sharpened)

| Status | Definition | Risk it carries |
|--------|------------|-----------------|
| **Tautology** (valid) | true under *every* valuation/model | a requirement that's a tautology constrains **nothing** |
| **Contradiction** (unsatisfiable) | false under *every* valuation/model | a premise set containing one **proves everything** |
| **Contingency** | true on some, false on others | the normal, informative case |
| **Satisfiable** | true on *at least one* valuation | minimum bar for a *consistent* spec |

A claim being *true* is not enough — ask whether it could have been false. A
statement that **could not** have been false (tautology) carries **zero
information** about the world or the system.

## Vacuous truth — the quiet one

A conditional `P → Q` is **vacuously true** whenever its antecedent `P` is false
(`02` truth table: F antecedent ⇒ whole conditional T). Likewise a universal
`∀x (A(x) → B(x))` is **vacuously true** when *nothing* is `A` (the empty domain of
`A`).

Why it matters for evaluation:
- **Vacuous requirement / dead rule.** "Every request over 10 GB must be rejected" is
  *satisfied for free* if no request can ever exceed 10 GB — it looks like a
  guarantee but enforces nothing. Detect: is the antecedent ever satisfiable in the
  intended model? If not, flag **vacuous** (severity *minor*, or *major* if the rule
  was meant to be load-bearing).
- **Vacuous proof step.** A lemma whose hypothesis is unreachable proves its
  conclusion trivially and supports nothing downstream.
- **"All the unicorns in the room are blue"** is true. Don't let a vacuously-true
  universal pose as evidence.

Detection rule: for each conditional/universal, **ask whether the antecedent is
satisfiable** in the relevant model. Vacuous truth = unsatisfiable antecedent.

## Contradiction and the principle of explosion (ex falso quodlibet)

In classical logic, from a contradiction **everything** follows: `⊥ ⊢ φ` for any
`φ` (`{P, ¬P} ⊨ Q` for any `Q`). This is **explosion**.

The consequence that *must* shape the procedure:

> **If the premise set is inconsistent, every conclusion is "valid."** A derivation
> from contradictory premises proves nothing about the conclusion — it only exposes
> the contradiction. Therefore **check consistency of the premises BEFORE trusting
> any validity result** (`09` step 7; `99`).

Manifestations:
- **Inconsistent spec** — the conjunction of requirements is unsatisfiable; the
  system can satisfy them only vacuously (by doing nothing) or not at all. Report the
  **minimal conflicting subset** (`05` compactness) — the smallest set of
  requirements that already clashes — so the author knows exactly what to change.
- **Latent contradiction** — no single requirement is wrong, but three together have
  no model (see the health-check example, `09.C`).
- **Self-undermining argument** — a premise contradicts another premise or the
  conclusion's presupposition.

Detection: assert all premises and `(check-sat)` (`08`), or build a tableau and see
if **all** branches close with the premises alone (before adding `¬conclusion`).

## Tautology — true but empty

A tautological premise (`P ∨ ¬P`, `P → P`, "it is what it is") adds **no
constraint** and cannot do argumentative work. A tautological *requirement* is dead
weight; a tautological *premise* dressed up as support is often a sign of **begging
the question** (`07`) or padding.

- Detect a tautology: negate it and check satisfiability — if `¬φ` is unsatisfiable,
  `φ` is a tautology.
- A *conclusion* that is a tautology is "valid" from any premises (it's valid from
  none), so a tautological conclusion means the argument's premises were irrelevant
  — flag it.

## Triviality, redundancy, and degeneracy (the wider family)

- **Trivial/degenerate satisfaction** — requirements met only by the empty/null case
  (no users, no requests). A model exists, but it's the one nobody wants. Flag when a
  spec is *consistent only vacuously*.
- **Redundant premise** — a premise entailed by the others; harmless but noise, and
  sometimes a smuggled assumption. Note as *minor*.
- **Subsumed requirement** — one rule strictly implies another, making the weaker
  one redundant.
- **Always-false guard / dead branch** — a condition that can never hold; its body is
  unreachable (the operational cousin of vacuous truth).

## The detector checklist (run during `09` step 7–8)

1. **Consistency first.** Is the premise/requirement conjunction satisfiable? If
   not → **blocker (inconsistent)**, give the minimal conflicting subset, and stop
   trusting any "valid" result derived from these premises (explosion).
2. **Vacuity scan.** For every conditional/universal, is the antecedent satisfiable
   in the intended model? Unsatisfiable → **vacuous**; flag.
3. **Tautology scan.** Is any premise or the conclusion a tautology? If a premise →
   it does no work (possible circularity); if the conclusion → premises irrelevant.
4. **Trivial-model check.** Is the only model the empty/null one? Flag "consistent
   only vacuously."
5. **Redundancy note.** Is any premise entailed by the rest? Note as *minor*.

The throughline: **"true" and "valid" are necessary but not sufficient for
"meaningful."** Vacuity, contradiction-driven explosion, and tautology are the three
ways a statement passes the logic check while contributing nothing — and catching
them is a large part of what makes this skill useful on real specs.
