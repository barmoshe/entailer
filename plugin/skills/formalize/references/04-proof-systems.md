# 04 — Proof systems: does the conclusion *follow*?

Tools for the central question. **Semantic** methods (truth tables, models,
tableaux) search for a counter-model; **syntactic** methods (natural deduction,
sequent calculus, Hilbert systems, resolution) build a derivation. By soundness +
completeness (`05`) they agree on what's valid (`Γ ⊢ φ` iff `Γ ⊨ φ`), so use
whichever is cheaper for the case in hand.

> **Two outcomes, two artifacts.** To certify **valid**, produce a *derivation*.
> To certify **invalid**, produce a *counter-model / counter-valuation*. A failed
> proof search is **not** a proof of invalidity (esp. in FOL, which is only
> semi-decidable — `03`, `05`).

## Natural deduction (the default for showing validity by hand)

Reason the way mathematicians actually do, with **introduction** and **elimination**
rules for each connective and *discharge* of temporary assumptions.

Core rules (∧, →, ¬, ∨, plus quantifiers):

| Connective | Introduction | Elimination |
|------------|--------------|-------------|
| `∧` | from `φ`, `ψ` infer `φ∧ψ` | from `φ∧ψ` infer `φ` (and `ψ`) |
| `→` | assume `φ`, derive `ψ`, discharge: `φ→ψ` | from `φ→ψ` and `φ` infer `ψ` (MP) |
| `∨` | from `φ` infer `φ∨ψ` | from `φ∨ψ`, `φ⊢χ`, `ψ⊢χ` infer `χ` (cases) |
| `¬` | assume `φ`, derive `⊥`, discharge: `¬φ` | from `φ`, `¬φ` infer `⊥` |
| `⊥` | — | from `⊥` infer anything (explosion) |
| `∀` | derive `φ(a)` for arbitrary fresh `a`, infer `∀x φ(x)` | from `∀x φ(x)` infer `φ(t)` |
| `∃` | from `φ(t)` infer `∃x φ(x)` | from `∃x φ(x)` and `φ(a)⊢χ` (`a` fresh) infer `χ` |

**Quantifier side-conditions are where proofs go wrong** (state them precisely):
`∀`-introduction requires the eigenvariable to be **fresh** — not free in any
*undischarged assumption*. `∃`-elimination requires its fresh witness to be not
free in the *existential premise* `∃x.A`, in *other undischarged assumptions*, **and
additionally not free in the conclusion** `C`. Skipping a freshness check "proves"
invalid arguments — always verify it.

Classical logic adds one of: **double-negation elimination** `¬¬φ ⊢ φ`, the **law
of excluded middle** `⊢ φ ∨ ¬φ`, or **reductio** (assume `¬φ`, derive `⊥`, conclude
`φ`). Intuitionistic logic drops these — note which you're using if a document's
argument leans on excluded middle.

## Sequent calculus (Gentzen LK)

Works on **sequents** `Γ ⊢ Δ` ("the conjunction of `Γ` entails the disjunction of
`Δ`"), with left/right rules for each connective. Virtues: symmetric, and
**cut-elimination** (Gentzen's *Hauptsatz*) gives the **subformula property** —
every formula in a cut-free proof is a subformula of the endsequent. This makes
proof *search* tractable and underwrites consistency arguments. Good mental model
for *automated* derivation; heavier than natural deduction for hand work.

## Hilbert (axiomatic) systems

Many axiom schemas, one or two rules (usually just modus ponens). Minimal to
*describe*, painful to *use* (even `P → P` takes several lines). You rarely build
Hilbert proofs by hand, but they're the reference system for metatheory
(`05`, the deduction theorem) and for what "a formal proof" means in the strict
formalist sense (`01`).

## Semantic tableaux (truth trees) — great for both directions

A **refutation** method: to test `Γ ⊨ φ`, assume the premises true and the
conclusion false, then break formulas into their semantic requirements along
branches.
- A **branch closes** when it contains a formula and its negation (a contradiction).
- **All branches close** ⇒ the assumption was impossible ⇒ argument **valid**.
- An **open (saturated) branch** ⇒ read a **counter-model / counter-valuation**
  straight off it ⇒ argument **invalid**, with the witness in hand.

Tableaux are the most *mechanical* hand method and naturally yield the counter-model
when invalid, which is exactly what the report needs. Recommended default for
checking small formalized arguments. (Decision procedure for propositional logic;
a semi-decision procedure for FOL with `δ/γ` rules for `∃/∀`.)

## Resolution (the machine method)

One rule, on **CNF** (`02`): from clauses `(A ∨ ℓ)` and `(B ∨ ¬ℓ)` derive the
**resolvent** `(A ∨ B)`. To prove `Γ ⊨ φ`: negate the conclusion, add to `Γ`,
convert all to clauses, and derive the **empty clause** `□` (a contradiction).
- For FOL: first **Skolemize** (replace `∃` by Skolem functions of the governing
  `∀`s) and use **unification** to match literals. **Refutation-complete**: if the
  set is unsatisfiable, resolution can derive `□`.
- This is the engine behind many automated theorem provers and the conceptual basis
  for SAT/SMT (`08`).

## Choosing a method (decision guide)

| Situation | Reach for |
|-----------|-----------|
| Small propositional argument, want a definite yes/no + witness | Truth table or tableau |
| Show a conclusion *follows*, by hand, readably | Natural deduction |
| Show *invalid* | Tableau (open branch) or hand-built counter-model |
| Many clauses / mechanical | Resolution, or a SAT/SMT solver (`08`) |
| Consistency of a requirement set | Satisfiability check (tableau / SAT / SMT) — find a model, or prove none exists |
| Metatheory, "what is a proof" | Hilbert system / sequent calculus |

## What a derivation does and does not buy you

A correct derivation establishes **validity** — the conclusion follows *from these
premises in this logic*. It says nothing about whether the **premises are true**
(that's soundness, `05`) or whether your **formalization is faithful** (that's
`06`/`99`). Report the derivation as evidence of validity only, and keep premise-
truth and translation-fidelity as separate, explicit lines in the verdict.
