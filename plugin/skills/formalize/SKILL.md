---
name: formalize
description: Use when checking whether an argument actually *follows* — evaluating the mathematical-logical soundness of a prompt, a Markdown doc, a spec, a proof, or a repo by formalizing its claims (translating prose into propositional/first-order logic) and testing validity, consistency, and named reasoning errors. Formalize in-context (no API key needed — you are the model), then run the deterministic Entailer checker (MCP tools or the CLI) for the verdict. Deep detail lives in references/ (formalism philosophy, propositional & first-order logic, proof systems, model theory, metalogic, computability limits, set-theory foundations, NL→logic translation, a fallacy catalog, vacuity/contradiction detection, verification tooling, the eval rubric, plus non-deductive reasoning, defeasible/argumentation theory, modal/deontic/temporal logic, probabilistic/fuzzy reasoning, causal & counterfactual reasoning, formal semantics, and type theory). Triggers on "is this argument valid / sound", "does this conclusion follow", "check the logic of this", "find the contradiction in this spec", "formalize this", "are these requirements consistent", "is this inductive / abductive / causal claim justified", "logic / fallacy review", or any ask to rigorously vet reasoning in text.
license: MIT
---

# formalize

Give a text the pass a logician would: make its hidden formal structure explicit,
then check whether the conclusion **follows**. The stance is **formalist** (Hilbert):
soundness is decided by manipulating symbols under explicit rules, not by appeal to
intuition or how persuasive the prose sounds. See `references/01-formalism-philosophy.md`
for *why* that stance, and why it has limits (Gödel).

## How this works (and why it needs no API key)

Entailer splits the job in two, and this plugin runs both halves for free inside your
editor session:

1. **You formalize in-context.** Translating prose into a symbol dictionary and
   logic-DSL is the untrusted proposer step. You (the model) already do it here, in
   this session. **No `ANTHROPIC_API_KEY`, no `@entailer/translate`, no network call.**
2. **The deterministic core verifies.** Whether the conclusion follows and whether the
   claim set is consistent is decided by a reproducible verifier, not by the model.
   You call it through the `entailer` MCP tools (or the `@entailer/cli`) below.

Keep the central contract visible in every answer: **validity is not truth**,
**consistency is not truth**, and **a faithful formalization is a separate claim that
must be shown**. Never collapse them. (`references/05-...md`.)

## The procedure (this is what you execute)

Run the full rubric in `references/09-evaluation-rubric.md`. The short shape:

1. **Scope the target.** A sentence, an argument, a prompt, a `.md`/spec, a repo, or a
   PR. For a repo or PR, formalize the load-bearing docs (README, specs, design docs,
   proofs, requirement lists), not the code line by line.
2. **Extract** the load-bearing claims and the intended conclusion(s). Leave rhetoric,
   examples, and color alone: only claims that do argumentative work.
3. **Recover hidden premises** (enthymemes). Most real arguments omit a premise; surface
   it explicitly and mark it *supplied*, not stated. (`references/06-...md`.)
4. **Formalize.** Build a **symbol dictionary** (each atom/predicate → its English gloss,
   e.g. `p = the deploy succeeded`), then translate each claim into propositional
   (`references/02`) or first-order (`references/03`) logic. Pick the weakest logic that
   captures the structure. Flag any genuinely ambiguous sentence instead of silently
   choosing one reading. **First decide the inference is even deductive:** if it is
   inductive/abductive/defeasible, grade it via `references/16`/`17` instead of forcing a
   binary verdict; if it carries modal/deontic/temporal/probabilistic/causal content,
   route to `references/18`/`19`/`20` rather than flattening it into FOL.
5. **Run a real Entailer check** (the deterministic step, always). Prefer the `entailer`
   MCP tools when the server is available; otherwise shell out to `npx -y @entailer/cli`.
   See the two sections below. Do not eyeball the verdict: let the core decide.
6. **Report** using the schema in `references/09`. Show the symbol dictionary, the
   formalization, and the proof or counter-model. If the reading is ambiguous or out of
   fragment, say **UNKNOWN** and explain what would decide it.

## Run the check via MCP tools (preferred)

When the `entailer` MCP server is connected (declared in [`../../.mcp.json`](../../.mcp.json)
as `npx -y @entailer/mcp`), call its deterministic tools instead of reasoning to a verdict:

- `check_validity(premises: string[], conclusion: string)` and
  `check_consistency(formulas: string[])` — the raw logic-DSL checks.
- `classify_formula(formula: string)` — tautology / contradiction / contingent / vacuous.
- `evaluate_sentence`, `evaluate_argument`, `evaluate_prompt`, `evaluate_markdown`,
  `evaluate_repo`, `evaluate_pull_request` — the tiered evaluators that return a full
  `LogicReport` (schema-refused unless it carries a symbol dictionary).
- `evaluate_domain` — the concept-faithfulness lens.

DSL operators: `~` not, `&` and, `|` or, `->` implies, `<->` iff. Atoms are
`[A-Za-z][A-Za-z0-9_]*`.

## Run the check via the CLI (fallback)

Every check is also a key-less CLI call. Use `--json` for machine-readable output. Exit
codes are honest: `0` clean/valid, `1` invalid/inconsistent, `2` malformed, `3` UNKNOWN.

```bash
npx -y @entailer/cli sentence "p -> p" --json
npx -y @entailer/cli prompt --file prompt.json --json
npx -y @entailer/cli markdown spec.md --json
npx -y @entailer/cli repo . --json
npx -y @entailer/cli pr --base main --gate introduced --json
```

A `prompt.json` is a formalized claim set (the in-context work, made explicit):

```json
{
  "claims": [
    { "dsl": "p", "text": "the deploy succeeded" },
    { "dsl": "p -> q", "text": "if the deploy succeeded, the release is live" },
    { "dsl": "q", "text": "therefore the release is live" }
  ],
  "symbols": [
    { "symbol": "p", "gloss": "the deploy succeeded" },
    { "symbol": "q", "gloss": "the release is live" }
  ]
}
```

For Markdown/spec/repo tiers, put the formalization in fenced `entailer` blocks with `let`
dictionary lines plus formulas, then run `markdown` / `repo`:

````markdown
```entailer
let req = a request exists
let logged = the request is logged
let health = health-check request
req -> logged
health -> ~logged
health & req
```
````

## The non-negotiable discipline

- **Always show the work.** Print the symbol dictionary and the formal translation. A
  verdict with no visible formalization is not auditable and must not ship.
- **Let the core decide, don't guess the verdict.** The model is a good translator and a
  poor verifier; the whole point is to hand the decided step to the deterministic checker.
- **Flag, don't guess, ambiguity.** If "donkeys have ears" could be universal or generic,
  show both formalizations. (`references/06`.)
- **Separate "invalid" from "false."** Reporting invalid is a claim about *form*; you are
  not asserting the conclusion is false.
- **Separate "consistent" from "true."** SAT means no contradiction surfaced in the
  formalized set, not that the claims are true.
- **Do not turn low translation confidence into a decisive verdict.** Return UNKNOWN and
  say what would be needed to decide.
- **Right-size the logic.** Propositional first; first-order only when quantifiers/relations
  do real work; a solver only when hand-checking won't scale.

## Routing to the references

| Need | Read |
|------|------|
| Why the formalist stance, and its limits | `references/01-formalism-philosophy.md` |
| Connectives, truth tables, validity, normal forms | `references/02-propositional-logic.md` |
| Quantifiers, predicates, FOL syntax/semantics, translation patterns | `references/03-predicate-first-order-logic.md` |
| Does it follow? (derivation or counter-model) | `references/04-proof-systems.md` |
| What a "valid" verdict guarantees; incompleteness | `references/05-soundness-completeness-metalogic.md` |
| The English→logic procedure, hidden premises, ambiguity | `references/06-formalization-nl-to-logic.md` |
| Naming the error | `references/07-fallacies-and-reasoning-errors.md` |
| Hand it to a machine | `references/08-formal-verification-tools.md` |
| The end-to-end rubric + report schema (run this) | `references/09-evaluation-rubric.md` |
| Vacuous truth, contradiction-explosion, tautology, triviality | `references/10-vacuity-contradiction-tautology.md` |
| Kant: synthetic a priori, form vs. content (the backdrop) | `references/11-kant-philosophy-of-mathematics.md` |
| Set theory & foundations (the ambient ontology + the crisis) | `references/12-set-theory-foundations.md` |
| Model theory: structures, satisfaction, counter-models | `references/13-model-theory.md` |
| Computability & complexity: what no checker can promise | `references/14-computability-and-complexity.md` |
| Applications: verification, SQL-as-FOL, Prolog/Datalog, OWL | `references/15-applications-cs.md` |
| Beyond deduction: inductive, abductive, inference-to-best-explanation | `references/16-non-deductive-reasoning.md` |
| Defeasible / non-monotonic reasoning, defeaters, Toulmin & Dung argumentation | `references/17-defeasible-reasoning-and-argumentation.md` |
| Modal (□/◇), deontic (O/P/F — specs & contracts), temporal (LTL/CTL) | `references/18-modal-deontic-temporal-logic.md` |
| Probabilistic & fuzzy reasoning, Bayes, base-rate/conjunction errors, vagueness | `references/19-probabilistic-and-fuzzy-reasoning.md` |
| Causal & counterfactual reasoning: Pearl's ladder, correlation ≠ causation | `references/20-causal-and-counterfactual-reasoning.md` |
| Formal semantics of NL (Montague, generalized quantifiers, DRT), controlled NL | `references/21-formal-semantics-and-controlled-nl.md` |
| Type theory, Curry–Howard (proofs-as-programs), HOL, lambda calculus | `references/22-type-theory-and-curry-howard.md` |
| Where this method lies to you | `references/99-caveats.md` |

## Worked examples to hold the skill to

A **valid** argument (clean derivation), an **invalid-but-plausible** one (affirming the
consequent, with a counter-model), and an **inconsistent spec** (a requirement set whose
conjunction is unsatisfiable, with the minimal conflicting subset identified). Full
write-ups in `references/09`.
