# 19 — Probabilistic and fuzzy reasoning

Where truth comes in degrees, not just T/F. Classical logic (`02`/`03`) is
bivalent; many real claims — "likely", "most", "tall", "reasonable", "soon" —
carry a *strength* or a *vagueness* that bivalence flattens. This file is the
dedicated detector for those, and for the probability errors (`07`) that survive a
clean truth table. The discipline: when a claim is probabilistic or vague, **flag
it as outside binary validity** and reason about it with the right machinery — do
not force it into `→`.

## Probability: the axioms (Kolmogorov, 1933)

A probability `P` over events of a sample space Ω satisfies:

1. **Non-negativity** — `P(A) ≥ 0`.
2. **Normalization** — `P(Ω) = 1`.
3. **Countable additivity** — for pairwise-disjoint `Aᵢ`, `P(⋃Aᵢ) = ΣP(Aᵢ)`.

Consequences worth keeping at hand: `P(¬A) = 1 − P(A)`; `P(A∨B) = P(A) + P(B) −
P(A∧B)`; and the **conjunction bound** `P(A∧B) ≤ P(A)` and `≤ P(B)` (a conjunction
is never more probable than either conjunct — this is what the Linda fallacy below
violates).

## Conditional probability and Bayes

- **Conditional probability**: `P(A|B) = P(A∧B) / P(B)` for `P(B) > 0`.
- **Bayes' theorem**: `P(A|B) = P(B|A)·P(A) / P(B)`, with
  `P(B) = P(B|A)·P(A) + P(B|¬A)·P(¬A)` (total probability).

Bayes is the bridge between the two conditionals — and the bridge is exactly where
intuition collapses.

## The inverse trap: P(B|A) ≠ P(A|B)

The single highest-yield error in this file. `P(B|A)` and `P(A|B)` are **different
numbers**; treating them as interchangeable is the **inverse / conditional-probability
fallacy**. Bayes shows they coincide only when `P(A) = P(B)` (with both `> 0`).

- **Prosecutor's fallacy.** "The chance of this DNA match if innocent is 1-in-a-
  million, so the chance the defendant is innocent is 1-in-a-million." That swaps
  `P(match|innocent)` for `P(innocent|match)` — and ignores the base rate of
  potential matches. With a base of, say, 10 million people, ~10 innocents also
  match; the posterior of guilt is nowhere near `1 − 10⁻⁶`.
- **Base-rate neglect / base-rate fallacy.** A test that is **both 99% sensitive
  and 99% specific** for a disease with **0.1% prevalence**. A positive result
  still leaves `P(disease|positive)` near **9%**:
  `P(D|+) = (0.99·0.001) / (0.99·0.001 + 0.01·0.999) ≈ 0.090`.
  People anchor on the 99% (the *likelihood*) and discard the *prior*. (`07` lists
  this as a presumption error; the formal cue is a dropped prior in a Bayes
  computation.)
- **Conjunction fallacy (Linda).** Tversky & Kahneman (1983): given a vivid profile,
  >80% of subjects rank "Linda is a bank teller **and** active in the feminist
  movement" as *more probable* than "Linda is a bank teller" — violating
  `P(A∧B) ≤ P(A)`. Same root as base-rate neglect: **representativeness**
  substituted for probability. Cross-link `07`; the cue is a conjunction judged
  above one of its conjuncts.

Detection cue: any inference of the shape "the chance of the evidence given H is
small/large, **therefore** the chance of H given the evidence is small/large"
without a stated prior. Flag it and ask for `P(H)`.

## "If A then probably B" is NOT the material conditional

The material conditional `P → Q` is truth-functional: it is **true whenever `P` is
false** (`02` truth table) and is equivalent to `¬P ∨ Q`. A probabilistic
conditional — "if it's cloudy, it'll probably rain", read as `P(rain|cloudy) = 0.7`
— behaves nothing like that:

| Property | Material `P→Q` | Probabilistic `P(Q|P)=r` |
|---|---|---|
| Vacuously true when `P` false | yes | undefined (needs `P(P) > 0`) |
| Two-valued | yes (T/F) | a degree `r ∈ [0,1]` |
| Detaches via modus ponens | yes: `P, P→Q ⊢ Q` | **no** — high `P(Q|P)` + `P` does not give `Q` |
| Chains (hypothetical syllogism) | yes | **no** — `P(Q|P)` high, `P(R|Q)` high ⊬ `P(R|P)` high |

The deductive forms of `02` are **not licensed** for probabilistic conditionals.
Flagging "if … probably …" as `→` manufactures a validity verdict the claim never
supported. This connects to defeasible reasoning — a strong but defeasible link
that new evidence can override — handed off in full to `17`.

## Fuzzy logic and vague predicates (degrees of truth in [0,1])

Some predicates have **no crisp boundary**: "tall", "reasonable", "soon", "large
file", "fast response". **Fuzzy logic** (Zadeh, 1965) assigns such a predicate a
*degree of truth* in `[0,1]` rather than `{0,1}`, with e.g.
`⟦A∧B⟧ = min(⟦A⟧,⟦B⟧)`, `⟦A∨B⟧ = max(…)`, `⟦¬A⟧ = 1 − ⟦A⟧`.

- **The sorites paradox** is the symptom. One grain is not a heap; adding one grain
  never turns a non-heap into a heap; ∴ no number of grains is a heap. Each step
  looks valid under bivalence, yet the conclusion is absurd. The diagnosis: "heap"
  (like "tall") is **vague** — there is no sharp threshold, so the tolerance
  premise `∀n (heap(n) → heap(n−1))` is not crisply true.
- For evaluation: a spec clause hinging on a vague predicate ("the response must be
  **fast**", "requests must be **reasonable**") has **no truth value to check**
  until the predicate is operationalized (a threshold, an SLA number). Flag it as a
  **vagueness gap**, not a contradiction — distinct from the vacuity of `10`.
  *Do not* invent a crisp cutoff and silently formalize it (`99`).

(Fuzzy ≠ probabilistic: fuzziness is degree-of-*truth* of a vague predicate;
probability is degree-of-*belief* about a sharp event. Don't conflate them.)

## Generalized / proportional quantifiers ("most", "few")

First-order logic (`03`) has exactly `∀` and `∃`. Natural-language quantifiers like
**"most", "few", "more than half"** are **not first-order definable** — a genuine
expressiveness limit, not a translation laziness. Barwise & Cooper (1981) treat
`most(A,B)` as a relation between sets, on the canonical form
`most(A,B) ⇔ |A∩B| > |A\B|` (more A's are B than are not). On a **finite** `A`
this reduces to the familiar `|A∩B| > |A|/2`, since `|A∩B| + |A\B| = |A|`; the two
can diverge on infinite/measure-theoretic domains — which is precisely the setting
that defeats any finite FOL rendering. The inexpressibility is shown by an
**Ehrenfeucht–Fraïssé game** argument (`13`/`21`), not by Lindström's theorem
(which *characterizes* FOL rather than proving this particular limit).

Consequence for the evaluator: a premise "**most** users do X" cannot be honestly
rendered as `∀x` (overclaim) or `∃x` (underclaim) — both are **off-by-quantifier**
errors (`07`). Flag it as requiring a **generalized quantifier**, and hand the
machinery (the EF-game proof, the conservativity/monotonicity apparatus) off to
`21`, its canonical home. Do not let a proportional claim drive a `∀`-based
validity verdict.

## Reporting band (proposed addition to the `09` schema)

`09`'s verdict line currently enumerates VALID / INVALID / INCONSISTENT /
VALID-BUT-UNSOUND-RISK / GAP / NO-ISSUE-FOUND — none of them fits a claim that
carries a *degree*. **Propose adding** a dedicated band so such content is reported
separately from the binary validity verdict rather than forced into it:

> **Probabilistic / vague — outside binary validity.** This claim carries a
> degree (of belief or of truth), not a T/F. We do not assign it a validity value;
> we note the strength, the missing prior/threshold, and any probability error
> (inverse fallacy, base-rate neglect, conjunction fallacy). Deductive forms (modus
> ponens, chaining) are **not** applied to it.

(Adopting it is a `09`-schema edit; until that lands, emit this under Findings as a
`note` and say the band is proposed.) This mirrors the `99` rule: classical logic
flattens probabilistic/vague content; **flag, don't force**.

## Sources

- Stanford Encyclopedia of Philosophy, *Interpretations of Probability* —
  https://plato.stanford.edu/entries/probability-interpret/
- Stanford Encyclopedia of Philosophy, *Bayes' Theorem* —
  https://plato.stanford.edu/entries/bayes-theorem/
- Stanford Encyclopedia of Philosophy, *Vagueness* (sorites) —
  https://plato.stanford.edu/entries/vagueness/
- Stanford Encyclopedia of Philosophy, *Fuzzy Logic* —
  https://plato.stanford.edu/entries/logic-fuzzy/
- Stanford Encyclopedia of Philosophy, *Generalized Quantifiers* (the `|A∩B| >
  |A\B|` form; EF-game inexpressibility) —
  https://plato.stanford.edu/entries/generalized-quantifiers/
- A. Tversky & D. Kahneman, "Extensional versus intuitive reasoning: the
  conjunction fallacy in probability judgment," *Psychological Review* 90(4), 1983.
- J. Barwise & R. Cooper, "Generalized Quantifiers and Natural Language,"
  *Linguistics and Philosophy* 4(2), 1981.
- L. A. Zadeh, "Fuzzy Sets," *Information and Control* 8(3), 1965.
- A. N. Kolmogorov, *Grundbegriffe der Wahrscheinlichkeitsrechnung*, 1933.
- Wikipedia, *Ehrenfeucht–Fraïssé game* (inexpressibility mechanism; cross-checked
  June 2026) — https://en.wikipedia.org/wiki/Ehrenfeucht%E2%80%93Fra%C3%AFss%C3%A9_game
- Wikipedia, *Prosecutor's fallacy* / *Base rate fallacy* (cross-checked
  June 2026) — https://en.wikipedia.org/wiki/Prosecutor%27s_fallacy
