# 20 — Causal and counterfactual reasoning

Why "`→`" never means "causes", and how an argument can be impeccably *valid* while
committing a fatal *causal* error the truth table cannot see. `07` names the causal
fallacies (post hoc, cum hoc); this file gives the machinery that **explains** them
and the discipline that catches them. Core discipline: treating an observed
association `P(y|x)` as if it told you the effect of *acting*, `P(y|do(x))`, or
what *would have* happened, is a **rung-jump up Pearl's ladder** — flag it.

## Pearl's ladder of causation (the three rungs)

| Rung | Question | Formal object | Activity |
|---|---|---|---|
| **1. Association** | What is, given what I see? | `P(y\|x)` (conditioning) | **seeing** |
| **2. Intervention** | What if I *do* x? | `P(y\|do(x))` (the do-operator) | **doing** |
| **3. Counterfactual** | What if I *had* done x, given what actually happened? | `P(y_x \| x′, y′)` | **imagining** |

The ladder is **strictly hierarchical**: a higher rung cannot, in general, be
derived from data at a lower rung alone. Observing `P(y|x)` does **not** determine
`P(y|do(x))` without extra causal assumptions (a graph or structural model);
Rung 3 needs a **fully specified structural causal model** — the SCM's functional
form, not merely its DAG — because it reasons about two worlds at once, the actual
and the hypothetical. **The rung-jump is the error this file exists to catch.**

## Why `→` is not causation

The material conditional (`02`) is **truth-functional** and has three properties
causation lacks:

1. **Contrapositive-equivalent.** `P → Q ≡ ¬Q → ¬P`. But "smoking causes cancer"
   does not become "no-cancer causes no-smoking." Causation does not flip with the
   contrapositive.
2. **Vacuously true on a false antecedent.** `P → Q` is true whenever `P` is false;
   a causal claim makes no such free assertion about cases that never occur.
3. **No direction, no intervention.** `P → Q` says nothing about what *changes* if
   you set `P`. Causation is **asymmetric** (`X` causes `Y` ⇏ `Y` causes `X`) and
   **supports interventions** (`do(X)` changes the distribution of `Y`).

So a clean derivation using `→` can be perfectly valid while the prose it formalizes
makes a causal claim the logic never tested. The validity verdict is **silent** on
causation — say so explicitly (`99`).

## The causal fallacies, explained (mechanisms behind `07`)

`07` lists *post hoc* and *cum hoc* (correlation→cause). Here is *why* an
association can fail to be a cause:

- **Confounding.** A common cause `Z` drives both `X` and `Y`, inducing
  `P(y|x) ≠ P(y)` with no causal arrow `X → Y`. Ice-cream sales "predict"
  drownings; the confounder is summer heat. The graph `X ← Z → Y` is a **fork**.
- **Reverse causation.** The arrow runs `Y → X`, not `X → Y`. "Hospitals are
  dangerous — sick people who go there die more" inverts cause and effect.
- **Selection bias.** Conditioning on a **collider** `X → C ← Y` (e.g. who got
  admitted, who responded to the survey) creates a spurious `X`–`Y` association in
  the selected sample even with no causal link. ("Berkson's paradox.")
- **Simpson's paradox.** An association can **reverse** when an aggregate is split
  by a confounder. Charig et al. (1986), kidney stones: open surgery (A) beats the
  less-invasive PCNL (B) on **small** stones (93.1% vs 86.7%) **and** on **large**
  stones (73.0% vs 68.8%), yet B wins the **pooled** number (82.6% vs 78.0%) —
  because surgeons assigned the hard (large-stone) cases to A. The correct causal
  answer requires adjusting for stone size; the aggregate is the trap.

Each is invisible to the truth table: the *form* is fine, the *causal warrant* is
missing. These are detected by reading the claim's causal structure, not by `04`.

## Counterfactual / subjunctive conditionals

Natural language has two conditionals that the single symbol `→` cannot both serve:

- **Indicative**: "If Oswald didn't shoot Kennedy, someone else did." (Roughly
  truth-functional / evidential — defensible as `→`, and **true**.)
- **Subjunctive / counterfactual**: "If Oswald *hadn't* shot Kennedy, someone else
  *would have*." This is **false** on most readings, though the indicative is true —
  same antecedent and consequent, opposite verdict (Adams' classic pair). So `→`
  cannot be the counterfactual.

Counterfactuals need richer semantics: **possible-worlds** similarity (Lewis /
Stalnaker — `A □→ C` is true iff in the closest `A`-worlds, `C` holds) or, in
Pearl's program, **structural equations** with the do-operator (delete the equation
for `X`, set its value, propagate). A spec or argument that turns on "would have"
or "had we …" must be flagged as **counterfactual** and not rendered with `→`.

## Causal DAGs and d-separation (sketch)

A **causal DAG** is a directed acyclic graph whose arrows are direct causal
influences. **d-separation** reads conditional independence off the graph: a path
is **blocked** (the variables are independent) when —

- it has a **chain** `X → M → Y` or **fork** `X ← M → Y` and the middle `M` **is**
  in the conditioning set; or
- it has a **collider** `X → M ← Y` and **neither** `M` nor any descendant of `M`
  is conditioned on.

The sharp, counterintuitive rule: **conditioning on a collider UNBLOCKS the path**
(introduces a spurious dependence) — the formal heart of selection bias above.
`X` and `Y` are **d-separated** by `Z` iff every path between them is blocked; then
they are conditionally independent given `Z`. This is the tool for deciding **what
to adjust for** to license a Rung-1→Rung-2 climb (the back-door criterion). The
evaluator does not need to run it, but should recognize when a causal claim assumes
an adjustment set it never justified.

## Three distinct claim kinds — keep them separate

| Claim kind | Object | What it licenses |
|---|---|---|
| **Correlation** | `Corr(X,Y) ≠ 0` / `P(x,y)` | prediction in the *same* regime; **no** action |
| **Conditional** | `P(y\|x)` | belief update on *observing* `x`; still **no** action |
| **Causation** | `P(y\|do(x))` / structural model | what happens if we *act*; counterfactuals |

Sliding from the left columns to the right is the rung-jump. "Users who saw the
banner converted more, **so** the banner causes conversions" reads `P(convert|saw)`
as `P(convert|do(saw))` — a Rung-1→Rung-2 leap that ignores self-selection.

## Reporting band — *proposed extension to `09`*

`09`'s verdict schema currently enumerates `VALID / INVALID / INCONSISTENT /
VALID-BUT-UNSOUND-RISK / GAP / NO-ISSUE-FOUND` — it has **no** causal band yet.
This file **proposes adding** a **Causal** band; until `09` is updated to list it,
report it as an out-of-band caveat under *Premise-truth notes* / *Bottom line*:

> **Causal — outside what validity certifies.** We checked logical form; we did
> **not** verify causation. The argument moves from observed `P(y|x)` to an
> intervention `P(y|do(x))` / counterfactual without a stated causal model — a
> rung-jump on Pearl's ladder. Possible confounding / reverse causation / selection
> bias / Simpson reversal noted. `→` is not causation; the validity verdict is
> silent here.

Consistent with `99`: causal content is something classical logic flattens —
**flag, don't force**. (Sibling files `16`–`19` likewise propose bands not yet in
`09`; treat them all as pending additions, not as already-enumerated verdicts.)

## Sources

- J. Pearl & D. Mackenzie, *The Book of Why* (Basic Books, 2018) — the ladder of
  causation (seeing / doing / imagining).
- J. Pearl, *Causality: Models, Reasoning, and Inference*, 2nd ed. (Cambridge,
  2009) — do-operator, structural causal models, d-separation, back-door criterion.
- Stanford Encyclopedia of Philosophy, *Causal Models* —
  https://plato.stanford.edu/entries/causal-models/
- Stanford Encyclopedia of Philosophy, *The Logic of Conditionals* (indicative vs
  subjunctive) — https://plato.stanford.edu/entries/logic-conditionals/
- Stanford Encyclopedia of Philosophy, *Counterfactual Theories of Causation* —
  https://plato.stanford.edu/entries/causation-counterfactual/
- D. Lewis, *Counterfactuals* (Harvard, 1973) — possible-worlds semantics.
- C. R. Charig et al., "Comparison of treatment of renal calculi by open surgery,
  percutaneous nephrolithotomy, and extracorporeal shockwave lithotripsy," *BMJ*
  292 (1986): 879–882 — the kidney-stone Simpson's-paradox data.
- Wikipedia, *Simpson's paradox* / *d-separation* (cross-checked June 2026) —
  https://en.wikipedia.org/wiki/Simpson%27s_paradox
