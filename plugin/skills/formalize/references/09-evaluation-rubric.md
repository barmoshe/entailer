# 09 — The evaluation rubric & report schema

The end-to-end procedure the skill executes and the shape of what it returns. This
is the operational core; the other references are the knowledge it draws on.

## Inputs

- **A prompt / passage** — formalize inline.
- **A `.md` file** — formalize the argumentative content; cite by line number.
- **A repo path** — formalize the **load-bearing prose**: README, specs, design
  docs, RFCs, proofs, requirement/acceptance lists, ADRs. Not the code line-by-line
  (offer that as a follow-up via `08` if asked). Cite by `path:line`.

## The procedure (run in order)

1. **Scope & collect.** Identify the target type; for a repo, enumerate the docs
   worth formalizing and say which you chose (and which you skipped, and why).
2. **Extract claims & conclusions** (`06` step 1–2). List each load-bearing claim
   with its source location. Leave rhetoric/examples alone.
3. **Recover hidden premises** (`06` step 3). Mark each `[supplied]`; use the
   weakest charitable premise, then test whether *it* is defensible.
4. **Build the symbol dictionary** (`06` step 5). One line per symbol → English
   gloss. This must appear in the report.
5. **Formalize** each premise and conclusion (`02`/`03`/`06`). Right-size the logic.
   **Flag ambiguities**; show competing readings where they matter.
6. **Check validity** (`04`): derivation ⇒ valid; counter-model ⇒ invalid. Escalate
   to a solver (`08`) only if needed and available.
7. **Check consistency** of the premise/requirement set (`04`/`08`): find a model
   (consistent) or a derivable contradiction + **minimal conflicting subset**
   (`05` compactness).
8. **Run the error checklist** (`07`): formal fallacies (with counter-models) then
   informal/spec-specific by reading.
9. **Assess premise truth separately** (`05`): for each premise, can you vouch for
   it? Usually you can flag *internal* tension but not certify *empirical* truth —
   say which.
10. **Compose the report** (schema below). Every issue cites a location and shows
    its formalization. State the validity/soundness distinction explicitly.

## Severity levels

| Level | Meaning |
|-------|---------|
| **blocker** | A derivable contradiction, or the central conclusion is invalid / circular. The argument fails as stated. |
| **major** | A formal fallacy or unfillable gap in a load-bearing step; conclusion not supported without a premise that's missing or indefensible. |
| **minor** | A non-fatal informal fallacy, an over-strong quantifier, an avoidable ambiguity, a vacuous/redundant requirement. |
| **note** | Premise-truth caveat, modal/temporal content approximated, formalization choice the reader should know about. |

## Report schema

```md
# Formalization verdict — <target>

## Verdict
<one line — deductive bands: VALID / INVALID / INCONSISTENT / VALID-BUT-UNSOUND-RISK
/ GAP / NO-ISSUE-FOUND. For non-deductive or non-classical content use the matching
band instead of forcing a deductive verdict: NON-DEDUCTIVE (inductive/abductive —
assess by strength, `16`), WARRANTED-BUT-DEFEASIBLE / DEFEATED (defeasible, `17`),
MODAL-DEONTIC-TEMPORAL (`18`), PROBABILISTIC-OR-VAGUE (`19`), CAUSAL (`20`).>
<one sentence stating the validity↔truth distinction for this case>

## Symbol dictionary
| Symbol | Gloss |
|--------|-------|
| P | <english> |
| ∀x A(x) | <english> |
…

## Formalization
| # | Source | Claim (English) | Formal | Role |
|---|--------|-----------------|--------|------|
| 1 | path:line | … | `G → S` | premise |
| 2 | path:line | … | `G` | premise |
| H | — | … | `S → F` | premise [supplied] |
| C | path:line | … | `F` | conclusion |

## Validity check
<method used (`04`); the derivation, OR the counter-model that shows invalid>

## Consistency check
<satisfiable + witnessing model, OR contradiction + minimal conflicting subset>

## Findings
- [severity] (path:line) <name the issue> — <formal signature> — <counter-model / why>
…

## Premise-truth notes
<which premises could be vouched for, which are empirical/out of scope (`05`)>

## (Optional) Solver artifact
<the SMT-LIB / Lean sketch emitted and the solver's verdict (`08`)>

## Bottom line
<plain-language summary: does the conclusion follow, are the requirements
consistent, what would have to change>
```

## The three eval-driven worked examples (build & keep these)

### A. Valid argument — clean derivation
> "Every service with PII must be encrypted. The billing service stores PII.
> Therefore the billing service must be encrypted."
- Dict: `P(x)` = x stores PII; `E(x)` = x must be encrypted; `b` = billing service.
- Premises: `∀x(P(x) → E(x))`, `P(b)`. Conclusion: `E(b)`.
- Check: `∀`-elim then modus ponens ⇒ `E(b)`. **VALID.**
- Note: soundness rests on the truth of "billing stores PII" — a factual premise.

### B. Invalid-but-plausible — affirming the consequent + counter-model
> "If the cache is warm, latency is low. Latency is low. So the cache is warm."
- Dict: `W` = cache warm; `L` = latency low. Premises `W → L`, `L`. Concl `W`.
- **Counter-model**: `W`=F, `L`=T (latency is low for another reason) — premises
  true, conclusion false. **INVALID** (affirming the consequent, `07`). Note:
  "invalid" ≠ "the cache is cold"; the conclusion just doesn't *follow*.

### C. Inconsistent spec — unsatisfiable requirement set
> "(R1) Every request must be authenticated. (R2) Health-check requests must not be
> authenticated. (R3) Health-check is a request."
- Dict: `Req(x)`, `Auth(x)`, `HC(x)`. Formal: `∀x(Req→Auth)`, `∀x(HC→¬Auth)`,
  `∀x(HC→Req)`.
- Take any health-check `h`: R3 ⇒ `Req(h)`, R1 ⇒ `Auth(h)`; R2 ⇒ `¬Auth(h)`.
  Contradiction. **INCONSISTENT.** Minimal conflicting subset = {R1, R2, R3}
  (all three needed). Fix: scope R1 to non-health-check requests.

## Style of the verdict

Lead with the bottom line. Be a logician, not a pedant: formalize what's load-
bearing, leave rhetoric alone, never assert beyond what the method licenses (`05`,
`99`), and always make the work auditable by showing the dictionary and the
formalization.

## Machine-readable taxonomy (entailer)

Generated into `@entailer/core` by `scripts/gen-taxonomy.mjs`. The deterministic
core uses the subset it can license; the `rank` orders severity for SARIF.

<!-- entailer-data: verdicts -->
```json
{
  "verdicts": ["VALID", "INVALID", "INCONSISTENT", "GAP", "UNKNOWN", "NO_ISSUE_FOUND"]
}
```

<!-- entailer-data: severities -->
```json
{
  "severities": [
    { "id": "blocker", "rank": 3, "gloss": "A derivable contradiction, or the central conclusion is invalid/circular." },
    { "id": "major", "rank": 2, "gloss": "A formal fallacy or unfillable gap in a load-bearing step." },
    { "id": "minor", "rank": 1, "gloss": "A non-fatal informal fallacy, over-strong quantifier, avoidable ambiguity, or vacuous requirement." },
    { "id": "note", "rank": 0, "gloss": "Premise-truth caveat, approximated modal/temporal content, or a formalization choice to disclose." }
  ]
}
```
