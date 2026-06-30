# Contributing to entailer

Thanks for your interest. entailer is a TypeScript monorepo (pnpm workspaces). The
deterministic verifier core is the trusted kernel, so the bar for changes there is
correctness, not just passing tests.

## Setup

```sh
pnpm install
pnpm check     # typecheck + every test suite + the taxonomy/schema drift gate
```

Requires Node `>=20.19` and pnpm. `pnpm check` is exactly what CI runs.

## Repo layout

| Package | What it is |
|---|---|
| `@entailer/core` | The trusted kernel. Pure TypeScript, dependency-light. **All logic lives here.** |
| `@entailer/cli` | The `entailer` binary. A thin adapter over `core`. |
| `@entailer/mcp` | The stdio MCP server. Thin tools over `core`. |
| `@entailer/translate` | The only LLM-touching package. Prose to typed IR. |
| `@entailer/viz` | Deterministic view-models and renderers. |
| `@entailer/solver` | Opt-in Z3/SMT escalation. |

## The rules that matter

1. **Logic lives in exactly one place: `core`.** The CLI, MCP, viz, and translate
   are thin. If you find yourself writing a verification step or a classification
   outside `core`, stop and move it in.
2. **`validity != truth != faithful-formalization`.** These are three independent,
   machine-readable fields. A verdict without a visible symbol dictionary plus
   formalization must fail schema validation, not just lint. Do not collapse them.
3. **Correctness is the product.** A wrong `VALID` is worse than no tool. Every
   verification path is cross-checked against the exhaustive truth-table oracle by a
   property test before it is trusted. New engines get the same treatment.
4. **`UNKNOWN` is first-class.** Out-of-fragment, low translation confidence, and
   solver timeouts return `UNKNOWN`, never a guessed `VALID`/`INVALID`.
5. **Match the house style** in `packages/core/src/ast.ts`: arrow-fn constructors,
   `readonly` fields, exhaustive `switch` over the discriminated union, JSDoc on
   exports.

## Changing the taxonomy

The machine-readable taxonomy (fallacy ids, verdict enum, severity ladder, honesty
contract) is **generated**, not hand-edited:

1. Edit the fenced `entailer-data` JSON blocks in
   `plugin/skills/formalize/references/` (refs 07, 09, 99).
2. Run `pnpm gen` and commit the regenerated
   `packages/core/src/generated/taxonomy.ts`.
3. `pnpm check` runs the drift gate (`gen` then a clean `git diff`), so the TS enums
   can never silently diverge from the prose.

## Commits and PRs

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, ...).
- Keep PRs focused. Add or update tests for any behavior change.
- `pnpm check` must be green. CI enforces it on every push and PR.

By contributing you agree your work is licensed under the project's MIT license.
