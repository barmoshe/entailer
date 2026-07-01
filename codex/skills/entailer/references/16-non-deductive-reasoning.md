# 16 — Beyond deduction: inductive, abductive, and inference to the best explanation

Most real arguments — in specs, RFCs, postmortems, design rationales — do **not** aim to be deductively valid. They are *ampliative*: the conclusion says more than the premises guarantee. Applying the validity check (`04`) to them and reporting **INVALID** is a category error that destroys the report's credibility. This file fixes the yardstick: which arguments are graded by *validity* and which by *strength*, and how to report the latter.

## The three inference modes

| Mode | Relation premises→conclusion | Truth-preserving? | Ampliative? | Yardstick |
|------|------------------------------|-------------------|-------------|-----------|
| **Deductive** | conclusion *contained in* premises | yes (`⊨` necessitation) | no | **validity** (`02`–`05`) |
| **Inductive** | premises make conclusion *probable* | no | yes | **strength** (then cogency) |
| **Abductive (IBE)** | conclusion *best explains* premises | no | yes | **explanatory quality** |

- **Deductive**: if the premises are true the conclusion *cannot* be false. Adds no content; that is exactly what makes it certifiable by symbol manipulation (`01`).
- **Inductive**: an ampliative leap from observed cases to a broader/future/unobserved claim. A *strong* inductive argument makes the conclusion likely; a *cogent* one is strong **and** has true premises (the inductive analogue of soundness).
- **Abductive / inference to the best explanation (IBE)**: from a surprising observation to the hypothesis that, if true, would best explain it. **Peirce** (CP 5.189) gave the schema: "The surprising fact, C, is observed; but if A were true, C would be a matter of course; hence there is reason to suspect that A is true." Note A *explains* C — it need not be C's **cause** (the explanation/causation separation is `20`'s discipline; do not pre-empt it). **Harman (1965)** coined "inference to the best explanation"; *some authors* distinguish abduction (*generate* the hypothesis) from IBE (*rank* the candidates), but the split is contested — Peirce's own inference stage already carries a justificatory step — so do not state it as settled consensus. For evaluation both share the same non-deductive licence.

## Validity is the wrong yardstick — the category error

Validity is **binary and form-bound** (`02`). Strength is **graded and content-bound**. Stamping a verdict from one onto the other is the central mistake this file guards against:

- A strong inductive generalisation is **not "valid"** — there is always a logically possible counter-model where the premises hold and the conclusion fails. That counter-model does **not** refute it; ampliative inference *expects* exceptions.
- Conversely, reporting such an argument **INVALID** (because a counter-model exists) is true-but-useless and *misleading*: it implies the reasoning is defective when it is doing exactly what good non-deductive reasoning does. **Invalid ≠ bad** here; the validity predicate simply does not apply.

> **Rule (and a false-positive guard):** before running the validity check (`09` step 6), decide whether the author is making a **deductive** or an **ampliative** claim. Do **not** classify on the bare connective: "therefore"/"so" alone signals *nothing* — a perfectly **VALID** deductive argument reads "All A are B; x is A; therefore x is B" with no modal marker at all. Classify as **non-deductive** ONLY when (a) the author *hedges* — "probably," "likely," "best explains," "in most cases," "suggests" — OR (b) the inference is *patently content-adding* (observed cases → unobserved, observation → explanatory hypothesis). When in doubt, **run the validity check AND note the ampliative reading** — never suppress a VALID verdict on the suspicion that something might be ampliative. Mislabelling a sound deductive argument "non-deductive" is itself a false positive (`99`).

## Abduction *licitly* affirms the consequent — the discipline pivot

The formal fallacy **affirming the consequent** is `P→Q, Q ⊢ P` — invalid, with counter-model `P`=F, `Q`=T (`07`). Abduction has the **same surface shape**:

```
If hypothesis H were true, observation O would follow.   (H → O)
We observe O.                                            (O)
∴ H is (probably) the case — it best explains O.         (abduce H)
```

This is **not** the fallacy. The difference is the *claimed relation*:

| | Affirming the consequent (`07`) | Abduction / IBE (`16`) |
|---|---|---|
| Claim | `H` follows **deductively** | `H` is the **best available explanation** |
| Verdict | **INVALID** + counter-model | **assess explanatory quality** |
| Defeated by | the existing counter-model | a *better* rival explanation |

What makes the abductive version *licit* is precisely that it does **not** assert deductive necessity. It is defeasible (`17`): a competing hypothesis `H′` that also entails `O` is a live alternative, and abduction's job is to argue `H` beats `H′` (simplicity, scope, prior plausibility, lack of ad-hocness). The sprinkler-vs-rain case (`07`) is a *fallacy* only if presented as proof; framed as "wet ground is best explained by rain," it is a (weak, here) abduction to be assessed, not a counter-modelled invalidity.

**So: when the argument's form is `P→Q, Q ∴ P` but the author signals explanation/likelihood, classify it as abductive and grade it — do not fire the `07` flag.** Mis-firing here is a false positive of the worst kind (`99`).

> **Cross-link gap (07↔16):** `07`'s formal-fallacy table lists affirming the consequent *unconditionally* with a counter-model. An evaluator reading `07` alone could mis-fire on the abductive surface form. The link is currently one-directional (16→07); `07` should carry a forward-pointer — "when the same surface form is presented as explanation/likelihood, see `16` — grade, do not flag." Flagged here as a pending `07` edit.

## Kinds of induction

- **Enumerative** — "all observed F are G, so all F are G" (or: the next F is G). Strength scales with number and variety of instances.
- **Statistical** — "x% of sampled F are G, so ~x% of all F are G" (or a single F is G with probability ~x). A quantitative enumerative induction.
- **Analogical** — "a resembles b in respects R₁…Rₙ; b has property Q; so a has Q." Strength scales with the number and *relevance* of shared respects and the absence of relevant disanalogies.

## Quality criteria (how to grade strength)

| Criterion | Failure mode | Cross-link |
|-----------|--------------|------------|
| **Sample size & representativeness** | small/biased sample → over-strong universal | **hasty generalisation** (`07`) |
| **Reference-class problem** | the individual belongs to many classes with different base rates | use the *narrowest* class for which **reliable** statistics exist (Reichenbach) |
| **Total-evidence requirement** | conditioning on a cherry-picked subset of what's known | Carnap: use *all* available relevant evidence |
| **Rival explanations (IBE)** | the "best" explanation was never compared to alternatives | name the rivals; argue why this one wins |
| **Ad-hocness / over-fitting (IBE)** | hypothesis tailored only to save the observation | penalise unearned auxiliary assumptions |
| **Analogy relevance** | shared respects are causally irrelevant to Q | weak/false analogy |

The **reference-class** and **total-evidence** points are the high-value ones in specs and incident analyses: a probability or rate claim is only as good as the class it is computed over and the evidence it conditions on. A statistic quoted over the wrong (or conveniently chosen) reference class is a real, citable defect.

## How to report a non-deductive argument

There is **no NON-DEDUCTIVE band in `09` yet** (its schema enumerates VALID / INVALID / INCONSISTENT / VALID-BUT-UNSOUND-RISK / GAP / NO-ISSUE-FOUND). So **propose adding** the band below to `09`'s schema rather than treating it as already present (a consistency gap shared with `17`–`20`). **Never** emit INVALID for an argument the author intends as ampliative.

> **Verdict: NON-DEDUCTIVE — assess by strength, not validity.**
> This argument is *ampliative* (inductive / abductive); it does not claim deductive necessity, so a counter-model is not a refutation. We grade its strength/cogency and explanatory quality instead.

Reporting checklist:
1. **Name the mode** (enumerative/statistical/analogical induction, or abduction/IBE) and quote the cue phrase ("probably," "best explains," "in most cases").
2. **Grade strength**, not validity: state what would make the conclusion more/less probable; for IBE, list the **rival explanations** and why this one wins or doesn't.
3. **Apply the quality criteria** above; flag sample/reference-class/total-evidence defects with the specific span.
4. **Separate strength from truth of premises** (the cogency split), exactly as validity is separated from soundness (`05`, `99`).
5. If the author *does* assert deductive necessity over an ampliative step, *that* over-claim is the finding (an enthymeme demanding an indefensible universal premise, `06`/`07`) — report the over-claim, not a bare INVALID.

Severity (`09`): an unsupported ampliative leap presented as proof is **major**; a merely *weak* but honestly-hedged induction is **minor**; a reference-class/total-evidence problem is **minor–major** depending on whether the headline claim rides on it.

## Core discipline

> An abductive inference to the best explanation that "affirms the consequent" is **not** the fallacy — it is the correct, defeasible form of explanatory reasoning. Classify it as non-deductive and grade its strength; reserve the `07` INVALID verdict for arguments that genuinely claim deductive necessity. Defeasibility — how a new premise overturns such a conclusion *without* it ever having been a fallacy — is the subject of `17` (whose band is **WARRANTED-BUT-DEFEASIBLE**, never "valid," so the word *valid* stays monosemous across `02`/`05`/`16`/`99`).

## Sources

- *Abduction*, Stanford Encyclopedia of Philosophy — https://plato.stanford.edu/entries/abduction/ (accessed Jun 2026); *Peirce on Abduction* (CP 5.189 schema) — https://plato.stanford.edu/entries/abduction/peirce.html. The generation-vs-evaluation split is contested; cf. Mackonis / "Peirce Knew Why Abduction Isn't IBE," *Argumentation* (2018), https://doi.org/10.1007/s10503-017-9443-9.
- *The Problem of Induction*, SEP — https://plato.stanford.edu/entries/induction-problem/.
- *Rudolf Carnap → C. Inductive Logic* (requirement of total evidence), SEP — https://plato.stanford.edu/entries/carnap/.
- C. S. Peirce, *Collected Papers* 5.189 (abduction schema — explanatory, not specifically causal); G. Harman, "The Inference to the Best Explanation," *Philosophical Review* 74 (1965): 88–95.
- H. Reichenbach, *The Theory of Probability* (Univ. of California Press, 1949) — English translation by E. H. Hutten and Maria Reichenbach of *Wahrscheinlichkeitslehre* (Leiden, 1935); reference-class / narrowest-reliable-class principle.
- P. Lipton, *Inference to the Best Explanation*, 2nd ed. (Routledge, 2004).
