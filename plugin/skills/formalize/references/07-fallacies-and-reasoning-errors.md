# 07 — Fallacy & reasoning-error catalog

The checklist run in step 5 of the rubric. Split into **formal** fallacies
(invalid by *form* — caught by the validity check, with a counter-model) and
**informal** fallacies (the form may be fine; the defect is in content, relevance,
or language — caught by reading, not by the truth table). For each: its logical
signature and a detection cue.

## Formal fallacies (a counter-model exists)

| Fallacy | Bad form | Counter-model / cue |
|---------|----------|---------------------|
| **Affirming the consequent** | `P→Q, Q ⊢ P` | `P`=F, `Q`=T. "It rained ⇒ ground wet; ground is wet, so it rained." Sprinkler. |
| **Denying the antecedent** | `P→Q, ¬P ⊢ ¬Q` | `P`=F, `Q`=T. "No rain, so the ground's dry." |
| **Affirming a disjunct** | `P∨Q, P ⊢ ¬Q` | inclusive `∨`: both can hold. |
| **Illicit conversion** | treating `P→Q` as `Q→P` | the converse is not equivalent (`02`). |
| **Illicit contraposition** | `P→Q` as `¬P→¬Q` (inverse) | inverse ≠ original. |
| **Undistributed middle** | `All A are M; all C are M ⊢ all C are A` | `∀x(A→M), ∀x(C→M) ⊭ ∀x(C→A)`; middle term M never distributed. |
| **Illicit major/minor** | term distributed in conclusion but not premise | check term distribution in syllogisms. |
| **Existential fallacy** | deriving `∃` (a "some"/exists claim) from two `∀` premises | empty-domain counter-model: `∀x(A→B)` doesn't give `∃x A`. |
| **Quantifier-shift fallacy** | `∀x∃y R(x,y) ⊢ ∃y∀x R(x,y)` | "everyone has a mother" ⊬ "someone is everyone's mother". Scope (`03`). |
| **Modal scope fallacy** | `□(P→Q), P ⊢ □Q` | confusing necessity of the consequent with necessity of the conditional. Modal apparatus → `18`. |

When you flag a formal fallacy, **produce the counter-model** — it's the proof, and
it's what makes the finding undeniable.

> **Don't over-call affirming the consequent.** The same surface form `P→Q, Q ∴ P`
> is the *correct* shape of an **abductive inference to the best explanation** when the
> author signals explanation/likelihood ("best explained by", "suggests", "probably").
> That is not the fallacy — grade it by explanatory quality, don't fire this flag. See
> `16`. Likewise, **post hoc / cum hoc** (below) are the prose cues for a missing
> causal warrant — the causal apparatus is in `20`.

## Informal fallacies (form OK, content/relevance/language broken)

### Relevance (premises don't bear on the conclusion)
- **Ad hominem** — attack the arguer, not the argument.
- **Straw man** — refute a distorted, weaker version of the claim.
- **Appeal to authority** (irrelevant/false authority) — *vs.* legitimate expert
  testimony; the fallacy is misplaced or unqualified authority.
- **Appeal to popularity (ad populum)** / **appeal to tradition / novelty**.
- **Appeal to emotion / force / consequences** — pressure in place of support.
- **Genetic fallacy** — judging a claim by its origin.
- **Red herring** — irrelevant diversion.
- **Tu quoque** — "you do it too" deflection.

### Presumption (a premise is smuggled in or unwarranted)
- **Begging the question (petitio principii)** — the conclusion hides in a premise;
  circular. *Formal cue:* after formalizing, a premise is logically equivalent to
  (or trivially entails) the conclusion — the argument is **valid but vacuous**.
  Worth a distinct flag: "valid but circular."
- **Complex/loaded question** — presupposes an unestablished claim.
- **False dilemma / false dichotomy** — presents `P ∨ Q` as exhaustive when a third
  option exists; *cue:* an `∨` premise that isn't actually exhaustive.
- **Hasty generalization** — universal `∀` leap from a small/biased sample.
- **Sweeping generalization (accident)** — applying a general rule to an exception.
- **Slippery slope** — unsupported chain `P→Q→R→…→disaster` with weak links.
- **Post hoc ergo propter hoc** — "after, therefore because"; correlation→cause.
- **Cum hoc** — correlation→cause without the temporal claim.
- **Composition** — parts have property ⇒ whole does. **Division** — whole ⇒ parts.

### Ambiguity (language slips)
- **Equivocation** — a key term shifts meaning between premises. *Formal cue:* the
  same English word would need **two different predicates** to be faithful (`06`);
  if you're tempted to map one word to two senses, that's equivocation.
- **Amphiboly** — grammatical ambiguity changes the claim.
- **Accent / emphasis** — meaning shifts with stress.
- **Reification** — treating an abstraction as a concrete object.

## Spec / requirements-specific errors (high value for repos)

These are what the skill most often finds in real engineering docs:
- **Mutually unsatisfiable requirements** — the conjunction of constraints has no
  model. *Find the minimal conflicting subset* (compactness, `05`).
- **Vacuous requirement** — a conditional whose antecedent is never satisfiable
  (always-true, does nothing): `P → Q` where `P` is unreachable.
- **Underspecification / gap** — the stated premises don't entail the claimed
  outcome (an enthymeme that can't be charitably filled). Report as a *gap*, not a
  falsehood (`05`).
- **Necessary/sufficient confusion** — "if" where "only if" was meant (`06`); flips
  access-control and validation logic.
- **Off-by-quantifier** — "a user" (∃) where "every user" (∀) was meant, or vice
  versa; classic in authz/validation specs.
- **Implicit-universal overreach** — a rule stated for the common case applied as if
  exceptionless.
- **Contradiction across documents** — README claims X, the spec implies ¬X.

## How to use this list

1. After formalizing, run the **formal** column first — the validity/consistency
   check (`04`) catches these mechanically; attach the counter-model.
2. Then scan the **informal** list by reading — these survive a clean truth table,
   so the validity verdict alone won't catch them. Name the specific fallacy, quote
   the offending span, and explain the relevance/presumption/ambiguity defect.
3. For specs, prioritize the spec-specific section — it's where the dollar value is.
4. **Don't over-call.** A flagged fallacy needs a stated reason. Rhetorical color
   ("but", emphasis) is not automatically a fallacy. False positives erode trust as
   fast as misses.

## Machine-readable taxonomy (entailer)

Generated into `@entailer/core` by `scripts/gen-taxonomy.mjs`. Keep this block in
sync with the table above; the drift gate fails CI if the generated module and this
source disagree.

<!-- entailer-data: fallacies -->
```json
{
  "fallacies": [
    { "id": "affirming-the-consequent", "name": "Affirming the consequent", "signature": "P→Q, Q ⊢ P", "severity": "major", "kind": "formal" },
    { "id": "denying-the-antecedent", "name": "Denying the antecedent", "signature": "P→Q, ¬P ⊢ ¬Q", "severity": "major", "kind": "formal" },
    { "id": "affirming-a-disjunct", "name": "Affirming a disjunct", "signature": "P∨Q, P ⊢ ¬Q", "severity": "major", "kind": "formal" },
    { "id": "illicit-conversion", "name": "Illicit conversion", "signature": "P→Q as Q→P", "severity": "major", "kind": "formal" },
    { "id": "illicit-contraposition", "name": "Illicit contraposition", "signature": "P→Q as ¬P→¬Q", "severity": "major", "kind": "formal" },
    { "id": "undistributed-middle", "name": "Undistributed middle", "signature": "∀x(A→M), ∀x(C→M) ⊬ ∀x(C→A)", "severity": "major", "kind": "formal" },
    { "id": "illicit-major-minor", "name": "Illicit major/minor", "signature": "term distributed in conclusion but not premise", "severity": "major", "kind": "formal" }
  ]
}
```
