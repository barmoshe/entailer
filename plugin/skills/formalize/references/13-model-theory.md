# 13 — Model theory: language vs. structure

The semantic layer beneath `05`. Model theory studies the relation between a
**formal language** (uninterpreted marks) and the **structures** that interpret it.
It is the precise account of the move the skill runs on: *evaluating validity =
checking whether the interpretations that satisfy the premises also satisfy the
conclusion*, and **a counter-model is the certificate of invalidity**.

## Structures and interpretation

A **signature** σ lists the non-logical symbols: constants, function symbols
(with arities), relation/predicate symbols (with arities). It fixes the language —
the terms and formulas buildable from σ plus logical symbols and variables.

A **structure (model)** `M` for σ is a non-empty **domain** `|M|` plus an
**interpretation** assigning: each constant `c` an element `c^M ∈ |M|`; each n-ary
function `f` an operation `f^M : |M|ⁿ → |M|`; each n-ary relation `R` a set
`R^M ⊆ |M|ⁿ`. The slogan: **syntax is uninterpreted marks; the structure supplies
the meaning.**

## Tarski satisfaction (the recursive bridge)

Truth-in-a-structure is defined via **satisfaction** relative to a structure `M`
and a **variable assignment** `s`:
- **Terms** get a value by recursion (variables via `s`, constants/functions via `M`).
- **Atomic**: `M,s ⊨ R(t₁,…,tₙ)` iff `(t₁^{M,s},…) ∈ R^M`; `t₁ = t₂` iff equal values.
- **Connectives**: the obvious clauses.
- **Quantifiers**: `M,s ⊨ ∃x φ` iff some `a ∈ |M|` has `M,s[x:=a] ⊨ φ`; `∀x` dually.

A **sentence** (no free variables) has satisfaction independent of `s`, so
`M ⊨ φ` ("φ is true in `M`") is well-defined. The recursion is the point: the truth
of a compound reduces to the truth of its parts. **Tarski's undefinability theorem**:
arithmetical truth is not definable inside first-order arithmetic itself — the truth
definition needs a richer metalanguage (the theory/metatheory split of `01`).

## Theories, models, and two notions of "complete"

- A **theory** `T` is a set of sentences; `M ⊨ T` iff `M` satisfies all of them.
  `T` is **satisfiable/consistent** iff it has a model.
- **Semantic entailment**: `T ⊨ φ` iff every model of `T` satisfies `φ`.
- A theory is **complete** iff for every sentence `φ`, `T ⊨ φ` or `T ⊨ ¬φ`.

> **Do not conflate the two "completes."** *Completeness of the logic* (FOL has it —
> Gödel completeness, below) says every valid formula is provable. *Completeness of
> a theory* (PA lacks it — Gödel **incompleteness**, `05`) says the theory decides
> every sentence. Both are true at once and there is no contradiction: PA's Gödel
> sentence is true in the standard model but false in other models of PA, so it is
> not *logically valid* and completeness does not require it provable.

## Elementary equivalence vs. isomorphism

- **Isomorphism** `M ≅ N`: a structure-preserving bijection of domains.
- **Elementary equivalence** `M ≡ N`: `M` and `N` satisfy exactly the same
  first-order sentences.
- `M ≅ N ⇒ M ≡ N`. The **converse fails** in general: `(ℚ,≤) ≡ (ℝ,≤)` (both dense
  linear orders without endpoints — a complete theory) yet `ℚ ≇ ℝ`.
- The converse **does** hold for **finite** structures (in a finite signature):
  there `M ≡ N ⇒ M ≅ N`. Finiteness is sufficient, not necessary — it also holds for
  infinite models when the theory is categorical in their shared cardinality (all
  countable models of DLO are isomorphic).

## Definability (the power tool)

`D ⊆ |M|ⁿ` is **definable** iff some formula `φ(x̄, ȳ)` and parameters `ā` give
`D = { b̄ : M ⊨ φ(b̄, ā) }`; **0-definable** = no parameters (state which convention
you mean). Key lever: **an automorphism of `M` fixes every 0-definable set**, so a
set moved by an automorphism is provably *not* 0-definable — the standard way to show
something *cannot* be expressed.

## The metatheorems the skill leans on

- **Soundness**: `Γ ⊢ φ ⇒ Γ ⊨ φ`. **Gödel completeness (1929/30)**:
  `Γ ⊨ φ ⇒ Γ ⊢ φ`. Together, for FOL, `Γ ⊢ φ` **iff** `Γ ⊨ φ`. Equivalent
  **Model Existence**: every consistent FOL theory has a model (Henkin term model).
- **Compactness**: a set Σ has a model iff every *finite* subset does. Follows from
  completeness (proofs are finite). **Use**: add `c > 0, c > 1, c > 2, …` to the
  theory of `(ℕ, +, ×, <)`; every finite subset is satisfiable, so by compactness the
  whole set has a model — a **non-standard model of arithmetic** with an element above
  every numeral. Compactness is exactly *why* FOL cannot express "finite",
  "well-founded", or "reachable in finitely many steps". (For specs: FOL can't say
  "terminates eventually" — that's temporal, `06`/`08`.)
- **Löwenheim–Skolem** (countable signature, infinite model): **downward** — has a
  countable model; **upward** — has models of every infinite cardinality ≥ the
  signature size. **Consequence**: no FOL theory with an infinite model is categorical
  — FOL can't pin an infinite structure to a unique shape.
- **Skolem's paradox**: ZFC proves "uncountable sets exist", yet (if consistent) has a
  *countable* model. No contradiction: **countability is not absolute** — the
  bijection witnessing countability lives outside the model. *Satisfaction is internal
  to the structure doing the counting.*
- **Łoś–Vaught test**: a satisfiable theory with **no finite models** that is
  **κ-categorical for some infinite κ ≥ |language|** is **complete**. (Morley 1965:
  categorical in *some* uncountable κ ⇒ categorical in *all* uncountable κ.)

## Why this is the engine of the verdict

An argument `Γ ∴ φ` is **valid** iff `Γ ⊨ φ` — every structure satisfying all of `Γ`
also satisfies `φ`. So validity-checking *is* ranging over interpretations and
testing them by the Tarski clauses. A **counter-model** is a structure with `M ⊨ Γ`
and `M ⊭ φ` (i.e. `M ⊨ Γ ∪ {¬φ}`); exhibiting one is a complete certificate of
**invalidity**.

The asymmetry to encode (sharpened against `05`):
- A **derivation** (or solver UNSAT of `Γ ∪ {¬φ}`) certifies **valid**.
- A **counter-model** is the *semantic witness* of **invalid** — but, unlike a proof,
  it is **not always a finite or effectively checkable certificate** (counter-models
  can be infinite; counter-model existence is *not* r.e. — cf. Trakhtenbrot, `14`).
  Validity is r.e.; invalidity is co-r.e. (the dual class).
- Therefore **"no counter-model found" within a bounded search is NOT "valid"**, and
  "no contradiction found" is NOT "proven consistent." Only a witnessed counter-model
  or a derivable `⊥` is a hard verdict.

## Sources

- SEP: *Model Theory*, *First-order Model Theory*, *Tarski's Truth Definitions*,
  *Skolem's Paradox* — plato.stanford.edu.
- Gödel's completeness theorem; Compactness theorem; Łoś–Vaught test; Morley's
  categoricity theorem (standard references).
