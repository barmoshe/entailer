# Entailer — Design Document (v0.1)

*A logician's-pass linter for software artifacts. Open-source. Seeds `projects/entailer/`.*

---

## 1. One-paragraph pitch

**Entailer** is a TypeScript-native engine that checks the *mathematical-logical soundness* of text artifacts at four escalating tiers — a single claim, a prompt, a Markdown document, a whole repo — by translating their load-bearing prose into propositional/first-order logic, then deterministically verifying **validity** and **consistency** and reporting them separately from **truth**. It is for engineers, prompt authors, spec writers, and AI agents who want "does this actually *follow* / are these requirements *consistent*?" answered with an auditable symbol dictionary and a reproducible certificate — not a vibe. **The one-sentence differentiation: markdownlint/Vale, but for logical validity and consistency over claims, prompts, docs, and repos — with `validity ≠ truth` as a first-class, machine-readable output contract that fallacy-classifiers and raw Z3 bridges both throw away.**

---

## 2. Name recommendation

**`entailer`, npm scope `@entailer`** (both the unscoped name and the scope are confirmed free; 404 on registry probe). It names the exact relation the tool checks — entailment, `Γ ⊨ φ` — reads as an agent-noun ("the thing that entails"), and gives us a matching CLI bin and GitHub org. **Runner-up: `valens` / `@valens`** (Latin "being valid/strong", also free) — evocative but less self-explanatory, kept as the fallback if `entailer` collides on a GitHub org or `.dev` domain.

---

## 3. The core thesis

The tool exists to protect one discipline the references hammer (ref 05, 99): **`validity ≠ truth ≠ faithful-formalization`**, reported as three independent fields, never collapsed.

- **Validity / consistency** is what a deterministic verifier licenses (`Γ ∧ ¬φ` unsat ⇒ valid; a witnessed model ⇒ invalid/consistent). It is sound-by-construction and reproducible.
- **Faithfulness** (does the formula capture the English?) is attestable only by an LLM-in-the-loop or a human; it is the *weak link* (ref 99) and the source of "rigorous, confident, wrong."
- **Premise truth** is a question about the world and is explicitly out of scope.

This forces a **strict two-layer architecture**: a **pluggable translator** (LLM-in-the-loop *or* deterministic rule-based) emits a typed **IR** carrying an auditable symbol dictionary; a **fully deterministic verifier core** consumes *only the IR, never raw text*, so the same checker runs identically whether the formalization came from Claude or a human. The verifier is the trusted kernel; the translator is an untrusted proposer whose product must always be shown. **A verdict without a visible formalization must not ship** (ref 99) — we make that a schema invariant, not a guideline.

---

## 4. Architecture

### 4.1 Monorepo layout

pnpm workspaces + Turborepo + Changesets + tsdown (dual ESM+CJS). ~6 packages, the sweet spot for that toolchain.

```
entailer/                              # projects/entailer/, later a public sibling clone
├── turbo.json  pnpm-workspace.yaml  tsconfig.base.json  LICENSE (MIT)
├── packages/
│   ├── core/        @entailer/core     # PURE. zero LLM/solver deps. The trusted kernel.
│   │   ├── ir/                         #   FormalizedArgument + ClaimSet types + Zod + JSON Schema
│   │   ├── parser/                     #   ASCII/Unicode logic DSL  ↔  Formula AST
│   │   ├── verify/                     #   native tableau + DPLL (propositional), refutation driver
│   │   ├── lint/                       #   IR lint pass (coarse atoms, ∀∧ / ∃→ errors, free vars)
│   │   ├── report/                     #   LogicReport type + toMarkdown + toSarif
│   │   └── adapters/                   #   tier source-adapters: sentence | prompt | mdast | repo
│   ├── solver/      @entailer/solver   # OPTIONAL Z3/SMT bridge. z3-solver as optionalDependency.
│   ├── translate/   @entailer/translate# LLM-in-the-loop translator (the ONLY LLM-touching code)
│   ├── cli/         @entailer/cli       # bin "entailer". depends on core (+ optional solver/translate)
│   ├── mcp/         @entailer/mcp       # stdio MCP server. zod-validate → call core → structuredContent
│   └── viz/         @entailer/viz       # view-model renderers (static SVG/HTML + React). depends on core types only
├── plugin/                             # in-repo Claude Code plugin (.claude-plugin/plugin.json)
│   ├── skills/formalize/               #   VENDORED copy of the formalize skill (one-way sync)
│   └── .mcp.json                       #   declares @entailer/mcp via npx
├── apps/playground/                    # Vite demo of viz (not published)
├── benchmarks/                         # FOLIO/ProofWriter eval harness (dev-only; may host Python baselines)
└── fixtures/                           # golden LogicReports (ref-09 A/B/C + tier fixtures)
```

### 4.2 How the surfaces compose without duplicating logic

There is exactly **one place each concern lives**:

- **Logic** (parse, verify, classify, lint, report-schema, tier-adapters) lives only in `@entailer/core`.
- **The LLM translation step** lives only in `@entailer/translate` (and is re-invoked by the *plugin/skill in-context* — see §6).
- **Solver escalation** lives only in `@entailer/solver`, behind a capability probe.
- **Rendering pixels** live only in `@entailer/viz`; core emits typed **view-models** (JSON) and imports zero render libs.
- **CLI / MCP** are thin: they validate input, call `core` (and optionally `solver`/`translate`), and shape output. They contain no logic.
- **Prose/judgment knowledge** (fallacy catalog, NL→logic heuristics, caveats) lives only in the vendored `formalize` skill's `references/`. The machine-consumable parts of refs 07/09/16–22 (fallacy ids + signatures, verdict enum, severity ladder, honesty-contract string, the logic-fragment / escalation-target / flattened-kind taxonomy) are **generated** from fenced data blocks in those references into `core/src/generated/taxonomy.ts`, with a CI `gen && git diff --exit-code` gate so the TS enums can never silently drift from the prose. (Per the adversarial finding: "only types + algorithms" does *not* dodge duplication when the types *are* the taxonomy — so we generate, not hand-copy.) **Seeded now in `core/src/taxonomy.ts`** (hand-authored, ref-cited) ahead of the codegen (BUILD_PLAN T14): the deferred tail — ref 21 (`GENERALIZED_QUANTIFIER` fragment; `generalized-quantifier`/`ambiguous-reading` kinds) and ref 22 (`HOL` + `dependent-type-theory` fragments; the `PROOF_ASSISTANT` escalation target; `higher-order` kind) — is wired in, alongside the PL/FOL/modal/deontic/temporal/probabilistic/fuzzy base.

### 4.3 The internal IR

Two record types in **one** schema (per the adversarial verdict on a single IR: the layer split is real but does **not** need a second schema — SMT-LIB itself unifies signature + per-argument assertions via push/pop). Propositional = the arity-0 fragment of FOL, so one Formula AST covers both.

```ts
type Logic = 'PROP' | 'FOL';
type Source = 'stated' | 'supplied' | `reading:${string}`;  // [supplied] enthymemes & per-reading

interface SymbolEntry {
  kind: 'atom' | 'pred' | 'const' | 'func';
  name: string; arity: number;
  gloss: string;               // exact English — the trust anchor (ref 06 prime directive)
  source: Source;
  spans: SourceSpan[];         // provenance is a RELATION (0..n spans), not a 1:1 function
}

interface FormalizedArgument {
  logic: Logic;
  symbols: SymbolEntry[];                 // the symbol dictionary, first-class
  premises: { ast: Formula; role: 'premise'|'premise-supplied'; source: Source; spans: SourceSpan[] }[];
  conclusion?: { ast: Formula; source: Source; spans: SourceSpan[]; inferred?: boolean };
  outOfScope: { text: string; kind: 'modal'|'deontic'|'temporal'|'probabilistic'|'causal'|'vague'|'higher-order'|'generalized-quantifier'|'ambiguous-reading'; spans: SourceSpan[] }[];
  ambiguity?: { readings: FormalizedArgument[]; divergesOnVerdict: boolean };
  translationConfidence: { band: 'low'|'med'|'high'; score: number; signals: string[] };
}

// Corpus / cross-file layer = the SAME schema + alias edges as DATA (Tier 4 only; absent below)
interface ClaimSet {
  args: FormalizedArgument[];
  scopes: { id: string; argIds: string[] }[];      // one prompt / one doc / a cross-file cluster = a scope
  unification?: { a: string; b: string; basis: string; source: 'user'|'llm'|'lexical'; confidence: number }[];
}
```

The verifier reads only `args[].premises[].ast` / `conclusion.ast` and the `scopes`. Everything else (glosses, spans, confidence, ambiguity, out-of-scope) is for the human/LLM audit loop and the viz layer.

---

## 5. The five tiers

One canonical pipeline; a **tier is a `SourceAdapter: (raw) => ClaimSet`** over one tier-agnostic engine. Tiers are an **additive capability ladder**, not five products.

| Tier | Input | What the adapter adds | Consistency scope | Logic core change |
|---|---|---|---|---|
| **1 Sentence** | one claim | classification mode (tautology / contingent / contradiction via `φ` valid? `φ` sat? `¬φ` valid?) — no conclusion to recover | n/a (set of 1) | none |
| **2 Prompt** | prose w/ implicit conclusion | conclusion recovery (indicator words → else LLM nominates + flags `inferred`) + enthymeme `[supplied]` recovery + argument validity | within-prompt | none |
| **3 Markdown** | one `.md` | mdast extraction (remark-parse + unist-util-visit), drop `code`/`inlineCode`, heading-stack sectionPath, `position.start.line` → spans | within-doc | none |
| **4 Repo** | a path | **file selection** (load-bearing prose) + per-file Tier-3 + cross-file scope | within + across clusters | none |
| **5 PR** | base + head file sets (+ PR body) | **base→head delta**: cross-file consistency of both states, attributes each contradiction as introduced / fixed / pre-existing, folds the PR-description claims into the head; a configurable `gate` (head \| introduced) drives the exit code | head, vs a base baseline | none |

**Tier 5 (PR) — the regression-gate view.** A PR is not "another repo": the
differentiated check is a **delta**, established by prior art (SonarQube "Clean as
You Code" applies only new-code conditions to PRs; ESLint bulk-suppressions /
eslint-baseline / reviewdog all fail only on *newly-introduced* issues). Entailer
computes the base claim-set vs the head claim-set and reports what the PR
introduced / fixed on top of the head's absolute consistency, plus folds the PR
description's fenced `entailer` claims into the head ("the PR says X but the code
contradicts X"). Two knobs: `gate` (`head` = fail on any head inconsistency, the
default; `introduced` = fail only when a new/changed claim participates in the
minimal conflicting subset) and `descriptionSeverity` (`fail` | `warn` | `off`).
**Honesty:** a head that is still inconsistent but not *regressed* is a legitimate
PASS under `gate=introduced` — the verdict is `NO_ISSUE_FOUND` while
`consistency.status` stays `UNSAT`, and a mandatory note + the `delta` field state
"the head carries N pre-existing contradiction(s); this PR introduced none." Unlike
the count-based CI baselines, entailer's claims have stable identity (`uri:dsl`), so
attribution is **exact per-claim**, not an approximation.

**Shared source-adapter model.** The engine never knows which tier it serves; only chunking, conclusion-recovery, and consistency *scope* differ. Logic strength is **independent of tier** — right-size per claim (a Tier-1 sentence may need FOL; a Tier-4 requirement may be pure propositional).

**Repo-scale tractability bound.** Never the O(n²) all-pairs claim cross-product. Instead: **(1) select** load-bearing docs (deterministic glob allowlist — README, SPEC*, RFC*, ADR/decisions/*, *requirements*, *acceptance*, package manifests — *always* included without LLM gating; LLM classifier only for the ambiguous tail), defaulting to **high-recall** (a false-exclude inverts the verdict; a false-include is mere noise), and **report the selection manifest** (chosen vs skipped + why). **(2) Canonicalize predicates** into a repo-wide symbol dictionary *before* clustering (so "request" and "inbound call" collapse to one symbol). **(3) Cluster** claims by canonical-symbol overlap, run SMT consistency only within and across overlapping clusters, **(4) residual synonymy pass**: a small batched LLM judge over high-embedding-similarity cross-cluster predicate pairs, merging on a yes. Cap claims-per-solver-call and time-box each Z3 invocation. **Selection and synonym-bridging are fallible LLM steps; both are surfaced as explicit coverage caveats, never as a clean "consistent".**

---

## 5b. The concept-faithfulness lens (an orthogonal axis, v1.2.0)

The five tiers ask *does the logic hold?* The **domain lens** asks a different
question on an independent axis: *does the code stay faithful to its own concepts?*
It reuses the infrastructure (Tier-4 selection, `path:line` provenance, the report
honesty discipline, viz, MCP/CLI) but **not** the SAT/DPLL/tableau verifier, and
introduces no new trusted kernel (framing ADR 0012; design ADR 0013).

- **Input.** A human declares a small concept cluster on its four sides —
  relationships / defining rule / examples / vocabulary (`DomainSpec`). Only two
  relation verbs are machine-checkable: `is-a` (subsumption `A ⊑ B`) and `is-not`
  (disjointness `A ⊓ B = ⊥`). Subsumption is satisfiable by construction, so a
  `member` that *is* a `user` co-occurring is silence; only disjointness is
  violable, which is what makes a leak a *contradiction*.
- **Detect (detect-then-adjudicate).** An honest-recursion pre-check first asks
  whether the declaration is even self-consistent (a pair declared both `is-a` and
  `is-not`; an identifier both a positive and negative example) — the cheapest,
  weak-link-free move, before any file is read. Then it classifies identifier sites
  lexically and fires **rank-1** when one identifier fuses two disjoint concepts.
- **Honesty.** Only **rank-1** is a verdict, carrying a ≥2-receipt minimal
  conflicting subset. **Ranks 2–3 are reader hints** (`readerAssisted`): they assert
  nothing, can never be a blocker, and never render in the certificate register —
  enforced by `DomainReport`'s `.superRefine`, mirroring `LogicReport`.
  `noLeakFound` is the analogue of `noContradictionFound`.
- **The weak link, named.** Classification ("is this token a `member`-use?") is
  lexical, so it is the irreducible weak link — high recall, precision contingent on
  a human confirming each site as the adjudication step. The tool never emits an
  absolute same/different judgment; only a declared-disjointness collision fires.
- **Surface.** `entailer domain --lens <cluster> --repo <dir>` (`--gate introduced`
  reports only leaks new vs a base ref), the MCP tool `evaluate_domain`, and
  `domainMapView`/`domainBadge` in viz. `target.tier` stays `1..5`; the lens is a
  distinct `DomainReport`, not a sixth tier. Deferred past v1.2.0: the LLM-grounded
  rank-3 prose-vs-practice detector, execution-grounded detection, and the
  standing-rule adjudication store.

---

## 6. The engine pipeline

```
        ┌─────────────── LLM-IN-THE-LOOP (untrusted proposer) ───────────────┐
raw ──▶ extract claims ──▶ recover premises/conclusion ──▶ formalize (NL→logic) ──▶ FormalizedArgument/ClaimSet
        └────────────────────────────────────────────────────────────────────┘
                                       │  (IR is the gate)
        ┌───────────── DETERMINISTIC CORE (trusted kernel, no text) ──────────┐
   IR ──▶ Zod/JSON-Schema validate ──▶ IR lint ──▶ verify (validity) ──▶ consistency ──▶ report
        └──────────────────────────────────────────────────────────────────────┘
                                       │  (optional, opt-in)
                              EXTERNAL SOLVER: Z3 (z3-solver WASM) — amplifier, never a gate
```

### The deterministic / LLM boundary, drawn explicitly

- **LLM-in-the-loop (required, irreducible):** claim extraction, conclusion identification, enthymeme/`[supplied]` recovery, NL→logic formalization, ambiguity detection + competing-reading generation, predicate canonicalization (Tier 4), residual synonymy judgment. This is the highest-error step (FOLIO: GPT-3.5 ~49–54%; NL2FOL ~78–80% F1 — *the solver is correct; translation is the bottleneck*).
- **Deterministic core (default path, zero deps):** IR schema validation, the **IR lint pass** (coarse-atom detection, `∀`-with-`∧` / `∃`-with-`→` errors, dropped domain restrictions, free variables in sentences), propositional **semantic tableau** (primary — yields the counter-valuation for free) backed by a native **DPLL** for SAT/consistency, refutation driver (`Γ ∪ {¬φ}` unsat), counter-model extraction, classification (ref 10), report assembly, SMT-LIB emission, view-model emission. **Propositional validity/SAT is decidable (co-NP / NP) and fully owned here.**
- **External solver (opt-in amplifier):** **Z3 via `z3-solver`** (official Microsoft WASM build, MIT, ~v4.16, TS bindings, `z3-solver/node`). Used for FOL / arithmetic / quantifier-free SMT validity (`unsat`⇒VALID), consistency (`get-unsat-core`⇒minimal conflict, then deletion-/QuickXplain-minimized since Z3 cores aren't guaranteed minimal), and finite counter-models. **Always also runs/shows the hand formalization; the base verdict never depends on Z3.**

### Chosen solver packages (decided)
- **`z3-solver`** — the FOL/SMT escalator. **Node-only by default** (browser needs SharedArrayBuffer + COOP/COEP). In the MCP server it runs **out-of-process** in a short-lived spawned worker that does `init → assert → check → get-model/unsat-core → exit`, with a hard wall-clock SIGKILL timeout — this sidesteps the documented Z3-WASM worker-thread leak (issues #7070/#6512) and gives a clean timeout story. Lazy `dynamic import()` + full async-init try/catch capability probe; on any failure, degrade silently to the native path. `engines.node >=20.19` (avoids `ERR_REQUIRE_ASYNC_MODULE`); ship unbundled.
- **Native TS tableau + DPLL** — the always-available propositional base. **No dependency on `logic-solver`** (Meteor-era, unmaintained) and **no `tau-prolog`** in core (maintenance-stale, CWA semantics silently change the logic). `logic-solver` may return later as an *optional* pluggable SAT backend if a hard CNF gets large.
- **Decidable-FOL native target (deferred, see §11):** monadic predicate logic and Bernays-Schönfinkel/EPR are decidable and pure-TS-implementable; if a corpus probe shows syllogistic arguments dominate Tier 3/4, this becomes the WASM-free workhorse. Until measured, FOL escalates to Z3.

### Self-refinement (design pattern, cited not novel)
Steal **Logic-LM's** loop (MIT): feed solver error / `unknown` back to the translator to repair the formalization. Cited as prior art in the README.

---

## 7. MCP tools

`@modelcontextprotocol/sdk ^1.20.0`, `registerTool` with `outputSchema` + `structuredContent`, stdio, all tools **stateless**. Mirrors the house `palette-oklch` convention. **Default formalization path is one-call** (Claude formalizes *in-context* via the skill, then calls the deterministic `check_*` tools) — the two-call "instruction object" protocol is **rejected** (MCP `sampling` is unsupported in Claude Code/Desktop; an unenforced re-call convention is fragile and a careless agent treats the instruction as the answer).

| Tool | One-line schema |
|---|---|
| `check_validity` | `(premises: Formula[], conclusion: Formula, logic, escalate?) → { verdict: Verdict, proof? \| counterModel?, method, solverArtifact? }` |
| `check_consistency` | `(formulas: Formula[], escalate?) → { status: SAT\|UNSAT\|UNKNOWN, model? \| minimalConflictingSubset?, method }` |
| `classify_formula` | `(formula: Formula) → { kind: tautology\|contradiction\|contingent\|vacuous, witness? }` |
| `verify_smtlib` | `(script: string) → { result: sat\|unsat\|unknown, model?, unsatCore? }` — thin `z3-solver` passthrough: the audit/escape hatch (~30 LoC) |
| `render_proof` | `(checkResult, format: text\|svg\|mermaid) → { artifact: string }` (data, not pixels) |
| `enumerate_repo_docs` | `(repoPath: string) → { manifest: { uri, included, role, reason }[] }` (Tier-4 selection step; server reads FS, local-only) |
| `formalize_claim` | `(text, context?, formalization?) → LogicReport-needs OR validated/normalized IR` — **validation/normalization helper only**, never a blocking precondition |
| `evaluate_sentence` / `evaluate_text` / `evaluate_repo` | `(target, formalization) → LogicReport` — named for clear affordances + cost expectations; thin scope-wrappers over one core `evaluate(claimSet)`; if `formalization` absent, return a "formalization needed" schema rather than guessing |

Every `evaluate_*` and `check_validity` result is **refused by schema** unless it carries a non-empty symbol dictionary. `verify_smtlib` is exposed *alongside* the high-level tools (per the adversarial verdict: don't "hide" Z3 — adding the low-level escape is nearly free and the high-level tools already surface their emitted SMT-LIB, so there is no leak-with-no-exit). The differentiator is the **formalize methodology**, not the abstraction level.

---

## 8. Visualizations

`@entailer/viz` consumes typed **view-models** (engine emits JSON, zero render deps). Dual-target from one model: `toSVG/toHTML` (Node, no browser — for CLI/Markdown reports) and React components (web). Static path: hand-emitted SVG with **fixed monospace glyph metrics** (DejaVu Sans Mono, embedded data-URI — exact widths for linear logic notation, **2D typeset math is out of MVP scope**), `elkjs`/`dagre` for layout, `@viz-js/viz` (Graphviz WASM, headless) for the repo graph, KaTeX `renderToString` for HTML reports. Interactive web path: `@xyflow/react`. **Mermaid is rejected as a runtime dep** (Puppeteer/Chrome); offered only as an optional `toMermaid()` string.

| # | View | Data contract (sketch) | Certificate it shows |
|---|---|---|---|
| 1 | **TruthTableView** | `{ vars, rows: {assignment, columns, isCounterexample}[], formulaTeX, verdict }` | falsifying row ⇒ invalid |
| 2 | **TableauTreeView** | `{ nodes: {id, labelUnicode, rule?, closedBy?}[], edges, openBranches: id[][], positions, verdict }` | closed tableau ⇒ valid; open branch ⇒ counter-model |
| 3 | **CounterModelView** | `{ domain?, assignment, satisfies: id[], falsifies: id, provenance }` | the model that breaks the argument ⇒ invalid |
| 4 | **ClaimGraphView** | `{ nodes: {id, claimText, source:'path:line', formalTeX, supplied:bool, confidence}[], edges:{from,to,kind:'entails'\|'depends'\|'conflicts'}[], minimalConflictingSubset?: id[] }` | unsat-core spanning files ⇒ inconsistent (the repo "contradiction heatmap" is just a styling mode = node fill by conflict-participation) |

**Hard renderer invariant (the validity-certificate discipline, ref 04/13):** a view colors something VALID only if a proof/UNSAT certificate object is present, INVALID only if a witnessed (finite) counter-model is present; **"bounded search, inconclusive" / "no finite witness" renders as an explicit inconclusive state, never as VALID.** Nodes carry structured provenance (`literal | supplied | llm-recovered | ambiguous`) + a legend, so the picture cannot launder an LLM guess into a logical guarantee. View-models are stamped with the **formalization content-hash + model id + temperature** so the render is deterministic given a frozen formalization (layout uses a pinned seed / deterministic algorithm). *The moat is the verdict-gating contract in the core, not the pixels — proof-viz toys exist (tpg/umsu, Mace4, Nitpick), so we compete on the five-tier escalation + packaging, not on the render alone.*

---

## 9. Output / result schema

Canonical store = an ergonomic, hand-authored **`LogicReport`** in `@entailer/core`. **SARIF 2.1.0 is a lossless serializer target, not the canonical form** (`toSarif(report)` via `@types/sarif` + `node-sarif-builder` for VS Code / GitHub code-scanning). The verdict-trichotomy and 4-tier severity *do* fit SARIF faithfully — `level` (error/warning/note/none) + the orthogonal `kind` axis (fail/pass/open/review, where UNKNOWN→`open`, INCONSISTENT→`fail`+ruleId) + numeric `rank` for severity — but Tier-1/2 (no file) reports are **validator-grade, not GitHub-grade** (logical-only locations are dropped by code-scanning), so SARIF emission is gated per-tier and the README documents the limit.

```ts
type Verdict =
  | 'VALID' | 'INVALID' | 'INCONSISTENT' | 'GAP' | 'UNKNOWN' | 'NO_ISSUE_FOUND';
type Severity = 'blocker' | 'major' | 'minor' | 'note';

interface LogicReport {
  target: { tier: 1|2|3|4; uri?: string };
  verdict: Verdict;                                  // headline (worst-case rollup for tiers 3-4)
  // validity ≠ truth ≠ faithfulness — THREE independent fields, never merged:
  validity:    { status: Verdict; method: string; proof?: Derivation; counterModel?: CounterModel };
  consistency: { status: 'SAT'|'UNSAT'|'UNKNOWN'; model?: Model;
                 minimalConflictingSubset?: ClaimRef[] };   // serialized as "noContradictionFound" when clean
  soundnessRisk: { note: string }[];                 // per-premise: vouchable | empirical-out-of-scope | supplied-and-contested. NEVER a boolean "sound".

  symbolDictionary: { symbol: string; gloss: string }[];     // REQUIRED non-empty or the report fails schema validation
  formalization: {                                            // VALID/INVALID ⇒ must be present
    id: string; source: SourceSpan[] | null;                 // null/[] ⇒ rendered "[supplied/derived]"
    english: string; formal: string;
    role: 'premise'|'premise-supplied'|'conclusion';
    logicSystem: 'PL'|'FOL'|'HOL'|'dependent-type-theory'|'generalized-quantifier'|`flagged-${'modal'|'deontic'|'temporal'|'probabilistic'}`;  // HOL/DTT escalate to a proof assistant; generalized-quantifier is flag-only (refs 21/22)
    translationConfidence: { band: 'low'|'med'|'high'; score: number };
  }[];

  flattened: { text: string; kind: 'modal'|'deontic'|'temporal'|'probabilistic'|'causal'|'vague'|'higher-order'|'generalized-quantifier'|'ambiguous-reading' }[];
  verdictConfidence: { band: 'high'|'low'; reason: string };  // HIGH iff a proof/counter-model exists; drops on solver unknown/timeout
  findings: { severity: Severity; location: SourceSpan|null; name: string; signature: string; why: string }[];
  selectionManifest?: { uri: string; included: boolean; role: string; reason: string }[];  // Tier 4
  coverageCaveat?: string;                                    // Tier 4: "verdict holds over N selected docs; M excluded; selection is heuristic"
  solverArtifact?: { smtlib: string; result: 'sat'|'unsat'|'unknown'; unsatCore?: string };
  honestyContract: string;                                    // REQUIRED — ref-99 disclosure verbatim
}
```

Dishonesty is made **unrepresentable**: no `formalization` ⇒ no VALID/INVALID; INVALID ⇒ `counterModel` required; INCONSISTENT ⇒ `minimalConflictingSubset` required; clean consistency serializes as `noContradictionFound` (never "proven consistent"); low `translationConfidence` forces `verdict: UNKNOWN`; flagged-modal/deontic content sets `logicSystem` to the flagged variant and is excluded from binary verdicts. CI schema-validates the corpus so a dishonest report literally fails tests.

---

## 10. Eval & regression strategy

Split the suite at the **formalize boundary**.

- **Deterministic verifier — HARD golden + property tests** (fast, free, fully deterministic): soundness property (a VALID verdict *must* carry a derivation or unsat-core); PL agreement with an exhaustive truth-table oracle; **explosion guard** (an INCONSISTENT premise set never yields a VALID-informative verdict — consistency is checked first); **vacuity flag** (unsatisfiable antecedent ⇒ flagged vacuous, not silently VALID); the invariant **no path emits INVALID without an attached counter-model**.
- **LLM formalization step — structural-equivalence scoring, never exact-match** (faithful encodings vary): run candidate *and* golden formalization through the **same deterministic checker** and assert agreement on validity + consistency — but **over a battery of probe-claims per symbol set**, not one fixture (a coarse atom can match on one probe and fail another); bucket Z3 `unknown` / quantified-timeout as a third **INDETERMINATE — human review** state (never pass/fail); score **symbol-dictionary / `[supplied]` / ambiguity recall**; assert the **low-confidence ⇒ UNKNOWN** behavior. Logical-equivalence is reported as "equivalent *under its symbol dictionary*," never as "faithful" — it is one signal, necessary-not-sufficient. Run this layer as an **opt-in, model-pinned (temperature 0)** eval, gated behind the cheap deterministic checks (promptfoo-style preflight).
- **Translation-confidence** is a **multi-signal ensemble feeding an abstention gate**, never LLM self-report (documented as badly calibrated): k-sample forward-formalization *disagreement* + back-translation with a *different* model (defeats symmetric round-trip masking) + a structural-checklist round-trip (quantifier scope, necessary/sufficient direction, dropped domain restriction) + deterministic IR-lint red-flags. The UNKNOWN threshold is **tuned on a labeled dev set via the risk-coverage curve** (conformal abstention for a coverage guarantee), exposed as per-tier config, and the flood-/miss-rates are published.
- **Corpus.** Anchor = ref-09's **A/B/C** as fully hand-certified expected `LogicReport` objects (A valid modus-ponens, B affirming-the-consequent + counter-model `W=F,L=T`, C inconsistent health-check spec + minimal subset `{R1,R2,R3}`). Extend tier-by-tier: **T1** sentences incl. a vacuous conditional + a flagged-deontic "shall"; **T2** a prompt with an embedded fallacy + a benign prompt (**false-positive guard** — must NOT manufacture a fallacy); **T3** a multi-claim spec `.md` asserting `path:line`; **T4** a tiny multi-doc repo where README contradicts SPEC (cross-file inconsistency + per-file locations + rollup). Plus explicit **negative/clean fixtures** to pin the false-positive rate. **FOLIO/ProofWriter** run in `benchmarks/` (dev-only CI lane, may host the Python Logic-LM/LINC baselines) and the translation-fidelity score is **published** — credibility currency in this space.

---

## 11. MVP scope (v0.1) vs later

**v0.1 — Tier-1 end-to-end across core + CLI, with the IR/adapter seam built for the ladder.**
1. `@entailer/core`: Formula AST + ASCII/Unicode DSL parser; the `FormalizedArgument`/`ClaimSet` IR (Zod + JSON Schema); native propositional **tableau + DPLL**; refutation driver; **classification** (tautology/contingent/contradiction); IR lint pass; `LogicReport` type + `toMarkdown`.
2. Tier-1 **sentence** source-adapter (degenerate ClaimSet of 1) + the three-check classification mode.
3. `@entailer/cli` (`entailer`): formalization supplied as input (rule-based/JSON), `--json`/`--sarif`, exit codes incl. a distinct UNKNOWN-blocked code.
4. The ref-09 **A/B/C golden fixtures** + deterministic property tests green; schema-validation CI gate.
5. Taxonomy codegen + drift gate; vendored `formalize` skill + one-way sync script.

**v0.2 — Tier 2 + the LLM seam + MCP.** `@entailer/translate` (LLM-in-the-loop, isolated); conclusion recovery + `[supplied]` enthymemes + argument validity; `@entailer/mcp` (the `check_*` + `evaluate_sentence/text` tools, one-call default); structural-equivalence eval lane.

**v0.3 — Tier 3 + viz MVP.** mdast adapter (remark-parse, code-fence strip, `path:line`); `@entailer/solver` (Z3 out-of-process, opt-in); within-doc consistency; `@entailer/viz` views 1–4 static SVG; `evaluate_text`.

**v0.4 — Tier 4.** Selection manifest (glob allowlist + LLM tail), predicate canonicalization, clustered cross-file consistency + residual synonymy pass, coverage caveats, repo ClaimGraph; `evaluate_repo`; public sibling split + ADRs.

**Explicit NON-goals / scope cuts (from the verification):**
- **No standalone Tier-1/2 single-sentence demo as the headline** — that surface *is* a TS NL2FOL re-implementation and the "distinct niche" charge is unanswerable there. **Lead every README/demo with a Tier-3/4 inconsistent-spec example** (NL2FOL structurally cannot produce a cross-file minimal conflicting subset).
- **No "soundness checking"** in any copy — core does validity + consistency + satisfiability; premise truth is out of scope for *every* component.
- **No full-FOL completeness promise** — guarantee only the decidable fragments (propositional now; monadic/EPR later). Quantified/full-FOL input is best-effort via Z3 quantifier instantiation and may return `unknown`; **`unknown`/timeout is a first-class UNKNOWN, never INVALID.**
- **No 2D typeset math** in the viz MVP (linear Unicode notation only).
- **No `tau-prolog` / `logic-solver` in core**; no in-browser Z3 by default (Node/MCP only; viz consumes solver *output*).
- **No two-call MCP "formalize-then-verify" protocol** (sampling unsupported; fragile). Formalization happens in-skill, in-context.
- **No Mermaid runtime dep; no Turborepo remote cache on day one** (local + `actions/cache`); LLM-eval tasks are explicitly uncached.
- **No native FOL theorem prover ported to JS** (none exists, maintained); full-FOL resolution, if ever needed, is an optional out-of-process binary, clearly marked unavailable when absent.
- **Public-split disclosure is a business-scope CEO call** logged as an ADR; vendoring is one-way (workshop → public).

---

## 12. Open risks

1. **PROP-vs-FOL corpus ratio is unmeasured.** If real Tier-3/4 arguments are overwhelmingly quantified, the native path returns UNKNOWN constantly and value collapses onto Z3 (re-introducing the browser-header tax for any client-side solving). *Track via a one-week corpus probe before committing the native-only browser story; ship the decidable-FOL native target only if PROP+monadic+EPR ≥ ~70% of formalizable units.*
2. **Translation faithfulness is the irreducible weak link.** ~1-in-5 formalizations carry a wrong predicate/quantifier even on clean inputs (NL2FOL 78–80%), and the deterministic core cannot detect a confident-but-wrong IR (hallucinated/unsourced premises especially). The verdict is *always* conditional on the displayed formalization; never a standalone badge, never an auto-CI gate at Tier 3/4 (those ship as "assisted review", not pass/fail), no numeric repo "soundness score."
3. **Tier-4 selection error is invisible to the engine** — a dropped load-bearing doc yields a confident verdict over an incomplete ClaimSet and can *invert* an INCONSISTENT result. Mitigated by high-recall selection + the mandatory coverage caveat + deterministic always-include globs, but recall is empirically ~67–84% (requirement-extraction proxy), so it stays a tracked residual.
4. **Cross-file synonymy can hide a real contradiction** if canonicalization mis-merges or misses an alias; the residual-synonymy pass raises the floor but offers no completeness guarantee — reported as "checked within canonical clusters", never a clean "consistent".
5. **Z3-WASM operational surface** — worker-thread leak, single-threaded serialization, large payload, `unknown` on quantifiers. Contained by out-of-process short-lived workers + hard timeouts + lazy guarded init, but it is a heavy dep the team owns.
6. **The viz moat is thin and time-limited** — proof/counter-model rendering is commodity; durability comes from the five-tier escalation + packaging + the core's verdict-gating contract, not the pixels.
7. **Differentiation is back-loaded** — it is invisible unless Tier-3/4 and cross-claim consistency are *actually built and demoed*; if they slip, the "reinventing NL2FOL" criticism lands. Front-load the Tier-3/4 inconsistent-spec demo to neutralize this.

---
