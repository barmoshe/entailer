# entailer

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

## Status: v0.1 (in progress)

v0.1 is the deterministic core plus a CLI, taking the formalization as supplied
input. It builds the IR and source-adapter seam so the later tiers extend the same
core instead of re-implementing logic.

| Tier | Input | v0.1 |
|---|---|---|
| 1 Sentence | one claim | ✅ in scope |
| 2 Prompt | prose with an implicit conclusion | roadmap (v0.2) |
| 3 Markdown | one `.md` | roadmap (v0.3) |
| 4 Repo | a path, cross-file | roadmap (v0.4) |

The LLM translator, the MCP server, and the visualization package are designed for
but not built in v0.1.

## Packages

| Package | What it is |
|---|---|
| `@entailer/core` | The trusted kernel: Formula AST, DSL parser, propositional tableau + DPLL, classification, the IR, and the `LogicReport` schema. Pure, dependency-light. |
| `@entailer/cli` | `entailer` binary: evaluate a supplied formalization, `--json` output, honest exit codes including a distinct `UNKNOWN`-blocked code. |

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
