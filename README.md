# entailer

[![ci](https://github.com/barmoshe/entailer/actions/workflows/ci.yml/badge.svg)](https://github.com/barmoshe/entailer/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@entailer/core.svg)](https://www.npmjs.com/package/@entailer/core)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**A logician's-pass linter for software artifacts.** Entailer checks whether prose
that argues actually *follows*, and whether a set of requirements is *consistent*,
by formalizing the load-bearing claims into logic and verifying them
deterministically. It reports **validity** and **consistency** separately from
**truth**, and it never ships a verdict without showing the formalization it judged.

Think "markdownlint or Vale, but for logical validity and consistency", over
claims, prompts, docs, and whole repos.

## The example that matters

A linter for *style* cannot catch this. Two requirements in a spec, written pages
apart, that cannot both hold:

```
R1. Every request must be logged.
R2. Health-check requests must not be logged.
R3. /healthz is a request.
```

These three are mutually inconsistent: R3 makes `/healthz` a request, R1 forces it
to be logged, R2 forbids it. Entailer's job is to surface that as an
`INCONSISTENT` verdict with the **minimal conflicting subset** `{R1, R2, R3}`, not
a vibe and not a style nag. A cross-file contradiction like this is the thing a
single-sentence "is this a fallacy" toy structurally cannot produce, and it is
where Entailer is headed (Tiers 3 and 4 below).

## Quickstart

```sh
# CLI
npx @entailer/cli markdown spec.md           # Tier 3: within-doc consistency
npx @entailer/cli repo .                      # Tier 4: cross-file consistency
npx @entailer/cli pr 42                        # Tier 5: base→head delta over PR #42 (gh + git)
npx @entailer/cli pr --base main              # Tier 5: working tree vs a local git ref
npx @entailer/cli sentence "a -> a"           # Tier 1: classify a claim
npx @entailer/cli check --ir argument.json    # validity of a supplied argument

# Library
npm i @entailer/core
```

```ts
import { evaluateMarkdown } from "@entailer/core";
const report = evaluateMarkdown({ markdown, uri: "spec.md" });
console.log(report.verdict, report.consistency.minimalConflictingSubset);
```

Exit codes: `0` no issue / valid, `1` invalid or inconsistent, `2` malformed input,
`3` UNKNOWN-blocked. Runnable demos live in [`examples/`](./examples). The MCP server
is `npx @entailer/mcp` (declared in `plugin/.mcp.json`).

## What is honest about it

The whole tool exists to protect one distinction:

> **validity ≠ truth ≠ faithful-formalization** — three independent fields, never collapsed.

- **Validity / consistency** is what the deterministic core licenses (`Γ ∪ {¬φ}`
  unsatisfiable means valid; a witnessed model means invalid or consistent). It is
  sound by construction and reproducible.
- **Faithfulness** (does the formula capture the English?) is attestable only by a
  human or an LLM in the loop. It is the weak link, so the formalization is
  *always shown*. A verdict with no visible symbol dictionary fails schema
  validation; it cannot ship.
- **Premise truth** is a question about the world and is explicitly out of scope.

There is no "soundness score". `unknown` / out-of-fragment / timeout is a
first-class `UNKNOWN` verdict, never silently `VALID` or `INVALID`.

## Architecture

A strict two-layer split. A pluggable **translator** (LLM-in-the-loop or
rule-based) emits a typed **IR** carrying an auditable symbol dictionary. A fully
deterministic **verifier core** consumes *only the IR, never raw text*, so the same
checker runs identically whether a human or a model produced the formalization.

Logic lives in exactly one place: `@entailer/core` (pure TypeScript, zero LLM or
solver dependencies, the trusted kernel). See [`DESIGN.md`](./DESIGN.md) for the
full pipeline, IR schema, tier model, and milestone plan.

## Status

v0.1 shipped the deterministic core plus a CLI. v0.2 and v0.3 added the MCP server,
the LLM translator, the tier adapters, and the viz and solver packages; 1.1.0 added
the Tier-5 pull-request evaluator. All five tiers run over the one deterministic core.
The IR and source-adapter seam is what lets every tier extend the same core instead of
re-implementing logic.

| Tier | Input | status |
|---|---|---|
| 1 Sentence | one claim | ✅ built |
| 2 Prompt | prose with an implicit conclusion | ✅ built |
| 3 Markdown | one `.md` | ✅ built |
| 4 Repo | a path, cross-file | ✅ built |
| 5 PR | base + head file sets (+ PR body) | ✅ built — base→head delta / regression gate |

The deterministic core takes the formalization as supplied input; the LLM translator
(`@entailer/translate`) produces it from prose and degrades to `UNKNOWN` when the
translation is shaky.

## Packages

| Package | What it is |
|---|---|
| `@entailer/core` | The trusted kernel: Formula AST, DSL parser, propositional tableau + DPLL, classification, the IR, and the `LogicReport` schema. Pure, dependency-light. |
| `@entailer/cli` | `entailer` binary: evaluate a supplied formalization, `--json` output, honest exit codes including a distinct `UNKNOWN`-blocked code. |
| `@entailer/mcp` | Stdio MCP server exposing deterministic tools (`check_validity`, `check_consistency`, `classify_formula`, `evaluate_sentence`, `evaluate_argument`, `evaluate_prompt`, `evaluate_markdown`, `evaluate_repo`, `evaluate_pull_request`) with structured output. The default path is one-call: the caller formalizes in-context, then calls these tools. |
| `@entailer/translate` | The LLM seam (the *only* package that touches a model). Turns prose into the typed IR via Claude, then the deterministic core verifies it. A parse failure or undeclared atom forces the confidence band low, so the core returns `UNKNOWN` rather than a confident-but-wrong verdict. The formalizer is injectable, so the engine is fully testable offline. |

## Develop

```sh
pnpm install
pnpm check        # typecheck + all tests across the workspace
```

Requires Node `>=20.19` and pnpm. Built with pnpm workspaces and TypeScript.

`pnpm check` is the full local gate: typecheck, every test suite, and the taxonomy
+ schema drift gate (`pnpm gen` then a clean `git diff`). The `formalize` skill is
vendored one-way into `plugin/skills/formalize/` via `pnpm vendor:skill`, and the
machine-readable taxonomy is generated from its references, never hand-copied. A
GitHub Actions CI lane running `pnpm check` lands when the repo gets its public
remote.

## License

MIT.
