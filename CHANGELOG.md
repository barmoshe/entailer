# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses semantic
versioning. All packages are versioned together.

## [Unreleased]

## [1.0.0] - 2026-06-30

First stable release. The deterministic verifier core's public API and the IR
schema are now considered stable and follow semantic versioning from here. All
four tiers (sentence, prompt, markdown, repo) run over the one core; the LLM
translator stays an untrusted proposer behind the same IR seam.

### Added
- **Tiers 2 to 4 wired into the CLI and MCP.** CLI: `entailer prompt --file`,
  `entailer markdown <file>`, `entailer repo <dir>` (the CLI does the filesystem
  reads; the core stays filesystem-free). MCP: `evaluate_prompt`,
  `evaluate_markdown`, `evaluate_repo` tools.
- **`@entailer/viz`** — deterministic visualizers: typed view-models plus
  dependency-free text, SVG (truth table), and Mermaid (tableau trees, claim
  graphs) renderers. `verdictBadge()` colors `VALID` only with a proof and
  `INVALID` only with a counter-model; everything else renders inconclusive.
- **`@entailer/solver`** — opt-in Z3/SMT escalation: a pure SMT-LIB emitter plus a
  lazily-probed Z3 backend that degrades to `UNKNOWN` when `z3-solver` is absent.

## [0.1.0] - 2026-06-30

First public release: the deterministic verifier core, a CLI, an MCP server, and the
LLM translator.

### Added
- **`@entailer/core`** — Formula AST, ASCII/Unicode DSL parser, an exhaustive
  truth-table oracle, a native DPLL SAT backend and a propositional analytic
  tableau (both property-checked against the oracle), the verify API
  (`checkValidity` / `checkConsistency` / `classify`) with an explosion guard and a
  first-class `UNKNOWN`, the Zod IR plus an emitted JSON Schema, and a `LogicReport`
  whose honesty invariants are enforced by schema validation
  (`validity != truth != faithful-formalization`).
- Tier-1 `evaluateSentence` and supplied-argument `evaluateArgument` adapters, plus
  the Tier-2/3/4 adapters (`evaluatePrompt`, `evaluateMarkdown`, `evaluateRepo`).
- A taxonomy codegen + drift gate generated from the one-way-vendored `formalize`
  skill references.
- **`@entailer/cli`** — the `entailer` binary with honest exit codes
  (0 / 1 / 2 / 3 for no-issue / invalid-or-inconsistent / malformed / UNKNOWN).
- **`@entailer/mcp`** — a stdio MCP server exposing the deterministic check/evaluate
  tools with structured output.
- **`@entailer/translate`** — the LLM seam: prose to a validated `FormalizedArgument`
  IR, with a deterministic confidence guard that forces `UNKNOWN` on a parse failure
  or an undeclared atom.
