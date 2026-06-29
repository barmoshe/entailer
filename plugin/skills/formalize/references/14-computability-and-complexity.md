# 14 — Computability & complexity: the hard ceiling

What no checker — this skill included — can promise. Computability theory fixes the
limits on automated reasoning; the honesty rules in `05`/`99` are downstream of these
theorems. The bottom line up front: **a logic checker can be sound, and it can be a
semi-decider, but it cannot be a total decider for any sufficiently expressive
semantic property.** Honest outputs are "proof found / counter-model found / still
searching" — never a guaranteed universal yes/no.

## Turing machines and the Church–Turing thesis

A **Turing machine** formalizes mechanical symbol manipulation; a **universal** TM
simulates any TM from an encoding. The **Church–Turing thesis (CTT)**: a function is
*effectively calculable* iff it is *Turing-computable*. Independent formalisms
(λ-calculus, general recursive functions, register machines) define the **same**
class — the chief evidence.

Precision points (often botched):
- CTT is a **thesis, not a theorem** — "effectively calculable" is informal; it
  cannot be *proved*. Don't call it proven.
- It is about computability **in principle**, not efficiency. The stronger
  "extended/physical" CTT (physical computation is *efficiently* TM-simulable) is a
  separate, contested claim.

## Decidable / semi-decidable / undecidable

For a set (decision problem) `A`:
- **Decidable (recursive)**: a TM halts on *every* input with the right yes/no.
- **Semi-decidable (recursively enumerable, r.e.)**: a TM halts-and-accepts exactly
  on members of `A`, may loop forever on non-members. Equivalently, `A` can be
  *listed*.
- **Undecidable**: not decidable.

Structural facts (state exactly):
- **Post's theorem**: `A` is decidable **iff** both `A` and its complement `Aᶜ` are
  r.e. So an r.e. set whose complement is *not* r.e. is undecidable.
- r.e. is **not** closed under complement; decidable sets are. Strict hierarchy:
  decidable ⊊ r.e. ⊊ all sets (most sets aren't even r.e. — counting).
- Above r.e. is the **arithmetical hierarchy** (Σ⁰ₙ/Π⁰ₙ): r.e. = Σ⁰₁, co-r.e. = Π⁰₁,
  decidable = Δ⁰₁. "Halts on *all* inputs" (totality) is Π⁰₂-complete — strictly
  harder than halting.

## The halting problem

`H = { ⟨M,x⟩ : M halts on x }`. **Undecidable** (Turing, 1936, in essence).

*Diagonalization*: suppose `Halt(M,x)` decides it. Define `D(M)`: run `Halt(M,M)`;
if "halts", loop forever; else halt. Run `D(D)` — it halts iff it loops.
Contradiction; `Halt` cannot exist. (A computable cousin of Cantor's diagonal, `12`.)

Exact status (the precision most often wrong):
- `H` is **r.e. but not decidable** (simulate; accept if/when it halts).
- `H` is **NOT co-r.e.**: its complement isn't r.e. — *consequence* of undecidability
  via Post's theorem (since `H` is r.e. and undecidable, `Hᶜ` can't be r.e.).
- Historical note: Turing's 1936 paper used "circle-free" machines; the slick
  self-referential "halting" proof and name are later (Davis/Kleene). Attribute the
  *result* to Turing, not the modern phrasing.

## Reductions and Rice's theorem

**Many-one reduction** `A ≤ₘ B`: a total computable `f` with `x ∈ A ⇔ f(x) ∈ B`.
"A is no harder than B." Positive properties transfer **B→A** (if `B` is
decidable/r.e., so is `A`); equivalently undecidability transfers **A→B**. So to prove
a target `B` undecidable, **reduce a known-undecidable `A` (e.g. `H`) *into* `B`** —
the hard problem is the *source*.

**Rice's theorem (1953)**: any **nontrivial** **semantic** property of programs (a
property of the *function computed* — holds for some computable functions, fails for
others) is **undecidable**. Caveats: it applies to *semantic/extensional* properties,
not *syntactic* ones ("source contains a loop?" is decidable; "computes the
constant-0 function / is total?" is not). "Nontrivial" must be checked (the
all/none properties are trivially decidable). Rice gives undecidability, not r.e.
status (that's Rice–Shapiro).

## The bridge to logic

- **Church's theorem (Church & Turing, 1936)**: first-order **validity is
  undecidable**. But it is **r.e. (semi-decidable)**: by Gödel completeness, valid =
  provable, proofs are finite, so enumerate proofs — you confirm any valid formula
  *eventually*, but may search forever on an invalid one. (FOL validity is Σ⁰₁; FOL
  satisfiability is co-r.e.)
- **Trakhtenbrot's theorem (1950)**: validity over **finite** models is undecidable
  **and not even r.e.** (it's co-r.e.; finite *satisfiability* is r.e.). So there is
  **no sound, complete, recursive proof system for FOL over finite models** — Gödel
  completeness has no finite-model analogue. (Holds for signatures with a relation of
  arity ≥ 2; FO over finite models with only unary relations is decidable.)
- **Gödel incompleteness (1931)** — state with hypotheses (`05`): *First* — a
  consistent, **effectively (r.e.) axiomatized** theory interpreting enough arithmetic
  (e.g. Robinson Q) doesn't prove its Gödel sentence `G`; with ω-consistency it
  doesn't prove `¬G` either (Rosser 1936: plain consistency suffices). *Second* — such
  a theory strong enough to formalize its own provability (e.g. PA; Q is too weak)
  cannot prove `Con(T)` (intensional — depends on how `Con(T)` is expressed, Feferman).

## Complexity (the resource-bounded refinement)

All below are **decidable** problems — complexity is orthogonal to computability.
- **P** — polynomial time. **NP** — poly-time on a nondeterministic TM; equivalently,
  "yes" instances have poly-checkable certificates (NP is *not* "non-polynomial").
- **co-NP** — complements of NP; "no" instances have short certificates.
  **TAUTOLOGY / propositional validity is co-NP-complete**; **SAT is NP-complete**
  (Cook–Levin, `02`).
- **PSPACE** — polynomial space, any time. **QBF** (true quantified boolean formulas)
  is PSPACE-complete.
- Known: `P ⊆ NP ⊆ PSPACE`, `P ⊆ co-NP ⊆ PSPACE`, `PSPACE ⊆ EXPTIME`, and `P ⊊
  EXPTIME` (time hierarchy). **Open (as of 2026)**: P vs NP, NP vs co-NP, P vs PSPACE
  — do not assert resolved.
- **Decidable ≠ feasible**: Presburger arithmetic is decidable with a *double-
  exponential* lower bound.

## What this bounds in the skill

1. **No total decider for nontrivial behavior** (Rice): a checker asking a nontrivial
   semantic question about arbitrary programs/specs must give up one of {sound,
   complete, always-terminating}.
2. **FOL checking is at best a semi-decider**: confirm valid entailments eventually;
   never promise termination on invalid/satisfiable inputs. Contract: *proof found /
   counter-model found / still searching*.
3. **Soundness vs completeness is forced**: real tools pick sound-but-incomplete
   (false alarms / "unknown") or complete-on-a-decidable-fragment (SAT, EPR,
   Presburger, guarded fragment, finite-state) at the cost of expressiveness. No free
   lunch that is sound + complete + terminating + fully expressive.
4. **No self-certified totality** (Gödel II): a strong checker can't prove its own
   soundness from within; trust bootstraps from a believed-consistent metatheory.
5. **Surface "unknown / timeout" as a first-class answer.** It is the honest output,
   not a failure to hide.

## Sources

- SEP: *Church–Turing Thesis*, *The Entscheidungsproblem*, *Gödel's Incompleteness
  Theorems*. Rice's theorem; Halting problem; Trakhtenbrot's theorem; Cook–Levin
  (standard references).
