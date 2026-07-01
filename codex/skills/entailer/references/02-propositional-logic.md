# 02 — Propositional (sentential) logic

The logic of whole statements joined by connectives, with no peek inside at
objects or quantifiers. The first tool to reach for: if an argument's validity
turns only on `and / or / not / if-then`, formalize it here. Reach for first-order
logic (`03`) only when quantifiers or relations do real work.

## Syntax

- **Atoms** (propositional variables): `P, Q, R, …` — each stands for a complete
  declarative sentence that is true or false.
- **Connectives**, by binding strength (tightest first):

  | Symbol | Name | English | Also written |
  |--------|------|---------|--------------|
  | `¬` | negation | "not", "it is not the case that" | `~`, `!` |
  | `∧` | conjunction | "and", "but", "moreover" | `&`, `·` |
  | `∨` | disjunction (inclusive) | "or" (and/or) | `+`, `\|` |
  | `→` | conditional | "if … then", "only if", "implies" | `⊃`, `=>` |
  | `↔` | biconditional | "if and only if", "iff", "exactly when" | `≡`, `<=>` |

- **Well-formed formula (wff)**: atoms are wffs; if `φ`, `ψ` are wffs so are `¬φ`,
  `(φ ∧ ψ)`, `(φ ∨ ψ)`, `(φ → ψ)`, `(φ ↔ ψ)`. Nothing else is.

## Semantics — truth tables

A **valuation** assigns true/false to each atom. The connectives are truth-
functional (the value of a compound depends only on the values of its parts):

| `P` | `Q` | `¬P` | `P∧Q` | `P∨Q` | `P→Q` | `P↔Q` |
|----|----|----|----|----|----|----|
| T | T | F | T | T | T | T |
| T | F | F | F | T | **F** | F |
| F | T | T | F | T | T | F |
| F | F | T | F | F | T | T |

**The conditional is the classic trap.** `P → Q` is false in exactly one case:
`P` true and `Q` false. A false antecedent makes the conditional *vacuously true*
("if the moon is cheese, then 2+2=5" is true). The conditional is **not**
causation, **not** temporal order, and **not** the biconditional. "P only if Q"
formalizes as `P → Q` (not `Q → P`); "P if Q" is `Q → P`. See `06` for the
English-mapping traps.

## The three statuses of a formula

- **Tautology** (logically true / valid): true under *every* valuation. e.g.
  `P ∨ ¬P`, `P → P`, `(P ∧ (P → Q)) → Q`.
- **Contradiction** (unsatisfiable): false under *every* valuation. e.g. `P ∧ ¬P`.
- **Contingency**: true under some valuations, false under others.

A set of formulas is **satisfiable** iff some single valuation makes them all true
— this is the property we check for **consistency of a spec / requirement set**.

## Validity and entailment

An argument with premises `Γ = {γ₁, …, γₙ}` and conclusion `φ` is **valid** iff
every valuation that makes all of `Γ` true also makes `φ` true. Written `Γ ⊨ φ`
(semantic entailment).

Three equivalent ways to test it (pick the cheapest):
1. **Truth table** of premises vs. conclusion: look for a row with all premises
   true and conclusion false. None exists ⇒ valid. (Exponential: 2ⁿ rows.)
2. **Refutation**: `Γ ⊨ φ` iff `Γ ∪ {¬φ}` is **unsatisfiable**. Try to build a
   countermodel; if forced into contradiction, it's valid.
3. **Deduction theorem**: `Γ ⊨ φ` iff `⊨ (γ₁ ∧ … ∧ γₙ) → φ` is a tautology.

A single valuation making all premises true and the conclusion false is a
**counter-model** — the gold-standard *proof of invalidity*. Always produce one
when ruling an argument invalid.

## Valid argument forms (the workhorses)

| Name | Form |
|------|------|
| Modus ponens | `P → Q`, `P` ⊢ `Q` |
| Modus tollens | `P → Q`, `¬Q` ⊢ `¬P` |
| Hypothetical syllogism | `P → Q`, `Q → R` ⊢ `P → R` |
| Disjunctive syllogism | `P ∨ Q`, `¬P` ⊢ `Q` |
| Constructive dilemma | `P → Q`, `R → S`, `P ∨ R` ⊢ `Q ∨ S` |
| Simplification / Conjunction | `P ∧ Q` ⊢ `P` ; `P`, `Q` ⊢ `P ∧ Q` |
| Addition | `P` ⊢ `P ∨ Q` |

## Invalid look-alikes (the two to always check for)

- **Affirming the consequent**: `P → Q`, `Q` ⊬ `P`. (Counter-model: `P`=F, `Q`=T.)
- **Denying the antecedent**: `P → Q`, `¬P` ⊬ `¬Q`. (Counter-model: `P`=F, `Q`=T.)

These are the most common *formal* fallacies in real prose because they mimic modus
ponens / modus tollens. See `07`.

## Key equivalences (for normalizing before you check)

- **Double negation**: `¬¬P ≡ P`
- **De Morgan**: `¬(P ∧ Q) ≡ ¬P ∨ ¬Q`; `¬(P ∨ Q) ≡ ¬P ∧ ¬Q`
- **Material conditional**: `P → Q ≡ ¬P ∨ Q`
- **Contrapositive**: `P → Q ≡ ¬Q → ¬P` (valid) — but `P → Q ≢ Q → P` (converse,
  **not** equivalent) and `≢ ¬P → ¬Q` (inverse, **not** equivalent)
- **Biconditional**: `P ↔ Q ≡ (P → Q) ∧ (Q → P)`
- **Distribution**: `P ∧ (Q ∨ R) ≡ (P ∧ Q) ∨ (P ∧ R)` and dual
- **Exportation**: `(P ∧ Q) → R ≡ P → (Q → R)`

## Normal forms

- **NNF** (negation normal form): `¬` only on atoms; built from `∧, ∨, ¬`.
- **CNF** (conjunctive normal form): an `∧` of clauses, each clause an `∨` of
  literals. The input shape for SAT solvers and resolution (`04`).
- **DNF** (disjunctive normal form): an `∨` of terms, each an `∧` of literals.

Every formula has equivalent CNF and DNF forms (possibly exponentially larger).

## Decidability

Propositional validity / satisfiability is **decidable** — a truth table always
settles it. It is **co-NP-complete** (validity) / **NP-complete** (SAT), so the
worst case is exponential, but for the small formula sets that come out of
formalizing a document, hand-checking or a SAT solver is trivial. This is the
*comfortable* logic: when an argument fits here, the verdict is certain.

## When propositional logic is not enough

If validity depends on the internal structure of statements — "all", "some", "no",
relations between objects, identity, counting — you must go first-order (`03`).
Classic tell: the argument "All men are mortal; Socrates is a man; ∴ Socrates is
mortal" is **invalid** in propositional logic (three unrelated atoms) but valid in
FOL. Don't under-formalize.
