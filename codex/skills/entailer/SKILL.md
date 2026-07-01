---
name: entailer
description: Check logical validity, consistency, fallacies, and pull-request contradictions with Entailer. Use when the user asks "is this argument valid", "does this follow", "are these requirements consistent", "find the contradiction", "formalize this", "logic/fallacy review", "check this prompt/spec/markdown/repo", or "does this PR introduce a contradiction".
---

# Check reasoning with Entailer

Entailer gives text a logician's pass: formalize the load-bearing claims, then run
the deterministic checker. Keep the central contract visible in every answer:
validity is not truth, consistency is not truth, and a faithful formalization is a
separate claim that must be shown.

The plugin root is this plugin's own folder. The reference library lives in
`skills/entailer/references/`. Load the specific reference you need; start with
`references/09-evaluation-rubric.md` for the full report shape and
`references/06-formalization-nl-to-logic.md` for English-to-logic translation.

## Workflow

1. Scope the target: sentence, argument, prompt, Markdown/spec, repo, or PR.
   For a repo or PR, focus on load-bearing docs and requirement claims rather
   than code line by line.
2. Extract only claims doing argumentative work. Recover hidden premises and mark
   them as supplied, not stated.
3. Build a symbol dictionary before checking anything. Each atom must have an
   English gloss, such as `p = deploy succeeded`.
4. Formalize in the weakest adequate logic. Use propositional logic first; reach
   for first-order, modal, deontic, temporal, probabilistic, causal, or defeasible
   references only when the prose actually needs them.
5. Run a real Entailer check. Prefer MCP tools when the `entailer` MCP server is
   available; otherwise use the CLI with `npx -y @entailer/cli`.
6. Report the verdict with the symbol dictionary, formalization, proof or
   counter-model when present, and caveats about premise truth or translation
   confidence. If the reading is ambiguous or out of fragment, say UNKNOWN.

## CLI Checks

Use `--json` when you need machine-readable output. Exit codes are honest:
`0` clean or valid, `1` invalid or inconsistent, `2` malformed input, `3` UNKNOWN.

Classify one formula:

```bash
npx -y @entailer/cli sentence "p -> p" --json
```

Check a formalized argument with simple prompt JSON:

```json
{
  "claims": [
    { "dsl": "p", "text": "the deploy succeeded" },
    { "dsl": "p -> q", "text": "if the deploy succeeded, the release is live" },
    { "dsl": "q", "text": "therefore the release is live" }
  ],
  "symbols": [
    { "symbol": "p", "gloss": "the deploy succeeded" },
    { "symbol": "q", "gloss": "the release is live" }
  ]
}
```

```bash
npx -y @entailer/cli prompt --file prompt.json --json
```

Check Markdown/spec consistency. Add fenced `entailer` blocks containing `let`
dictionary lines plus formulas:

````markdown
```entailer
let req = a request exists
let logged = the request is logged
let health = health-check request
req -> logged
health -> ~logged
health & req
```
````

```bash
npx -y @entailer/cli markdown spec.md --json
npx -y @entailer/cli repo . --json
```

Check a PR. Use `--gate introduced` when the user cares only about new
contradictions; the default `head` gate fails on any head-state inconsistency.

```bash
npx -y @entailer/cli pr 42 --json
npx -y @entailer/cli pr --base main --gate introduced --json
npx -y @entailer/cli pr --base-dir base --head-dir head --gate introduced --json
```

## MCP Checks

The plugin declares an `entailer` MCP server:

```json
{
  "command": "npx",
  "args": ["-y", "@entailer/mcp"]
}
```

When those tools are available, use them instead of shelling out:
`check_validity`, `check_consistency`, `classify_formula`,
`evaluate_sentence`, `evaluate_argument`, `evaluate_prompt`,
`evaluate_markdown`, `evaluate_repo`, and `evaluate_pull_request`.

## Reporting Rules

- Always show the symbol dictionary and the formal formulas you checked.
- Separate "invalid" from "false"; invalid means the conclusion does not follow
  from the premises.
- Separate "consistent" from "true"; SAT means no contradiction was found in the
  formalized claim set.
- Mention supplied premises and ambiguous readings explicitly.
- Do not turn low translation confidence into a decisive verdict. Return UNKNOWN
  and explain what would be needed to decide.
- For PRs, distinguish full head consistency from the base-to-head delta. Say
  whether a contradiction is introduced, fixed, or pre-existing.

## Reference Routing

| Need | Read |
| --- | --- |
| End-to-end rubric and report schema | `references/09-evaluation-rubric.md` |
| English-to-logic translation, hidden premises, ambiguity | `references/06-formalization-nl-to-logic.md` |
| Propositional logic, truth tables, normal forms | `references/02-propositional-logic.md` |
| Predicate / first-order logic | `references/03-predicate-first-order-logic.md` |
| Derivations, counter-models, proof systems | `references/04-proof-systems.md` |
| Soundness, completeness, and what a verdict guarantees | `references/05-soundness-completeness-metalogic.md` |
| Fallacies and named reasoning errors | `references/07-fallacies-and-reasoning-errors.md` |
| Vacuity, contradiction, tautology, explosion | `references/10-vacuity-contradiction-tautology.md` |
| Solver escalation and SMT/Lean/Rocq sketches | `references/08-formal-verification-tools.md` |
| Inductive, abductive, defeasible, or argumentation theory | `references/16-non-deductive-reasoning.md`, `references/17-defeasible-reasoning-and-argumentation.md` |
| Modal, deontic, temporal, probabilistic, fuzzy, causal, counterfactual claims | `references/18-modal-deontic-temporal-logic.md`, `references/19-probabilistic-and-fuzzy-reasoning.md`, `references/20-causal-and-counterfactual-reasoning.md` |
| Formal semantics, controlled NL, generalized quantifiers | `references/21-formal-semantics-and-controlled-nl.md` |
| Type theory, higher-order logic, Curry-Howard | `references/22-type-theory-and-curry-howard.md` |
| Caveats and known failure modes | `references/99-caveats.md` |
