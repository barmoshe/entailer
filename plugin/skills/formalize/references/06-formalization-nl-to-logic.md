# 06 — Formalization: natural language → logic

The actual translation step — the hardest and most error-prone part, and the one
that decides whether the whole verdict is trustworthy. Grounded in the standard
logic-translation literature and recent autoformalization work (the **NL2FOL**
pipeline: extract claim → recover implicit premises → translate to FOL → check
satisfiability/validity with a solver — arXiv:2405.02318).

> **Prime directive: show the dictionary.** Every formalization ships with a
> **symbol dictionary** mapping each atom/predicate/constant to its exact English
> gloss, so a human can audit the translation. An unaudited formalization is where
> confident-but-wrong verdicts come from (`99`).

## The procedure

1. **Identify the conclusion.** What is the text trying to get you to accept?
   Look for indicator words: *therefore, thus, hence, so, it follows that,
   consequently, which proves that*.
2. **Identify the premises.** The stated support. Indicators: *because, since, for,
   given that, as, follows from*. Drop rhetoric, examples, hedges, and restatements.
3. **Recover the enthymemes** (hidden premises). Most real arguments omit a premise
   that feels "obvious." Surface it and **mark it `[supplied]`**. Use the principle
   of charity: supply the *weakest* premise that makes the argument valid, then ask
   whether *that* premise is actually defensible. (If the only premise that rescues
   the argument is obviously false, that's the finding.)
4. **Choose the logic.** Propositional (`02`) if validity rides only on connectives;
   first-order (`03`) the moment "all/some/no", relations, counting, or identity do
   work. Use the **weakest** logic that captures the structure.
5. **Build the symbol dictionary.** One line per non-logical symbol. Keep atoms
   *atomic* — don't hide an `if/and/not` inside a single propositional letter, or
   you'll mask the very structure you're checking.
6. **Translate** each premise and the conclusion to a sentence (no free variables,
   `03`). Preserve connective and quantifier structure faithfully.
7. **Flag ambiguity** rather than resolving it silently (see below).
8. Hand off to `04`/`08` for the validity / consistency check.

## English → connective mapping (propositional traps)

| English | Formalization | Trap |
|---------|---------------|------|
| "A but B", "A although B", "A; moreover B" | `A ∧ B` | "but/although" is still just `∧` (the contrast is rhetorical) |
| "A unless B" | `¬B → A` (≡ `A ∨ B`) | not a biconditional |
| "A only if B" | `A → B` | **not** `B → A` — "only if" points to the *necessary* condition |
| "A if B" | `B → A` | antecedent is `B` |
| "A if and only if B" | `A ↔ B` | the only iff |
| "Not both A and B" | `¬(A ∧ B)` | ≠ `¬A ∧ ¬B` (De Morgan) |
| "Neither A nor B" | `¬A ∧ ¬B` | ≠ `¬(A ∧ B)` |
| "A or B" (menu, exclusive) | `(A ∨ B) ∧ ¬(A ∧ B)` | default `∨` is **inclusive**; only make it exclusive when the text demands |
| "If A, B" with causal force | `A → B` | the conditional captures the *logical* relation only — **not** causation (see `07`) |

**Necessary vs. sufficient** is the highest-yield distinction to get right:
"A is sufficient for B" = `A → B`; "A is necessary for B" = `B → A`;
"necessary and sufficient" = `A ↔ B`. Most real-world conditional errors are a
swapped necessary/sufficient.

## Quantifier translation (first-order traps)

- **Universal pairs with `→`, existential with `∧`** — the cardinal rule (`03`).
  "All ravens are black" = `∀x(R(x) → B(x))`, **not** `∀x(R(x) ∧ B(x))`.
- **Implicit quantifiers.** Bare plurals and generics hide the quantifier:
  *"Donkeys have ears"* could be **universal** (`∀x(D(x)→E(x))`) or **generic**
  (typically, with exceptions). *"Students may submit late work"* — all? some? under
  conditions? Surface the reading; if the text doesn't fix it, **flag it**.
- **Quantifier scope / order.** "Everyone loves someone" `∀x∃y L(x,y)` vs.
  "someone is loved by everyone" `∃y∀x L(x,y)` — different claims. Scope ambiguities
  ("every student read a book" — same book or each their own?) must be flagged and
  both readings shown.
- **Donkey sentences.** *"Every farmer who owns a donkey beats it."* The pronoun
  "it" needs to be bound, but the existential from "a donkey" sits in the antecedent
  and can't reach it; the faithful reading is universal:
  `∀x∀y((F(x) ∧ D(y) ∧ Owns(x,y)) → Beats(x,y))`. A known hard case (Geach) — handle
  by widening the universal rather than forcing an existential.
- **"Any" is treacherous.** "Anyone can solve it" is usually universal `∀`; "if
  anyone objects, tell me" is existential in the antecedent `∃`/`∀` depending on
  scope. Read the embedding.

## Handling ambiguity (the rule that keeps you honest)

When a sentence has more than one defensible reading:
1. **State that it is ambiguous** and why.
2. **Show each reading's formalization** in the dictionary/translation.
3. If the readings **agree** on the verdict, note that the ambiguity is harmless
   here and proceed. If they **diverge**, report the verdict *per reading* and flag
   that the argument's validity depends on a reading the text doesn't fix.

Never silently pick one reading — a silent choice is an undisclosed assumption that
can flip the verdict.

## Common formalization failure modes (catch these in self-review)

- **Atom too coarse** — hiding logical structure inside one propositional letter
  (e.g. letting `P` = "if it rains the game is cancelled" instead of `R → C`).
- **Universal with `∧` / existential with `→`** — the cardinal quantifier error.
- **Converse error in translation** — "only if" / necessary-sufficient swapped.
- **Dropped or mis-scoped negation** — "not all" vs. "all not".
- **Equivocation preserved as identity** — the same English word used in two senses
  mapped to one predicate (mark distinct senses as distinct predicates; `07`).
- **Lost domain restriction** — quantifying over "everything" when the text means
  "every student".
- **Over-formalization** — turning rhetorical or illustrative sentences into
  premises. Only formalize what does argumentative work.
- **Modal/temporal/deontic content flattened** — "must", "ought", "always",
  "eventually" are *not* plain truth-functional connectives (see below).

## When plain FOL isn't the right target

Don't silently force these into FOL — **route** them to the reference that handles
the content (each is real apparatus now, not a dead-end flag):
- **Modal** — necessity/possibility ("must", "could", "necessarily"): modal logic
  □/◇ → `18`.
- **Deontic** — obligation/permission ("shall", "may", "is required to"): common in
  specs/contracts; O/P/F operators and the contrary-to-duty traps → `18`.
- **Temporal** — "always/eventually/until/before": LTL/CTL → `18` (and TLA+ in `08`).
- **Probabilistic / vague** — "likely", "most", "tall": graded, not classical; Bayes,
  base-rate/conjunction errors, the sorites → `19`.
- **Causal** — "A causes / leads to B", "because": the material conditional is **not**
  causation (Pearl's ladder, correlation ≠ causation) → `20`.

And first decide the argument is even **deductive**: if it is inductive, abductive, or
defeasible (most real prose), it isn't a candidate for a binary validity verdict at
all — classify and grade it via `16`/`17`, never report it INVALID.

For all of these, either route to the right logic, note the limitation, or formalize a
defensible classical approximation **and say you did**.

## Worked micro-example

> "If the build is green, we ship. The build is green. So we ship — and since we
> only ship on Fridays, it must be Friday."

- Dictionary: `G` = the build is green; `S` = we ship; `F` = it is Friday.
- Premises: `G → S`, `G`, and (only-if) `S → F`.
- Conclusion 1: `S`. Derivation: modus ponens on `G → S, G`. **Valid.**
- Conclusion 2: `F`. From `S` and `S → F`, modus ponens ⇒ `F`. **Valid** — *given
  the premise* "we only ship on Fridays" (`S → F`). Note "only ship on Fridays" is
  correctly `S → F`, not `F → S`; the converse error would have made it invalid.
- Soundness caveat: validity established; whether `S → F` is *true* (do we really
  ship only on Fridays?) is a premise-truth question the logic can't settle (`05`).
