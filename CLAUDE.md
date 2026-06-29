# CLAUDE.md — entailer

Agent guide for the `entailer` repository. This is the standalone open-source repo
(a sibling clone of the `bar_builds` workshop, where the planning canon lives under
`projects/entailer/`). Keep this about *the code*.

## What it is

An open-source TypeScript toolkit that evaluates the logical soundness of text
artifacts (sentence → prompt → markdown → repo): an npm library, a Claude plugin,
an MCP server, and visualization tools. The deterministic verifier core is the
trusted kernel; an LLM or rule-based translator is an untrusted proposer.

## Stack

TypeScript, pnpm workspaces. Packages:

- `@entailer/core` — pure, zero LLM/solver deps. The trusted kernel.
- `@entailer/cli` — `entailer` bin; a thin adapter over `core`.

Later (designed, not yet built): `solver` (opt-in Z3), `translate` (the only
LLM-touching code), `mcp`, `viz`. MIT.

## The non-negotiables

- **`validity ≠ truth ≠ faithful-formalization`** — three independent,
  machine-readable fields, never collapsed. A verdict with no visible symbol
  dictionary + formalization must fail schema validation, not just lint.
- The deterministic core consumes **only the IR**, never raw text. All NL→logic
  lives in `translate`; all rendering in `viz`; CLI/MCP are thin. **Logic lives in
  exactly one place: `core`.**
- **Correctness is the product.** A wrong `VALID` is worse than no tool. Every
  verification path is cross-checked against an exhaustive truth-table oracle by a
  property test before it is trusted.
- `unknown` / out-of-fragment / timeout is a first-class **`UNKNOWN`**, never
  silently `VALID` or `INVALID`. Right-size the logic: propositional first, FOL
  only when needed.
- Match the house style in `packages/core/src/ast.ts` (arrow-fn constructors,
  readonly fields, exhaustive `switch` over the discriminated union, JSDoc on
  exports). After every change: `pnpm check` must be green.

## Layout

- `packages/core/src/` — `ast.ts`, `parser.ts`, `evaluate.ts` (truth-table
  oracle), `dpll.ts`, `tableau.ts`, `verify/`, `ir.ts`, `report.ts`,
  `adapters/`, `taxonomy.ts`, `index.ts`. Tests sit beside each source file.
- `DESIGN.md` — full architecture, IR, schema, pipeline, milestones.
- The `formalize` skill knowledge base is the prose/judgment layer and is
  **vendored one-way** from the workshop; machine taxonomy is generated from it,
  not hand-copied (drift gate).

## Privacy

The workshop's own open-source project; no client PII. The planning/state canon
(brief, scope, STATUS, ADRs) lives in the workshop under `projects/entailer/`.
