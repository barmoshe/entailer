# 05 — Soundness, completeness, and metalogic

What a "valid" verdict actually guarantees — and where the guarantees stop. This is
the metamathematics (`01`) that keeps the skill honest.

## The two senses of "entails", and the bridge between them

- **Semantic entailment** `Γ ⊨ φ`: every model of `Γ` is a model of `φ` (truth-
  preservation; `02`/`03`).
- **Syntactic derivability** `Γ ⊢ φ`: there is a formal derivation of `φ` from `Γ`
  in a chosen proof system (`04`).

A proof system relates the two via:

- **Soundness**: `Γ ⊢ φ ⇒ Γ ⊨ φ`. *Everything you can derive is genuinely valid.*
  This is what makes a found derivation trustworthy — no proof system worth using
  lacks it.
- **Completeness**: `Γ ⊨ φ ⇒ Γ ⊢ φ`. *Everything valid can be derived.* Gödel's
  **completeness theorem** (1929) establishes this for first-order logic.

Together: for FOL, `Γ ⊢ φ` **iff** `Γ ⊨ φ`. Semantic and syntactic validity
coincide — which is why `04`'s methods are interchangeable.

## The "soundness" word collision (state it in every report)

The word **sound** means two different things; the skill uses both, so it must
label which:
- **Proof-system soundness** (above): a property of the *logic*.
- **Argument soundness**: an argument is **sound** iff it is **valid** *and* all its
  **premises are true**. (`02`.) This is the everyday sense the user usually means.

The plugin can establish **validity** rigorously. It can establish **argument
soundness** only as far as it can vouch for the premises — which for empirical or
domain premises it usually cannot. **Always separate the validity verdict from the
premise-truth assessment.**

## Other load-bearing metatheorems

- **Compactness** (FOL): a set of sentences has a model iff every *finite* subset
  does. Practically: an inconsistency in a (possibly large) spec is always
  witnessed by a **finite** subset — so when you report "inconsistent," you can and
  should exhibit the **minimal conflicting subset**.
- **Löwenheim–Skolem**: a satisfiable FOL theory with an infinite model has models
  of every infinite cardinality. Consequence: FOL **cannot pin down** structures up
  to isomorphism (no categorical theory of "the" natural numbers in FOL). Relevant
  when a doc claims its axioms uniquely determine a structure — in FOL, generally
  they don't.
- **Deduction theorem**: `Γ ∪ {φ} ⊢ ψ` iff `Γ ⊢ φ → ψ`. Justifies the
  "assume-and-discharge" move of natural deduction and lets you trade premises for
  conditionals.

## Decidability ladder (how hard is the check?)

| Logic / theory | Validity status |
|----------------|-----------------|
| Propositional logic | **Decidable** (co-NP-complete) |
| Monadic FOL, `∃*∀*` (Bernays–Schönfinkel), Presburger arithmetic (ℕ, +) | **Decidable** |
| Full first-order logic | **Undecidable**, but **semi-decidable** (validity is r.e.) |
| First-order arithmetic (with ×), full second-order logic | Not even semi-decidable / no complete recursive system |

**Semi-decidable** is the operationally critical word: a complete prover will find
*every* real proof eventually, but on a non-theorem it may never halt. Hence the
asymmetry baked into the skill — **a found derivation certifies valid; only a
counter-model certifies invalid.**

## Gödel's incompleteness — the ceiling (carried from `01`)

For any consistent, effectively axiomatized theory `T` extending elementary
arithmetic:

1. **First incompleteness**: `T` is **incomplete** — some sentence `G` is true (in
   the standard model) yet neither `G` nor `¬G` is provable in `T`.
2. **Second incompleteness**: `T` cannot prove its own consistency statement
   `Con(T)` (unless `T` is inconsistent).

Consequences the skill must internalize:
- **Truth outruns provability.** "Does not follow from the stated premises" is
  *not* "false." A document's conclusion may be true yet underivable from what it
  wrote — report it as a **gap** (missing premise), not a refutation.
- **No self-certified global consistency.** We do not claim to *prove* a rich
  spec globally consistent. We report **witnessed inconsistency** (a derivable
  contradiction / unsatisfiable finite subset) when found, and otherwise
  "no inconsistency found under this formalization" — never "proven consistent."
- **The formalization is a choice.** Incompleteness and Löwenheim–Skolem together
  mean a single formal system is always a *partial, non-unique* capture. Different
  faithful formalizations can yield different verdicts; surface the choice (`99`).

## What a verdict can claim — the honesty contract

| Verdict | Justified by | Does NOT claim |
|---------|--------------|----------------|
| **Valid** | a derivation (`04`) or solver UNSAT of `Γ∪{¬φ}` | that the premises are true |
| **Invalid** | a counter-model (`03`/`04`) | that the conclusion is false |
| **Inconsistent** | a derivable `⊥` / unsatisfiable finite subset | anything about which premise is "wrong" |
| **No issue found** | bounded search found no counter-model / contradiction | that none exists (esp. in FOL) |
| **Sound** | valid **and** premises independently vouched true | more certainty about empirical premises than warranted |

Print these distinctions; they are the difference between a logician's pass and a
confident-sounding guess.
