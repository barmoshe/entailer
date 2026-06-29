---
name: formalize
description: Use when checking whether an argument actually *follows* — evaluating the mathematical-logical soundness of a prompt, a Markdown doc, a spec, a proof, or a repo by formalizing its claims (translating prose into propositional/first-order logic) and testing validity, consistency, and named reasoning errors. The workshop's logician's-pass playbook; deep detail lives in references/ (formalism philosophy, propositional & first-order logic, proof systems, model theory, metalogic, computability limits, set-theory foundations, NL→logic translation, a fallacy catalog, vacuity/contradiction detection, verification tooling, the eval rubric, plus non-deductive reasoning, defeasible/argumentation theory, modal/deontic/temporal logic, probabilistic/fuzzy reasoning, causal & counterfactual reasoning, formal semantics, and type theory). Triggers on "is this argument valid / sound", "does this conclusion follow", "check the logic of this", "find the contradiction in this spec", "formalize this", "are these requirements consistent", "is this inductive / abductive / causal claim justified", "logic / fallacy review", or any ask to rigorously vet reasoning in text.
license: MIT
---

# formalize

Give a text the pass a logician would: make its hidden formal structure explicit,
then check whether the conclusion **follows**. The stance is **formalist**
(Hilbert) — soundness is decided by manipulating symbols under explicit rules, not
by appeal to intuition or how persuasive the prose sounds. See
`references/01-formalism-philosophy.md` for *why* that stance, and why it has
limits (Gödel).

## The one distinction that runs through everything

**Validity ≠ truth.** An argument is **valid** when its conclusion is derivable
from its premises (a property of *form*). It is **sound** when it is valid **and**
its premises are actually true (form *plus* matter). The plugin reports these
separately — it is excellent at validity and only as good as its inputs at the
truth of premises. Never collapse the two. (`references/05-...md`.)

## The procedure (this is what you execute)

Run the full rubric in `references/09-evaluation-rubric.md`. The short shape:

1. **Scope the target.** A prompt / a `.md` file / a repo. For a repo, formalize
   the load-bearing docs (README, specs, design docs, proofs, requirement lists),
   not the code line-by-line.
2. **Extract** the load-bearing claims and the intended conclusion(s). Leave
   rhetoric, examples, and color alone — only claims that do argumentative work.
3. **Recover hidden premises** (enthymemes). Most real arguments omit a premise;
   surface it explicitly and mark it as *supplied*, not stated.
   (`references/06-formalization-nl-to-logic.md`.)
4. **Formalize.** Build a **symbol dictionary** (each atom/predicate → its English
   gloss), then translate each claim into propositional (`references/02`) or
   first-order (`references/03`) logic. Pick the weakest logic that captures the
   structure. Flag any sentence whose reading is genuinely ambiguous instead of
   silently choosing one. **First decide the inference is even deductive:** if the
   argument is inductive/abductive/defeasible, classify and grade it via
   `references/16`/`17` instead of forcing a binary validity verdict; if it carries
   modal/deontic/temporal/probabilistic/causal content, route to
   `references/18`/`19`/`20` rather than flattening it into FOL.
5. **Evaluate** three things:
   - **Validity** — does the conclusion follow from the premises? Use the proof
     methods in `references/04-proof-systems.md` (a derivation proves valid; a
     counter-model / countervaluation proves invalid).
   - **Consistency** — is the premise set satisfiable, or does it contain a
     contradiction? (Critical for specs and requirement lists.)
   - **Errors** — run the checklist in `references/07-fallacies-and-reasoning-errors.md`.
6. **(Optional) Escalate to a solver** when the entailment is too large to check by
   hand and a tool is installed — emit SMT-LIB for Z3, or a Lean/Rocq sketch.
   `references/08-formal-verification-tools.md`. Never *require* a solver for the
   base verdict.
7. **Report** using the schema in `references/09`. Every issue cites its source
   location and shows its formalization.

## The non-negotiable discipline

- **Always show the work.** Print the symbol dictionary and the formal translation.
  A verdict with no visible formalization is not auditable and must not ship.
- **Flag, don't guess, ambiguity.** If "donkeys have ears" could be universal or
  generic, say so and show both formalizations — do not pick one silently.
  (Quantifier-scope and donkey-sentence traps: `references/06`.)
- **Separate "invalid" from "false."** Reporting an argument invalid is a claim
  about its *form*; you are not asserting the conclusion is false (it may be true
  for other reasons). Say this explicitly.
- **Right-size the logic.** Propositional first; reach for first-order only when
  quantifiers/relations do real work; reach for a solver only when hand-checking
  won't scale.

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

## Worked examples to build (eval-driven)

Hold the skill to these three shapes (see `references/09` for full write-ups):
a **valid** argument (clean derivation), an **invalid-but-plausible** one
(affirming the consequent, with a counter-model), and an **inconsistent spec**
(requirement set whose conjunction is unsatisfiable, with the minimal conflicting
subset identified).
