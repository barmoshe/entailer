# Examples

Run these from a clone after `pnpm install && pnpm -r build`, or swap the
`node packages/cli/dist/index.js` calls for `npx @entailer/cli` once installed.

## Tier 2 — an argument (supplied IR)

`affirming-consequent.ir.json` is the classic invalid argument `p->q, q ⊢ p`.

```sh
node packages/cli/dist/index.js check --ir examples/affirming-consequent.ir.json
# -> INVALID, counter-model p=F, q=T, exit code 1
```

## Tier 3 — a markdown spec with a within-doc contradiction

```sh
node packages/cli/dist/index.js markdown examples/inconsistent-spec.md
# -> INCONSISTENT, minimal conflicting subset reported back to path:line
```

## Tier 4 — a repo whose README and SPEC contradict each other

```sh
node packages/cli/dist/index.js repo examples/repo-demo
# -> INCONSISTENT, cross-file conflict spanning README.md and SPEC.md
```

## Programmatic (library)

```sh
node examples/programmatic.mjs
```

`programmatic.mjs` imports `@entailer/core` directly and shows the sentence,
argument, markdown, and repo adapters. The honest output contract is the point:
every report carries the symbol dictionary, the formalization, and the certificate
that licenses the verdict.
