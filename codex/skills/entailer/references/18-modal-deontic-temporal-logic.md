# 18 — Modal, deontic, and temporal logic

The escalation path for the operators classical FOL (`03`) silently flattens — *must,
could, necessarily* (modal), *shall, may, is required to* (deontic), *always,
eventually, until* (temporal). `06`/`99` told you to **flag, not force** these into
plain `→`. This file says how to formalize them when you do escalate, and how to give
a **labelled** classical approximation when you don't. Two disciplines run through it:

> **□(P→Q) is not P→□Q**, and **"shall" is not material implication** — encoding
> either naively manufactures valid-looking guarantees that the real logic denies.

## Modal logic: □/◇ and possible worlds

Add two unary operators to propositional/first-order logic: **□φ** ("necessarily φ")
and **◇φ** ("possibly φ"), interdefinable by **◇φ ≡ ¬□¬φ** (possible = not necessarily
not). They are **not truth-functional**: the truth of □φ is *not* fixed by the truth of
φ. You need more structure than a truth table.

**Kripke (possible-world) semantics.** A **frame** is a set `W` of *possible worlds*
plus an **accessibility relation** `R ⊆ W × W` ("`w` can see `w′`"). A **model** adds a
valuation fixing which atoms hold at each world. The clauses:
- `M, w ⊨ □φ` iff for **every** `w′` with `wRw′`, `M, w′ ⊨ φ` (φ holds at all accessible worlds).
- `M, w ⊨ ◇φ` iff for **some** `w′` with `wRw′`, `M, w′ ⊨ φ`.

□ is a restricted **∀** over accessible worlds, ◇ a restricted **∃** — the same
quantifier traps from `03` reappear (scope, order). **Validity** is truth at every
world of every frame in the chosen class; a **counter-model** is one world in one frame
where premises hold and the conclusion fails (`13`).

## The K/T/S4/S5 hierarchy

The **normal** modal logics are built from base **K** by adding axioms; each axiom
**corresponds** to a constraint on `R` (Sahlqvist correspondence). What you assume
about `R` is exactly what you're entitled to infer.

| System | Adds axiom | `R` constraint | What it buys / reads as |
|--------|-----------|----------------|--------------------------|
| **K** | `□(P→Q) → (□P→□Q)` (the K schema) + necessitation | none | bare normal modal logic; **no** `□φ→φ` |
| **T** | **T**: `□φ → φ` | reflexive | the necessary is actual; *alethic/epistemic* truth (knowledge implies truth) |
| **K4** | **4**: `□φ → □□φ` | transitive | necessity iterates; "known" ⇒ "known to be known" |
| **S4** | T + 4 | reflexive + transitive (preorder) | provability / topological necessity |
| **B** | **B**: `φ → □◇φ` | symmetric | what's actual is necessarily possible |
| **S5** | T + 4 + **5**: `◇φ → □◇φ` | equivalence relation (reflexive+transitive+symmetric) | accessibility collapses; □/◇ become "true in all/some worlds" simpliciter — classic *logical* necessity |

The practical lever: **state which system you're in**, because the same argument can be
valid in S5 and invalid in K. Epistemic readings ("knows") usually want S4/S5; metaphysical
necessity often S5; deontic logic (below) is a **non-T** system on purpose.

## The modal scope fallacy — □(P→Q), P ⊬ □Q

The single highest-yield modal error, and the explanation owed to `07`'s entry. The K
schema gives `□(P→Q) → (□P → □Q)` — to discharge it you need **□P**, the *necessity* of
the antecedent. From the **bare, contingent** `P` you get only `Q` (by ordinary modus
ponens at the actual world), **never `□Q`**.

- **Counter-model.** Worlds `w, w′` with `wRw′`. Let `P→Q` hold at both, `P` true at `w`,
  but `Q` false at `w′`. Then `□(P→Q)` and `P` hold at `w`, yet `□Q` fails (because `Q`
  fails at the accessible `w′`). Premises true, conclusion false ⇒ **invalid**.
- **The slogan.** Necessity of the *consequence* (`□(P→Q)`) is not necessity of the
  *consequent* (`□Q`). "If he's a bachelor he's *necessarily* unmarried" conflates
  `□(B→U)` (true) with `B→□U` (false — he could have married).
- **De dicto vs de re.** `□∃x φ(x)` ("necessarily someone…") ≠ `∃x □φ(x)` ("someone is
  necessarily…") — the modal cousin of the quantifier-shift fallacy (`03`/`07`).

This is *the* reason "must" in prose can't be dropped into a truth table: flatten □ away
and the fallacy becomes invisible. Matches `07`'s **Modal scope fallacy** row.

## Deontic logic: O/P/F

The logic of **obligation**, **permission**, **prohibition** — von Wright's operators,
formally a modal logic where □ reads *ought*.

| Op | Reads | Definition | English |
|----|-------|-----------|---------|
| **O**φ | obligatory that φ | (primitive) | "shall", "must", "is required to" |
| **P**φ | permitted that φ | `Pφ ≡ ¬O¬φ` | "may", "is allowed to" |
| **F**φ | forbidden that φ | `Fφ ≡ O¬φ ≡ ¬Pφ` | "must not", "shall not" |

The duality **Pφ ≡ ¬O¬φ** is the deontic mirror of `◇ ≡ ¬□¬` — get it backwards and
"may" silently becomes "must."

**Standard Deontic Logic (SDL) = KD**: the normal system K plus axiom **D**: `Oφ → Pφ`
(equivalently `Oφ → ¬O¬φ` — you can't have an obligation *and* its prohibition),
corresponding to **serial** frames. The load-bearing point for specs:

> **SDL deliberately omits T.** `Oφ → φ` is **false** — obligations are routinely
> *violated*. An "ought" does not entail an "is." The whole reason deontic logic exists
> is that the actual world need not be a deontically ideal one.

So deontic O behaves like □ over *ideal* accessible worlds, **without** the reflexive
collapse that would make every obligation already fulfilled.

## Why naive deontic encoding is dangerous

The trap: reading "if X then the system shall do Y" as the material conditional `X → Y`,
or even `X → OY`, and reasoning classically. Two canonical paradoxes show why:

- **Ross's paradox** (Alf Ross, 1941). SDL inherits monotonicity from K: `Oφ ⊢ O(φ∨ψ)`.
  So "the letter **ought** to be mailed" entails "the letter ought to be **mailed or
  burned**" — which, via the duality, leaks a *permission* to burn it. Disjunction-
  introduction under O produces obligations no drafter intended. **Cue:** any encoding
  where `O` distributes over `∨` lets you derive permissions the spec never granted.
- **Chisholm's contrary-to-duty paradox** (Roderick Chisholm, 1963). Four sentences that
  are plainly *consistent and independent* in English: (a) you ought to help your
  neighbor; (b) it ought to be that *if* you help, you announce it; (c) *if* you do not
  help, you ought *not* announce; (d) you do not help. SDL renders them either
  **inconsistent** or **mutually dependent** — there is no faithful monadic-O encoding.
  The culprit is the **contrary-to-duty obligation** (c): what you must do *once a
  primary obligation is already violated*.

This is not academic. "**On breach**, the party **shall** notify within 30 days";
"**if** validation **fails**, the system **must** log and halt" — these are CTD
structures: a secondary duty triggered by violation of a primary one. Encode them as
plain `breach → notify` and the logic both (i) goes vacuously true whenever there is no
breach (`10`) and (ii) cannot represent that the breach was itself forbidden. **Flag
every "on failure / on breach / otherwise" obligation as contrary-to-duty** and refuse
the material-implication shortcut.

## Temporal logic: LTL + a CTL sketch

When claims are about *behavior over time* — "always", "eventually", "until" — escalate
to temporal logic (the natural home of the operators FOL can't express, `13`). **Linear
Temporal Logic (LTL)** evaluates a formula over a single linear trace `π = s₀ s₁ s₂ …`:

| Operator | House notation | Reads | Semantics (at position `i`) |
|----------|----------------|-------|------------------------------|
| **G**φ | □φ (globally) | always φ | φ holds at all `j ≥ i` |
| **F**φ | ◇φ (eventually) | φ holds at some point | φ holds at some `j ≥ i` |
| **X**φ | ○φ (next) | φ in the next state | φ holds at `i+1` |
| φ **U** ψ | (until) | φ holds until ψ — and ψ *does* occur | ∃ `k ≥ i` with ψ at `k`, and φ at every `i ≤ j < k` |

`□`/`◇` deliberately reuse the modal glyphs — temporal logic *is* modal logic with `R` =
"later than." The `U` row is the **strong** until: ψ is *guaranteed* to hold eventually
(it carries an `F` obligation inside it), which is exactly the trap weak "unless" misses
(below). Two property shapes recur in specs: **safety** ("nothing bad ever happens,"
`□¬bad`) and **liveness** ("something good eventually happens," `◇good`). A *response*
pattern such as `□(req → ◇ack)` ("every request is eventually served") is a liveness
property.

**CTL (Computation Tree Logic)** is *branching* time: it quantifies over the tree of
possible futures. Every temporal operator is immediately prefixed by a **path
quantifier** — **A** (on all paths) or **E** (on some path): `AG` (invariant on every
path), `EF` (reachable on some path), `AF` (inevitable), `EG` (some path avoids forever).
`AG(req → AF ack)` = on every run, every request is inevitably acknowledged. LTL and CTL
are incomparable fragments of **CTL\***; pick LTL for trace properties, CTL when
reachability/branching matters.

This connects directly to **TLA+** (`08`) — Lamport's `[]`/`<>` are `□`/`◇`, and TLC
model-checks temporal properties producing a concrete violating trace (`15`).

## Translation traps

- **"must" is three-ways ambiguous.** *Epistemic* ("the package must be late" = `□`
  given what I know — S4/S5), *deontic* ("you must sign" = `O`), *alethic* ("7 must be
  prime" = metaphysical `□`). Picking the wrong one changes the whole logic. **Disambiguate before formalizing**; if the text won't fix it, show both readings (`06`).
- **"shall" in legal/spec drafting.** Convention: "shall" = `O` (mandatory), "may" = `P`,
  "shall not"/"must not" = `F`. But drafters misuse "shall" for future tense and for mere
  description. Treat each "shall" as a candidate obligation and check for the CTD trap.
- **"always / eventually / until" → LTL**, not FOL quantifiers over a time variable —
  and watch the until: "A until B" usually means B *does* occur (strong until, as in the
  table); "A unless B" may be weak (B optional). Flag which.
- **Don't flatten □/O/temporal into `→`** (`06`/`99`): the material conditional erases the
  operator and with it the modal-scope and CTD fallacies.

## Escalate vs. give a defensible approximation

| Situation | Move |
|-----------|------|
| Validity *rides on* the operator (scope of □, O over ∨, a CTD clause, a liveness claim) | **Escalate** to the right logic; a classical approximation will give the wrong verdict |
| Operator is present but *inert* to the inference being checked | Give a **classical approximation** and **say so** — "treating `O`/`□` as a flat atom; valid only if the modal force is inessential here" |
| Mixed spec, only some clauses temporal/deontic | Verify the classical core; **flag** the modal/deontic/temporal clauses as out of scope for the binary verdict (`99`) |

State the choice explicitly. A silent classical approximation of a modal argument is an
undisclosed assumption that can flip the verdict. (If the report wants a dedicated band
for "approximated under a labelled modal assumption," **propose adding it** to `09` —
the current `09` schema does not yet list one.)

**Decidability / tooling.** Propositional modal logics are **decidable** — by Ladner,
validity for the logics **between K and S4** (K, T, B, S4) is **PSPACE-complete**, and
only **S5** drops to **NP-complete** (the gap is caused by negative introspection,
axiom 5); SDL likewise decidable. **LTL satisfiability is PSPACE-complete**, and
**LTL/CTL model checking** against a finite-state model is the practical workhorse
(SPIN, NuSMV, TLA+/TLC — `08`). So unlike full FOL (`14`), these often admit a
push-button check — but the encoding carries the same translation risk as any solver
step (`99`): show the formalization.

## Sources

- SEP: *Modal Logic* (Garson), *Deontic Logic* (McNamara & Van De Putte), temporal-logic
  entries — plato.stanford.edu/entries/logic-modal, /entries/logic-deontic,
  /entries/logic-temporal (anchor: /entries/logic-modal).
- Internet Encyclopedia of Philosophy: *Modal Logic: A Contemporary View* (Garson) —
  iep.utm.edu/modal-logic (verify slug; the SEP entry above is the canonical anchor).
- S. Kripke, "Semantical Considerations on Modal Logic," *Acta Philosophica Fennica* 16
  (1963); C. I. Lewis (S1–S5).
- A. Ross, "Imperatives and Logic," *Theoria* 7 (1941) — Ross's paradox.
- R. Chisholm, "Contrary-to-Duty Imperatives and Deontic Logic," *Analysis* 24, no. 2
  (1963), pp. 33–36.
- G. H. von Wright, "Deontic Logic," *Mind* 60 (1951).
- R. E. Ladner, "The Computational Complexity of Provability in Systems of Modal
  Propositional Logic," *SIAM J. Comput.* 6 (1977) — K/T/B/S4 PSPACE-complete, S5 NP.
- A. Pnueli, "The Temporal Logic of Programs" (1977) — LTL; E. M. Clarke & E. A. Emerson,
  "Design and Synthesis of Synchronization Skeletons Using Branching Time Temporal
  Logic" (1981) — CTL.
- *Linear temporal logic* — en.wikipedia.org/wiki/Linear_temporal_logic (operator semantics).
- L. Lamport, *Specifying Systems* (TLA+); see `08`/`15`.
