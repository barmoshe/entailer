# 03 — Predicate / first-order logic (FOL)

When validity depends on *objects, properties, relations, quantity, or identity*,
propositional logic (`02`) is too coarse and you formalize in **first-order logic**.
This is the working logic of mathematics and the target of most autoformalization
(see `06` and the NL2FOL pipeline).

## Syntax

**Vocabulary (signature):**
- **Variables**: `x, y, z, …` — range over the domain of discourse.
- **Constants**: `a, b, c, socrates, 0` — name specific objects.
- **Predicates** (relations) with an arity: `P(x)` (unary, a property),
  `Loves(x, y)` (binary, a relation), `Between(x, y, z)`. A 0-ary predicate is a
  propositional atom.
- **Functions** with an arity: `f(x)`, `succ(x)`, `x + y` (return objects).
- **Equality**: `=` (a built-in binary predicate in FOL *with identity*).
- **Connectives**: as in `02` (`¬ ∧ ∨ → ↔`).
- **Quantifiers**: `∀` ("for all", universal), `∃` ("there exists", existential).

**Terms**: variables, constants, and functions applied to terms.
**Atomic formula**: a predicate applied to terms (`Mortal(socrates)`, `x = f(y)`).
**Formulas**: atomic formulas closed under connectives and quantification
(`∀x φ`, `∃x φ`).

## Binding, scope, free vs. bound

- A quantifier `∀x` / `∃x` **binds** the variable `x` within its **scope** (the
  formula immediately following).
- A variable occurrence is **bound** if inside the scope of a quantifier on that
  variable, else **free**.
- A **sentence** (closed formula) has no free variables — only sentences have a
  determinate truth value in a model. Formalized claims should be sentences.
- **Scope matters enormously**: `∀x ∃y Loves(x, y)` ("everyone loves someone")
  ≠ `∃y ∀x Loves(x, y)` ("someone is loved by everyone"). Quantifier *order* is a
  top source of formalization error — see "quantifier scope" in `06`.

## Semantics — models

A **model (structure)** `M = ⟨D, I⟩` is:
- a non-empty **domain** `D` of objects, and
- an **interpretation** `I` mapping each constant to an element of `D`, each
  `n`-ary predicate to a set of `n`-tuples over `D`, each function to an operation
  on `D`.

Truth is defined relative to a model (and a variable assignment for free
variables):
- `∀x φ` is true in `M` iff `φ` is true for **every** assignment of an element of
  `D` to `x`.
- `∃x φ` is true in `M` iff `φ` is true for **at least one** such assignment.

`Γ ⊨ φ` (semantic entailment) iff every model of all of `Γ` is a model of `φ`.
A **counter-model** — a structure making the premises true and conclusion false —
is the proof of invalidity (the FOL analogue of a counter-valuation row).

## The four canonical translation patterns (memorize these)

Quantifiers pair with a *characteristic connective*. The two most common are:

| English | FOL | Note |
|---------|-----|------|
| **All** A are B | `∀x (A(x) → B(x))` | universal pairs with **→** |
| **Some** A are B | `∃x (A(x) ∧ B(x))` | existential pairs with **∧** |
| **No** A are B | `∀x (A(x) → ¬B(x))` | = `¬∃x (A(x) ∧ B(x))` |
| **Not all** A are B | `¬∀x (A(x) → B(x))` | = `∃x (A(x) ∧ ¬B(x))` |

**The single most common FOL mistake**: writing "All A are B" as
`∀x (A(x) ∧ B(x))` — that says *everything in the domain is both A and B*, far too
strong. Universals take `→`. Dually, "Some A are B" as `∃x (A(x) → B(x))` is too
weak (true whenever anything fails to be A). Existentials take `∧`. Burn this in.

More patterns:

| English | FOL |
|---------|-----|
| Only A are B | `∀x (B(x) → A(x))` |
| A unless B | `∀x (¬B(x) → A(x))` (i.e. `A ∨ B`) |
| Exactly one A | `∃x (A(x) ∧ ∀y (A(y) → y = x))` |
| At least two A | `∃x ∃y (A(x) ∧ A(y) ∧ x ≠ y)` |
| The A is B (definite) | `∃x (A(x) ∧ ∀y(A(y) → y=x) ∧ B(x))` (Russell) |
| No one but A B's | `∀x (Bs(x) → A(x))` |

## Equality and identity

FOL *with identity* adds `=` with axioms: reflexivity `∀x (x = x)` and substitution
(Leibniz) `x = y → (φ(x) ↔ φ(y))`. Needed for counting ("exactly", "only", "the"),
uniqueness claims, and any argument turning on whether two names denote the same
object. Watch for **equivocation** masquerading as identity (`07`).

## Negation pushing (De Morgan for quantifiers)

- `¬∀x φ ≡ ∃x ¬φ`
- `¬∃x φ ≡ ∀x ¬φ`

So "not everyone passed" = "someone didn't pass"; "nobody passed" = "everyone
didn't pass". Useful for normalizing before checking and for catching scope errors
when a claim is negated.

## Prenex normal form

Every FOL formula is equivalent to one with all quantifiers pulled to the front
(a quantifier **prefix**) over a quantifier-free **matrix**: e.g.
`∀x ∃y ∀z [ … ]`. Useful for analysis and as a step toward Skolemization (for
resolution, `04`). When pulling quantifiers out, rename to avoid capture and mind
that moving a quantifier across `¬`/`→` flips `∀↔∃`.

## Higher-order and sorted variants (know the boundary)

- **First-order**: quantify over *objects* only. This is our default — it has a
  complete proof system (`05`).
- **Second-/higher-order**: quantify over *predicates/sets* ("∀P …"). More
  expressive (categorical arithmetic) but **no complete recursive proof system**.
  Avoid unless the claim genuinely quantifies over properties.
- **Many-sorted FOL**: typed domains (numbers vs. people). Convenient for specs;
  reducible to one-sorted FOL with sort predicates.

## Decidability — the crucial caveat

- Propositional logic: **decidable** (`02`).
- **Full FOL validity is undecidable** (Church–Turing, 1936) but **semi-decidable**:
  if `Γ ⊨ φ`, a complete proof procedure will *eventually* find the proof; if not,
  it may run forever. So a found derivation certifies validity, but failure to find
  one in bounded effort does **not** certify invalidity — you need a counter-model
  for that.
- **Useful decidable fragments**: monadic FOL (unary predicates only), the
  Bernays–Schönfinkel `∃*∀*` prefix class, many description logics. SMT solvers
  (`08`) decide rich *quantifier-free* theories efficiently.

**Operational rule for the skill**: to show **invalid**, exhibit a finite
counter-model. To show **valid**, give a derivation (`04`) or hand it to a solver.
Never report "invalid" merely because you failed to find a proof.
