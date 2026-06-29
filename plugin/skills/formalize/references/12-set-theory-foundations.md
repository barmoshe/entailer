# 12 — Set theory & the foundations of mathematics

Set theory is the **lingua franca** of modern mathematics — almost every object
(numbers, functions, relations, structures) is built from sets — and its history is
the story of *why* formalization and consistency-checking matter at all. The
foundational crisis it triggered is what motivated Hilbert's program (`01`).
Grounded in the standard sources (SEP on Russell's paradox; Zermelo–Fraenkel).

## Why a formalizer cares about set theory

1. **It's the ambient ontology.** When you formalize "every service", "the set of
   authenticated requests", "a function from users to roles", you are speaking set
   theory whether or not you name it. Relations and functions in `03` *are* sets.
2. **It's the cautionary tale.** Naive set theory was intuitively obvious and
   **inconsistent**. That is the canonical proof that *self-evident-looking premises
   can hide a contradiction* — exactly the failure the consistency check (`10`) hunts
   for in specs.
3. **Cardinality and the infinite.** Counting/uniqueness/"the" claims (`03`) and
   reasoning about infinite collections rest on Cantor's theory of size.

## Cantor: sets and the sizes of infinity

**Georg Cantor** (with Dedekind, 1870s) founded set theory and showed the
**infinite comes in different sizes**:
- Two sets have the same **cardinality** iff there's a bijection between them.
- ℕ, ℤ, ℚ are all **countable** (same size, ℵ₀).
- **Cantor's theorem**: for any set `A`, `|A| < |𝒫(A)|` (the power set is strictly
  bigger). Hence the reals ℝ are **uncountable** — strictly more numerous than ℕ
  (diagonal argument).
- **Continuum hypothesis (CH)**: is there a cardinality strictly between `|ℕ|` and
  `|ℝ|`? Gödel (1940) and Cohen (1963) showed CH is **independent** of ZFC —
  neither provable nor refutable. A concrete, famous instance of the incompleteness
  lesson (`05`): a perfectly meaningful question the standard axioms cannot settle.

## Naive set theory and its collapse — Russell's paradox

**Naive set theory** assumes **unrestricted comprehension**: for *any* property
`φ(x)`, the set `{ x : φ(x) }` exists. Intuitive — and **inconsistent**.

**Russell's paradox** (1901): let `R = { x : x ∉ x }` (the set of all sets that are
not members of themselves). Ask: is `R ∈ R`?
- If `R ∈ R`, then by its defining property `R ∉ R`.
- If `R ∉ R`, then it satisfies the property, so `R ∈ R`.

Either way, contradiction: `R ∈ R ↔ R ∉ R`. Since set theory was meant to be the
foundation of *all* mathematics, this "third foundational crisis" (after irrationals
and the infinite) threatened everything and drove the early-1900s foundations
program — logicism (Russell/Whitehead's *Principia*, with the theory of types),
formalism (Hilbert, `01`), and intuitionism (Brouwer).

*Lesson the skill internalizes:* an unrestricted, "obviously fine" principle can be
self-contradictory. **Generality is dangerous; check satisfiability** (`10`). The
self-reference structure of Russell's paradox is also the engine behind Gödel's
incompleteness and the halting problem.

## ZFC: the standard fix

**Zermelo–Fraenkel set theory with Choice (ZFC)** is the accepted standard
foundation. Zermelo (1908), extended by Fraenkel, Skolem, von Neumann. It blocks the
paradox by **replacing unrestricted comprehension with restricted (separation)**:
you may only carve a subset *out of an already-existing set*,
`{ x ∈ A : φ(x) }` — you cannot conjure `{ x : φ(x) }` from nothing, so "the set of
all sets" and `R` never form.

The axioms (informally):
- **Extensionality** — sets are equal iff they have the same members.
- **Pairing, Union, Power set** — basic constructions.
- **Separation (Aussonderung)** — subset by a property *within a given set* (the fix).
- **Replacement** — the image of a set under a definable function is a set.
- **Infinity** — an infinite set exists (gives ℕ).
- **Foundation (Regularity)** — no infinite descending `∈`-chains; no set is a
  member of itself (kills `x ∈ x` pathologies).
- **Choice (AC)** — every family of nonempty sets has a choice function (the "C").
  Independent of ZF; equivalent to Zorn's lemma and well-ordering. Occasionally
  worth flagging when an argument quietly uses it.

ZFC is not *proven* consistent (Gödel's second theorem, `05` — it can't prove its own
`Con(ZFC)`), but no contradiction has been found and it underwrites essentially all
of mainstream mathematics.

## What to actually use from this

- **Treat sets/relations/functions as the default ontology** when formalizing
  collection-, mapping-, or membership-talk (`03`). "Is `x` in the allowed set?"
  is `x ∈ A`.
- **Watch for unrestricted-comprehension-style overreach** in specs: a rule defined
  over "all things satisfying P" with no bounding domain is the spec-world echo of
  naive comprehension — check it's actually well-founded and satisfiable (`10`).
- **Self-reference is a red flag.** Definitions that refer to themselves
  ("the validator validates all validators that don't validate themselves") can be
  paradoxical/ill-founded — flag and check, don't assume they denote.
- **Independence is real.** As CH shows, "the axioms don't decide this" is a genuine
  possible outcome (`05`); report a claim as *underdetermined by the stated
  premises* rather than forcing a verdict.

## Sources

- SEP, *Russell's Paradox* — https://plato.stanford.edu/entries/russell-paradox/
- Zermelo–Fraenkel set theory; Cantor's diagonal argument & theorem.
- Gödel (1940) & Cohen (1963) on the independence of CH and AC from ZF.
