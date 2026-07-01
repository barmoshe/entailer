# 15 — Applications: logic in computing

Where mathematical logic actually runs — and the exact guarantee each application
gives. Extends the tooling reference (`08`) outward into databases, logic
programming, and the semantic web, so that when a user's *spec, schema, query, or
ontology* is the artifact under review, the skill states the right
decidability/semantics caveats. Tool facts verified current to mid-2026.

## Formal verification (recap + boundary)

See `08` for the decision guide. The throughline: **expressivity trades against
automation and decidability.**

- **SAT** — propositional satisfiability, **decidable but NP-complete** (Cook–Levin).
  Solvers (MiniSat, CaDiCaL, Kissat) use DPLL/**CDCL**; exponential worst case, yet
  million-variable instances solve in practice.
- **SMT (Z3)** — SAT modulo first-order background **theories** (linear arithmetic,
  bitvectors, arrays, EUF, datatypes, strings); input is **SMT-LIB 2**. Boundary,
  stated precisely: quantifier-free linear arithmetic, EUF, and bitvectors are
  **decidable**; **nonlinear integer arithmetic is undecidable** (corollary of
  Hilbert's 10th / Matiyasevich); full FOL with quantifiers is only semi-decidable, so
  Z3 attacks quantifiers with incomplete heuristics (E-matching, MBQI) and may return
  **`unknown`** — even though some *quantified* theories (Presburger, linear real
  arithmetic, real-closed fields) are in fact decidable. `unknown` is a legitimate
  answer, not a bug. Idiom: assert `Γ ∧ ¬φ`; `unsat`⇒valid, `sat`⇒invalid + model,
  `(get-unsat-core)`⇒minimal conflicting subset.
- **Model checking** — exhaustive search of a **finite-state** system against a
  **temporal** spec. **CTL** model checking is in **P**; **LTL/CTL\*** are
  **PSPACE-complete** in the formula. Main obstacle: **state explosion** (exponential
  in components) — mitigated by symbolic (BDD), bounded (SAT/SMT), and abstraction
  methods. Tools: SPIN, NuSMV/nuXmv.
- **TLA+** (Lamport) — set theory + FOL + temporal logic of actions for
  concurrent/distributed specs; **TLC** model-checks and emits a concrete
  counterexample trace. Guarantee is **bounded** (the explored configuration), which
  is exactly what FOL can't natively express (behavior over time).
- **Proof assistants** — interactive, **not push-button**; the logics are undecidable
  but proof *checking* is cheap. The trust story is **shrinking the trusted base**, by
  one of two mechanisms (don't claim soundness is absolute):
  - **De Bruijn criterion** (AUTOMATH lineage; **Lean 4**, **Rocq**): emit
    independently re-checkable proof objects verified by a small **kernel**.
  - **LCF tradition** (Milner; **HOL Light**, **Isabelle**): protect an abstract
    `thm` type so theorems are only built by primitive rules.
  Soundness still rests on kernel correctness and on which axioms / escape hatches
  (`sorry`, `native_decide`, added axioms) are used.
  - **Lean 4** — dependent type theory; **Mathlib** is the largest unified formal-math
    corpus (~230k theorems, ~110k definitions, 2025).
  - **Rocq** — **formerly Coq, renamed "The Rocq Prover" with v9.0, 12 Mar 2025**
    (rename announced Oct 2023); Calculus of Inductive Constructions; pedigree
    CompCert, Feit–Thompson.
  - **Isabelle/HOL** — classical HOL; **Sledgehammer** automation; **Archive of Formal
    Proofs (AFP)**; seL4 (first machine-checked OS-kernel correctness proof).

## Relational databases & SQL = applied first-order logic

Codd's relational model (1970) makes databases an application of **FOL**. Two query
formalisms: **relational calculus** (declarative, a FOL fragment) and **relational
algebra** (procedural: σ select, π project, ⋈ join, ∪, −, ×, ρ).

**Codd's theorem (precise)**: relational algebra and the **domain-independent**
fragment of first-order logic (= domain-independent relational calculus) have **equal
expressive power**; a language with that power is **relationally complete**. Domain
independence matters: `{x : ¬R(x)}` depends on the (infinite) domain and is *not*
domain-independent. ("Safe-range" calculus is a *decidable syntactic* restriction
coextensive in power with the domain-independent class — not literally the same set,
since domain independence is itself undecidable.)

**Where SQL departs from clean FOL** (a real source of spec bugs):
1. **Bag (multiset) semantics**, not set semantics — duplicates survive unless
   `DISTINCT`/`UNION`. Relational algebra is set-based.
2. **Three-valued logic for NULL** (Codd 1979): comparisons with `NULL` yield
   **unknown**; `WHERE` keeps only rows evaluating to *true* (not *unknown*); `x =
   NULL` is never true (use `IS NULL`). 3VL + bag semantics is a notorious trap — when
   reviewing SQL logic, **check NULL handling explicitly**.
3. **Recursion** (`WITH RECURSIVE`, SQL:1999) and aggregation go **beyond** FOL — they
   need a least-fixpoint operator.

**Guarantee**: declarative queries with a well-defined logical/algebraic semantics,
enabling sound, result-preserving query optimization.

## Logic programming: Prolog vs Datalog — the termination divide

Both sit on **Horn clauses** (≤ one positive literal). The engine is **SLD
resolution**, **sound and refutation-complete for Horn clauses**.

- **Prolog** — **Turing-complete**. SLD with **depth-first, left-to-right** search +
  backtracking, **negation-as-failure** (`\+`), **cut** (`!`). SLD is
  **semi-decidable**: a *fair* search finds any solution, but Prolog's actual
  depth-first strategy **may not terminate** (left recursion, infinite branches) — so
  it is *theoretically* complete, *operationally* incomplete on infinite search
  spaces. Tabling (SLG) recovers termination for a broad class.
- **Datalog** — the **decidable** restriction: Horn clauses **without function
  symbols** + a **range-restriction/safety** condition. Evaluation **always
  terminates**; semantics is the **least fixpoint** of the immediate-consequence
  operator `T_P` (= least Herbrand model); recursion (transitive closure) is
  expressible, which relational algebra can't. **Data complexity is PTIME-complete**;
  with **stratified negation** it stays well-defined and terminating. (Plain Datalog
  has no negation — "negation-as-failure" is properly a Prolog / stratified-Datalog
  feature.)

**Summary**: Prolog = expressive but no termination guarantee; Datalog = less
expressive but guaranteed-terminating, polynomial, unique least-model semantics.

## Description logics & the semantic web (OWL)

**Description logics (DLs)** are deliberately **decidable fragments of FOL** for
knowledge representation (concepts, roles, individuals); they underpin **W3C OWL** and
reasoners (HermiT, Pellet, ELK, FaCT++).

- **SHOIN(D)** — DL behind **OWL DL (OWL 1)**; decidable, **NExpTime-complete**.
- **SROIQ(D)** — DL behind **OWL 2 DL**; richer, still decidable but
  **N2ExpTime-complete** (tableau algorithms).
- **OWL Full** — **undecidable** (no class/individual separation).
- **OWL 2 profiles** trade expressivity for tractability (LOGSPACE–PTIME): **EL**
  (PTime-complete; SNOMED CT), **QL** (FO/SQL-rewritable, AC⁰ data complexity, below
  PTIME), **RL** (PTime data complexity, translatable to **Datalog**).

**The semantic divide to flag**: DLs/OWL use the **Open-World Assumption** — absence
of a fact does *not* make it false — and by default **no Unique Name Assumption**.
This is the **opposite** of databases/Datalog/Prolog (closed-world +
negation-as-failure + usually unique names). A DL reasoner gives **sound entailment
under classical FOL semantics within a decidable fragment** — what *must* be true; it
never infers a negative from mere absence. When a spec mixes "the system knows X is
false" (closed-world) with ontology reasoning (open-world), that mismatch is a
high-value finding.

## The one-line guarantee table

| Application | Logical core | Guarantee |
|-------------|--------------|-----------|
| SAT | propositional logic | decidable, NP-complete; sound model/UNSAT |
| SMT (Z3) | FOL + decidable theories | decision proc. on decidable fragments; else `unknown` |
| Model checking | temporal logic (LTL/CTL) over finite states | decidable; bounded to explored states |
| TLA+/TLC | set theory + FOL + TLA | bounded counterexample search |
| Proof assistants | type theory / HOL | machine-checked *given* a small trusted kernel |
| RDB / SQL | domain-independent FOL (Codd) | declarative semantics; **3VL NULL + bag** caveats |
| Prolog | Horn clauses + SLD | sound; Turing-complete; **may not terminate** |
| Datalog | function-free Horn + safety | sound; **always terminates**; PTIME; least model |
| OWL DL | decidable FOL fragment (DL) | sound entailment; **open-world**, no UNA |

## Sources

- Cook–Levin; Z3 / SMT-LIB (smt-lib.org); model checking (Clarke/Emerson/Sifakis);
  TLA+ (Lamport); Rocq 9.0 release notes; Lean Mathlib; Isabelle AFP (isa-afp.org);
  Codd's theorem; Guagliardo & Libkin on SQL semantics; SLD resolution; W3C OWL 2
  Profiles (w3.org/TR/owl2-profiles).
