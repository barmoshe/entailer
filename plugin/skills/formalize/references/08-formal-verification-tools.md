# 08 — Formal-verification tooling (optional escalation)

When hand-checking won't scale — large premise sets, arithmetic, many interacting
constraints — emit input for a machine. **Optional and opt-in**: the base verdict
(`09`) must stand without any of these. Only escalate when the tool is installed
and the entailment is big enough to warrant it. Re-verify versions/flags at use
time; this churns.

## Decision guide

| You have… | Reach for | Why |
|-----------|-----------|-----|
| Quantifier-free constraints over bools, ints, reals, arrays, bitvectors | **SMT (Z3)** | Decidable theories, push-button, returns a model or UNSAT |
| Pure boolean satisfiability (CNF) | **SAT solver** (MiniSat, CaDiCaL) | Fastest for the propositional case |
| A real theorem / proof to certify with quantifiers & induction | **Proof assistant** (Lean 4, Rocq, Isabelle) | Machine-checked, expressive; needs human guidance |
| Concurrent/stateful system, temporal properties | **TLA+ / TLC**, or a model checker | Explores reachable states; finds invariant violations |
| Temporal logic properties of a finite-state model | **Model checker** (SPIN, NuSMV) | LTL/CTL checking |

## SMT and the SMT-LIB format (the workhorse escalation)

**Z3** (Microsoft Research) is the default. It decides satisfiability modulo
theories — pure logic plus arithmetic, equality, arrays, bitvectors, etc. The
standard input is **SMT-LIB 2**. The move maps directly onto our method: to check
`Γ ⊨ φ`, assert `Γ` **and `¬φ`** and ask `(check-sat)`:
- **`unsat`** ⇒ no model makes premises true and conclusion false ⇒ **valid**.
- **`sat`** ⇒ there *is* such a model ⇒ **invalid**, and `(get-model)` prints the
  **counter-model** (exactly the witness the report wants).
- For **consistency** of a spec: assert all requirements and `(check-sat)`; `sat`
  + `(get-model)` = consistent with a witnessing model, `unsat` = contradictory
  (use `(get-unsat-core)` for the **minimal conflicting subset**).

Skeleton (modus-ponens validity check):
```smt2
(declare-const P Bool)
(declare-const Q Bool)
(assert (=> P Q))          ; premise
(assert P)                 ; premise
(assert (not Q))           ; negated conclusion
(check-sat)                ; unsat  => the argument is valid
```
Arithmetic example (are these requirements consistent?):
```smt2
(declare-const timeout Int)
(assert (> timeout 0))
(assert (< timeout 5))
(assert (>= timeout 10))   ; conflicts with the above
(check-sat)                ; unsat
(get-unsat-core)           ; (needs :produce-unsat-cores + named asserts)
```
Quantifiers are allowed (`forall`/`exists`) but may make Z3 incomplete (it can
return `unknown`); prefer quantifier-free encodings when you can.

## Proof assistants (when you need a machine-checked theorem)

Heavier: interactive, you write the proof and the kernel checks it. Use for
genuine mathematical claims, not routine argument-vetting.

- **Lean 4** — dependent type theory; large maths library **Mathlib**; strong recent
  momentum in formalized mathematics and AI-assisted proving.
- **Rocq** (formerly **Coq**, renamed *The Rocq Prover* with v9.0, March 2025) —
  dependent types (CIC); libraries incl. Mathematical Components; long pedigree in
  verified software (CompCert).
- **Isabelle/HOL** — higher-order logic; powerful **Sledgehammer** automation; the
  **Archive of Formal Proofs** (AFP). Often the most automation-friendly.

For the skill: at most emit a **proof sketch / theorem statement** in one of these
and note that full certification is a separate effort. Don't attempt a full Lean/Rocq
proof inline unless the user asks and the tool is present.

## TLA+ and model checking (for stateful/temporal specs)

- **TLA+** (Lamport) specifies state machines and **temporal** properties; **TLC**
  model-checks them and produces a concrete error trace on violation. The right tool
  when a spec is about *behavior over time / concurrency*, which classical FOL (`03`)
  can't natively express.
- **SPIN** (Promela), **NuSMV** — finite-state LTL/CTL model checking.

## Boundary rule

The base path of this skill is **logic + hand/tableau checking** (`02`–`04`). A
solver is an *amplifier*, not a *dependency*: keep the SMT/proof-assistant step
behind a clean optional boundary, always show the hand-formalization too, and never
gate the verdict on a tool the environment may not have. When you do use a solver,
**show the emitted input and the solver's verdict** so the result is reproducible.

## Sources / pointers

- Z3 & SMT-LIB 2 standard — smt-lib.org; Z3 guide.
- Lean / Mathlib — leanprover-community; Rocq Prover 9.0 release notes
  (rocq-prover.org); Isabelle AFP — isa-afp.org.
- TLA+ — lamport.azurewebsites.net/tla.
