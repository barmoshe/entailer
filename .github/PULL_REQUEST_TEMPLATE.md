# Summary

What does this change and why?

## Checklist

- [ ] `pnpm check` is green (typecheck + all tests + drift gate).
- [ ] Logic changes live in `@entailer/core` (adapters/CLI/MCP stay thin).
- [ ] New verification paths are property-checked against the truth-table oracle.
- [ ] No verdict ships without its certificate (proof / counter-model / minimal subset);
      `UNKNOWN` is used instead of a guess where appropriate.
- [ ] If the taxonomy changed: edited the fenced blocks, ran `pnpm gen`, committed the
      regenerated `taxonomy.ts`.
- [ ] Tests added/updated; docs/CHANGELOG updated if user-facing.
