# 22 — Type theory and the Curry–Howard correspondence

The ladder above first-order logic, and the bridge between *proving* and
*programming*. `04`/`05` give the proof-theory; `08` lists the proof assistants as an
optional escalation. This file explains **what that escalation actually is** — why a
proof assistant checks a proof by *type-checking* a program, what each rung of the
type-theory ladder buys and costs, and why moving up from FOL/SMT (`03`/`08`) changes
the *kind* of obligation you take on, not merely the tool.

> **Prime directive: a proof is a program; its type is the theorem.** Under
> Curry–Howard, to certify an entailment in Lean/Rocq you must *construct an inhabitant*
> of the type that encodes it. There is no "the solver said valid" shortcut: the
> deliverable is a total, constructive term the kernel accepts. Escalate only when the
> entailment genuinely needs it (`08`'s boundary rule).

## Lambda calculus: untyped → simply-typed

The **untyped λ-calculus** (Church, 1930s) is a minimal model of computation:
variables, **abstraction** `λx. M` (a function), and **application** `M N`. Its one
computation rule is **β-reduction**: `(λx. M) N → M[x := N]` (substitute the argument).
It is **Turing-complete** — and therefore some terms (e.g. `(λx. x x)(λx. x x)`) loop
forever, never reaching a **normal form** (`14`).

The **simply-typed λ-calculus (STLC)** assigns each term a **type** built from base
types and the arrow `A → B` (functions from `A` to `B`). Typing rules reject the
self-application above. The payoff is **strong normalization**: *every* well-typed
term reduces to a normal form in finitely many steps, regardless of reduction order.
Typing has bought termination — at the cost of Turing-completeness. **β-reduction is
computation; normalization is evaluation running to a value.** Hold that thought.

## The Curry–Howard correspondence

**Curry–Howard** (Curry 1934; Howard 1969) observes a precise, structural identity
between *logic* and *typed computation*:

| Logic | Type theory |
|-------|-------------|
| proposition | type |
| proof of `A` | program (term) of type `A` |
| `A → B` (implication) | function type `A → B` |
| `A ∧ B` | product / pair type `A × B` |
| `A ∨ B` | sum type `A + B` |
| `⊤` / `⊥` | unit type / empty type |
| `∀x. P(x)` | dependent function type `Πx. P(x)` |
| `∃x. P(x)` | dependent pair type `Σx. P(x)` |
| modus ponens | function application |
| **proof normalization (cut-elimination, `04`)** | **program evaluation (β-reduction)** |

Three slogans: **propositions-as-types**, **proofs-as-programs**, and
**normalization-as-evaluation**. The last is the deep one: Gentzen's cut-elimination
(`04`) *is* β-reduction on the corresponding terms. A proof in normal form is a
fully-evaluated program.

**This is why a proof assistant checks a proof by type-checking.** To verify "`Γ`
proves `φ`", the kernel checks that the submitted term has type `φ` under context `Γ`.
Type-checking in these systems is **decidable** even though theorem-finding is not —
so the *trusted* core is small (a type-checker), and finding the term is the
(undecidable, human/tactic-assisted) hard part. The asymmetry of `04`/`05` reappears:
producing a checkable proof object certifies validity; failing to find one certifies
nothing.

## The type-theory ladder

Each rung adds quantification power and pays in metatheory:

| System | Adds | Corresponds to |
|--------|------|----------------|
| **STLC** | base types, `→` | implicational propositional logic |
| **System F** (Girard 1972 / Reynolds 1974) | `∀` over **types** (parametric polymorphism) | second-order propositional logic; still strongly normalizing (Tait–Girard reducibility candidates) |
| **λΠ / dependent types** | types indexed by **terms** (`Πx:A. B(x)`, `Σx:A. B(x)`) | first-order quantification `∀`/`∃` |
| **Martin-Löf Type Theory (MLTT)** | dependent `Π`/`Σ`, identity type `Id`, inductive types, universes | a full constructive foundation (a rival to set theory, `12`) |
| **Calculus of (Inductive) Constructions (CIC)** | CoC (Coquand–Huet) + inductive definitions (Christine Paulin, 1990) | the kernel logic of **Rocq** |

- **System F** is where polymorphism (`∀α. α → α`) lives; Girard proved its strong
  normalization as part of his PhD (also settling cut-elimination for second-order
  arithmetic).
- **Dependent types** let a type *mention a value* — `Vector A n` (a list of length
  `n`), or `Πn:ℕ. P(n)` (a proof for every `n`). This is what makes the type system
  expressive enough to state arbitrary theorems.
- **MLTT** (Per Martin-Löf, 1970s) is a complete constructive foundation; its
  identity type is the seed of **Homotopy Type Theory**. **CIC** is MLTT-style theory
  plus inductive families, and is the engine under both major assistants below.

## Higher-order logic — the expressiveness/decidability trade

FOL quantifies over *objects* only (`03`). **Higher-order logic (HOL)** quantifies
over **predicates and functions** (`∀P. …`) — System F and above live here. The gain:
you can state categoricity, induction-as-a-single-axiom, "every property such that…".
The cost is exactly the boundary `03` flags as *avoided* and `05` makes precise:

- HOL (with standard semantics) has **no complete recursive proof system** and is
  **not even semi-decidable** — there is no procedure that enumerates all the
  validities (`05`'s decidability ladder, bottom row). FOL's clean `Γ ⊢ φ ⇔ Γ ⊨ φ`
  (Gödel completeness, `05`) is *lost*. (Under **Henkin semantics** HOL re-inherits
  FOL's completeness — but the standard, *full* semantics is what HOL is usually
  asked to mean.)
- Practically: a HOL-based assistant (Isabelle/HOL, `08`) cannot promise to *find*
  proofs, only to *check* them. The completeness guarantee that lets `04`'s hand
  methods and `08`'s SMT push-button confidently report "valid" does **not** transfer.

So climbing the ladder trades the *automatic* verdicts of propositional/SMT checking
for *expressive* statements that a human (or tactic) must prove by hand.

## Constructive vs. classical

Curry–Howard pairs natively with **intuitionistic** logic, because a proof-as-program
must *construct* its witness. The **BHK interpretation** (Brouwer–Heyting–Kolmogorov)
spells out the connectives constructively:

- a proof of `A ∧ B` is a pair of proofs; of `A → B`, a *method* converting any proof
  of `A` into one of `B`; of `A ∨ B`, a proof of one disjunct **plus a tag saying
  which**; of `∃x. P(x)`, an actual **witness** `a` together with a proof of `P(a)`.
- Consequently `A ∨ ¬A` (**excluded middle**) is **not** generally valid: it would
  require a uniform method deciding every proposition — an algorithm that does not
  exist. Likewise `¬¬A → A` and non-constructive existence proofs fail.

**What excluded middle costs.** Adopting classical logic in a proof assistant
(`Classical` in Rocq, `Classical.em` / `by_contra` in Lean) is sound but throws away
the **computational content**: a classical existence proof may assert "a witness
exists" without producing one, so you lose the proofs-as-programs payoff (you can no
longer *extract* a running algorithm from the proof). When the user's claim is a pure
logical entailment, classical axioms are usually fine; when they want a *construction*
(an algorithm, an explicit witness), insisting on constructivity is the whole point.
**Report which logic the proof assumed** — the same validity-vs-faithfulness honesty
as `05`.

## The escalation payoff (and the bill)

When does an entailment outrun FOL/SMT (`08`) and warrant Lean/Rocq?

- **Genuine quantified theorems with induction** over inductively-defined structures
  (lists, trees, naturals, syntax) — SMT (`08`) handles quantifier-free / decidable
  fragments reliably and only *incompletely* attempts quantified problems (Z3's
  e-matching can return `unknown`, per `99`); unbounded induction is the assistants'
  home turf.
- **Higher-order statements** (quantifying over functions/predicates) that FOL cannot
  even express (`03`/above).
- **A claim where "trust me" is unacceptable** and a *machine-checked, reproducible*
  proof object is the deliverable.

What escalating **buys**: a proof term checked by a small trusted kernel — the
strongest validity certificate available, stronger than a hand derivation (`04`) or an
SMT `unsat` (`08`), because the artifact itself is re-checkable.

What it **demands** (the discipline): you must *supply* that term. There is no
push-button verdict — proof construction is interactive (tactics, lemmas, possibly
hundreds of lines), the obligation is **total and constructive** unless you explicitly
import classical axioms, and the burden is real. Per `08`'s boundary rule, the
evaluator's default output here is at most a **theorem statement + proof sketch** in
Lean/Rocq syntax, with a note that full certification is a separate, human-in-the-loop
effort — never a claimed proof you did not actually get the kernel to accept.

## Current tooling (verify at use time — this churns)

- **Lean 4** — dependent type theory on CIC-style foundations; library **Mathlib**;
  strong momentum in formalized maths and AI-assisted proving. Latest stable **4.31.0**
  (June 2026).
- **Rocq** (formerly **Coq**, renamed *The Rocq Prover* at v9.0, March 2025) — kernel
  is **CIC**; libraries incl. Mathematical Components; pedigree in verified software
  (CompCert). Latest **9.2.0** (March 2026).
- **Isabelle/HOL** — higher-order logic (not dependent types), so no proofs-as-programs
  in the CIC sense, but powerful **Sledgehammer** automation and the Archive of Formal
  Proofs (`08`).

## Sources

- SEP: *The Curry–Howard Correspondence* / *Intuitionistic Type Theory*,
  *Intuitionistic Logic*, *Type Theory*, *Intuitionism in the Philosophy of
  Mathematics* — plato.stanford.edu.
- Howard, W. A. (1969/1980), "The formulae-as-types notion of construction."
- Girard, J.-Y. (1972, PhD) & Reynolds, J. C. (1974) — System F; Girard, Lafont,
  Taylor, *Proofs and Types* (normalization, reducibility candidates).
- Martin-Löf, P., *Intuitionistic Type Theory* (1984); Coquand & Huet, Calculus of
  Constructions; Paulin-Mohring (1990), inductive definitions → CIC.
- Lean 4 releases — github.com/leanprover/lean4/releases (4.31.0, 2026-06-13); Rocq
  releases — rocq-prover.org/releases (9.2.0, 2026-03-27); Isabelle AFP — isa-afp.org.
- Cross-refs: `03` (FOL, higher-order boundary), `04` (cut-elimination = normalization),
  `05` (completeness/decidability ladder), `08` (proof assistants as escalation),
  `12` (type theory vs. set theory as foundation), `14` (computability, normal forms),
  `99` (SMT incompleteness on quantifiers).
