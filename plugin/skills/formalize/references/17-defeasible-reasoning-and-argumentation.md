# 17 — Defeasible reasoning and argumentation

Classical entailment is **monotonic**: if `Γ ⊨ φ` then `Γ ∪ {ψ} ⊨ φ` — adding premises never retracts a conclusion. Most everyday and engineering reasoning is **non-monotonic**: "the request is from an admin, so allow it" is overturned by "…but the admin token is revoked." The conclusion was *defeasibly* warranted and then *defeated*. The discipline here: a defeated conclusion is **not** a formal fallacy. Reporting it INVALID (`04`/`07`) is wrong; the correct move is to **name the defeater** and frame the verdict as defeasible. Pairs with `16` (non-deductive strength) and `15` (closed-world reasoning in code).

## Non-monotonicity and default reasoning

A **default** is a rule that holds *normally*, absent information to the contrary. **Reiter (1980)** formalised these as default rules of the shape

```
   α : β₁, …, βₙ
   ─────────────       "if α holds and each βᵢ is consistent with E
        γ                (each ¬βᵢ ∉ E), conclude γ"
```

α = prerequisite, βᵢ = justifications (consistency conditions), γ = consequent. The consistency test is **not** "¬βᵢ is not derivable" — it is a **fixed-point** condition: each justification must be consistent with the **extension `E`** the rule helps generate (equivalently, no `¬βᵢ` lies *in* `E`). A **default theory** is `(Γ, Δ)` — facts `Γ` plus defaults `Δ`. Its **extensions** are the fixed-point sets of "reasonable" conclusions: maximal sets you can build by applying defaults whose justifications stay consistent with what you've concluded. A theory can have **zero, one, or several** extensions (e.g. the symmetric "Nixon diamond": Quaker→pacifist, Republican→¬pacifist yields two). The 1980 *Artificial Intelligence* special issue is regarded as non-monotonic reasoning's "coming of age."

**Link to `15`:** this is the logic behind **negation-as-failure** and the **closed-world assumption** in Prolog / stratified Datalog — "not provable" is treated as "false," a default that a later fact can defeat. A spec that mixes closed-world defaults with open-world (OWL/DL) entailment is the high-value mismatch flagged in `15`.

## Defeaters: rebutting vs undercutting (the naming discipline)

**Pollock** distinguished two ways a defeasible inference `premise ⇒ conclusion` can be defeated. Getting the *type* right is the deliverable:

| Defeater | Attacks | Form | Effect |
|----------|---------|------|--------|
| **Rebutting** | the **conclusion** | a reason for `¬conclusion` | gives independent ground to believe the opposite |
| **Undercutting** | the **inference link** | a reason the premise→conclusion connection fails *here* | removes support without asserting `¬conclusion` |

Pollock's example: "the object looks red, so it is red" is undercut by "it is illuminated by red light" — that does **not** say the object isn't red (red things look red in red light too); it severs the *looks→is* warrant for this case. A **rebutter** would instead be "a reliable witness says the object is blue."

> Report rule: when a new premise overturns a conclusion, write **"defeated — *undercutting* defeater: the warrant W fails because …"** or **"defeated — *rebutting* defeater: counter-reason R for ¬C."** Do **not** write INVALID. The original inference was a legitimate defeasible step (`16`); defeat is its designed behaviour, not a fallacy.

## The Toulmin model

Toulmin (1958) decomposes a practical argument into six roles — useful for *locating* where a defeasible argument can be attacked:

| Component | Role | Logic gloss |
|-----------|------|-------------|
| **Claim** | the conclusion asserted | `C` |
| **Data / Grounds** | the evidence offered | `D` |
| **Warrant** | the inference licence `D ⇒ C` | the (often implicit) bridging rule (`06` supplied premise) |
| **Backing** | support for the *warrant* itself | why the rule holds |
| **Qualifier** | strength hedge ("presumably," "usually") | the defeasibility marker — signals **non-deductive** (`16`) |
| **Rebuttal** | stated exception / defeating condition | the built-in defeater |

First three are essential; backing/qualifier/rebuttal are supplementary but diagnostic. A **qualifier** is the textual tell that the author is reasoning defeasibly, not deductively — its presence should *prevent* a VALID/INVALID verdict and trigger the bands below. An **unbacked warrant** is the Toulmin name for the enthymeme gap of `06`.

> **Two senses of "rebut" — do not conflate.** Toulmin's **rebuttal** (an exception/defeating condition on the warrant) is *not* identical to Pollock's **rebutting defeater** (a reason for `¬C`). A Toulmin rebuttal *subsumes* both Pollock types: it can act as a Pollock rebutter *or* as an undercutter. When reporting, classify by Pollock's two-way distinction above; reserve "Toulmin rebuttal" for the structural slot.

## Dung abstract argumentation frameworks

When multiple arguments attack each other, **Dung (1995)** abstracts away their content: an **argumentation framework** is a pair `(A, R)` with `A` a set of arguments and `R ⊆ A × A` the **attack** relation. Acceptability is computed structurally.

- A set `S ⊆ A` is **conflict-free** if no member attacks another.
- `S` **defends** `a` if `S` attacks every attacker of `a`.
- `S` is **admissible** if conflict-free **and** it defends all its members.

| Extension | Definition | Existence / uniqueness |
|-----------|-----------|------------------------|
| **Complete** | admissible + contains every argument it defends | ≥ 1 |
| **Grounded** | the *minimal* (⊆-least) complete extension | **unique, always exists** (the skeptical core) |
| **Preferred** | a *maximal* admissible set | ≥ 1; may be several |
| **Stable** | conflict-free + attacks every argument outside it | **0, 1, or many** (may not exist) |

Reading guide for a verdict: the **grounded** extension is what's *skeptically* justified (accept only what every viewpoint must); **preferred/stable** extensions are *credulous* positions. If a claim sits in no extension, it is collectively defeated; if it is in the grounded extension, it survives all attacks.

## Walton argumentation schemes + critical questions

**Walton** catalogues recurring *presumptive* (defeasible) patterns — argument from expert opinion, from sign, from cause to effect, from analogy, from precedent, etc. Each scheme ships with **critical questions** that enumerate exactly how it can be defeated. Example — *argument from expert opinion*: "E is an expert in domain D; E asserts A (in D); so A." Critical questions: Is E genuinely an expert? In *this* domain? Is E biased? Do other experts disagree? Is A consistent with the evidence? Each unanswered critical question is a candidate **undercutting** defeater. Schemes give the evaluator a checklist for *where to push* before granting or defeating the presumption.

## Verdict bands (proposed additions to `09`)

The `09` schema currently enumerates only VALID / INVALID / INCONSISTENT / VALID-BUT-UNSOUND-RISK / GAP / NO-ISSUE-FOUND — none of the bands below exist there yet. **Propose adding these** when defeasible material is in scope; until `09` is updated, name them explicitly in the report rather than implying the schema already lists them. They distinguish three outcomes a naive validity check would mash into "INVALID":

| Band | Meaning | Cross-link |
|------|---------|------------|
| **WARRANTED-BUT-DEFEASIBLE** | the warrant licenses the claim *given current information*; no defeater is present, but the inference is non-monotonic and could be overturned | `16` |
| **DEFEATED (by available counter-argument)** | a defeater *is present in the material*; name it **rebutting** or **undercutting** and quote it | Pollock; Walton CQs |
| **FORMALLY INVALID** | the argument *claims deductive necessity* and a counter-model exists | `04`/`07` |

Note the band is **WARRANTED**, not VALID. "Valid" is reserved across the reference set (`02`/`05`/`16`/`99`) strictly for truth-preserving deductive entailment `Γ ⊨ φ`; a defeasible, ampliative warrant is precisely *not* valid in that sense — a counter-model always exists (`16`'s thesis: a strong inductive step is not valid). Calling it "valid" would commit the very category error this skill guards against. Only the third band gets a counter-model and the `07` fallacy machinery. The first two are non-deductive (`16`), graded by strength and by which defeaters are live. Saying "DEFEATED by an undercutting defeater" is informative and fair; saying "INVALID" misrepresents sound defeasible reasoning as broken logic (`99`).

## Core discipline

> A defeasible conclusion overturned by a newly available premise is **not** a formal fallacy. Name the defeater — **rebutting** (attacks the conclusion) or **undercutting** (attacks the inference link) — and report **DEFEATED** or **WARRANTED-BUT-DEFEASIBLE**, never **FORMALLY INVALID**. Reserve invalidity + counter-models (`07`) for arguments that actually assert deductive necessity, and reserve the word "valid" for truth-preserving entailment (`05`).

## Sources

- *Defeasible Reasoning*, Stanford Encyclopedia of Philosophy (rebutting vs undercutting; Pollock) — https://plato.stanford.edu/entries/reasoning-defeasible/ (accessed Jun 2026).
- *Non-monotonic Logic*, SEP — https://plato.stanford.edu/entries/logic-nonmonotonic/ (extension as fixed-point; consistency checked wrt `E`).
- P. M. Dung, "On the acceptability of arguments and its fundamental role in nonmonotonic reasoning, logic programming and n-person games," *Artificial Intelligence* 77 (1995): 321–357.
- R. Reiter, "A Logic for Default Reasoning," *Artificial Intelligence* 13 (1980): 81–132.
- S. Toulmin, *The Uses of Argument* (Cambridge UP, 1958).
- D. Walton, C. Reed, F. Macagno, *Argumentation Schemes* (Cambridge UP, 2008); D. Walton, *Argumentation Schemes for Presumptive Reasoning* (1996).
- J. L. Pollock, "Defeasible Reasoning," *Cognitive Science* 11 (1987): 481–518.
