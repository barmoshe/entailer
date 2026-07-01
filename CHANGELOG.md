# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project uses semantic
versioning. All packages are versioned together.

## [Unreleased]

## [1.2.1] - 2026-07-01

### Fixed
- **`domain --gate introduced` no longer misses a leak introduced in a different
  file.** The base↔head finding key was concept-only (both line- and
  file-independent), so a newly-introduced `concept-fusion` whose concept pair
  already appeared *anywhere* in the base was mis-attributed as pre-existing and
  dropped — a false negative in the regression gate. The key now includes each
  receipt's `uri`. The helper is centralized as `domainFindingKey` (exported from
  `@entailer/core`) and shared by the CLI and the MCP `evaluate_domain` tool, which
  previously duplicated it. Known residual: two *different* fused identifiers in the
  *same* file with the same concept pair still share a key (the identifier is not yet
  carried on the finding) — tracked for a later increment.

## [1.2.0] - 2026-07-01

### Added
- **The concept-faithfulness lens (`evaluateDomain`) — a new axis, not a tier.**
  Keeps a project faithful to its own *concepts* across code and prose. You declare
  a small concept cluster on its four sides (relationships / defining rule /
  examples / vocabulary); the lens classifies identifier sites and reports leaks as
  **ranked evidence**. Only **rank-1** is a verdict — a deterministic contradiction:
  one identifier fusing two concepts declared disjoint (`is-not`), or a
  self-contradictory declaration caught by the honest-recursion pre-check before any
  file is read. **Ranks 2–3 are reader hints** (`readerAssisted`): they assert
  nothing, can never be a blocker, and can never render in the certificate register
  — enforced by the `DomainReport` schema (`.superRefine`), the same way
  `LogicReport` enforces its honesty invariants. An `is-a` overlap is satisfiable by
  construction and stays silent (no false positive on legitimately-overlapping
  concepts). `noLeakFound` means "no deterministic leak surfaced", never "proven
  faithful". `target.tier` is unchanged (`1..5`) — the lens is a distinct
  `DomainReport` on an orthogonal axis.
- **CLI `entailer domain --lens <file.yaml|json> --repo <dir>`** (+ `--gate
  introduced` to report only leaks new vs a `--base <ref>`). Exit `0` clean / `1`
  rank-1 leak / `2` malformed declaration. Adds a `yaml` dependency to `@entailer/cli`.
- **MCP tool `evaluate_domain`** (spec + files → `DomainReport`; `gate=introduced`
  diffs vs a supplied base), auto-exposed by the existing Claude + Codex plugins.
- **viz: `domainMapView` / `domainMapToMermaid` / `domainBadge`.** Certificate-gated
  like `verdictBadge`: `leak` only for a rank-1 verdict; hint nodes render with a
  distinct dashed class so a picture never launders a hint into a verdict.
- **Site: a live in-browser domain-lens demo** — declare a cluster, watch the real
  engine flag a leak, hold silent on a legitimate `is-a` overlap, and pass its own
  `validity ≠ truth ≠ faithful-formalization` calibration case.

### Notes
- No breaking changes; all five tiers and their APIs are unchanged. Deferred past
  this release: the LLM-grounded rank-3 prose-vs-practice detector, execution-grounded
  detection, and the standing-rule adjudication store.

## [1.1.0] - 2026-07-01

### Added
- **Tier 5 — pull-request evaluator (`evaluatePr`).** A base→head **delta /
  regression gate**: cross-file consistency of the base claim-set vs the head
  claim-set, attributing each contradiction as introduced / fixed / pre-existing
  (exact per-claim, via stable `uri:dsl` identity), and folding the PR
  description's fenced `entailer` claims into the head. Two knobs: `gate`
  (`head` default, or `introduced` to fail only on newly-introduced contradictions)
  and `descriptionSeverity` (`fail` | `warn` | `off`). A new optional `delta` field
  on `LogicReport` carries the machine-readable regression result; `target.tier`
  now admits `5`. Honest by contract: an inconsistent-but-not-regressed head PASSES
  under `gate=introduced` (`NO_ISSUE_FOUND` with `consistency.status: UNSAT` + a
  mandatory note), never a silent clean pass.
  - CLI: `entailer pr <number|url>` (via `gh` + git), `entailer pr --base <ref>`
    (local git), `entailer pr --base-dir <d> --head-dir <d>` (offline), with
    `--gate` / `--description` flags.
  - MCP: `evaluate_pull_request` tool.

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
