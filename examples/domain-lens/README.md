# domain-lens — concept faithfulness

The domain lens is an axis, not a tier: it asks whether the code stays faithful to
its own concepts. You declare a small cluster on its four sides (relationships /
rule / examples / vocabulary); the lens flags where a codebase drifts from it.

```sh
npx @entailer/cli domain --lens access.yaml --repo .
```

`access.ts` deliberately fuses two mutually-exclusive concepts in one identifier
(`grantMemberGuest`), so the run reports a **rank-1** `concept-fusion` verdict and
exits `1`:

```
⛔ concept-fusion  access.ts:4 — identifier `grantMemberGuest` names both `member`
   and `guest`, which the cluster declares mutually exclusive.
```

Only a rank-1 finding is a verdict. An `is-a` overlap (a `member` that *is* a
`user`) stays silent — satisfiable by construction, no false positive. Ranks 2–3
are reader hints that assert nothing and can never block. Classification is lexical
(the irreducible weak link), so a human confirms each site.

Add `--gate introduced --base main` to report only leaks a change introduced versus
a git ref. The same check is available as the MCP tool `evaluate_domain`.
