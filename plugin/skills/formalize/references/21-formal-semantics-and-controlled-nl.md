# 21 — Formal semantics of natural language and controlled NL

The theory under the translation step (`06`): *how* English maps to logical form,
which constructions resist plain FOL, and when a **controlled** subset of English
buys an unambiguous target. `06` is the procedure; this file is the linguistics that
tells you which moves are safe, which readings exist, and where the translator is
allowed to stop and flag rather than guess.

> **Prime directive: ambiguity is in the sentence, not the reader.** A sentence with
> two scopings has two logical forms; producing one and suppressing the other is an
> undisclosed assumption that can flip the verdict (`06`, `99`). Surface both, run the
> check per reading, and report where they diverge.

## Montague grammar and compositionality

**Richard Montague** (1970–73) argued there is *no principled difference* between
formal and natural languages: English can be given a model-theoretic semantics as
rigorous as that of a logic. The engine is the **principle of compositionality** —
the meaning of a complex expression is a function of the meanings of its parts and
the way they are combined.

- Each syntactic rule pairs with a semantic rule (the **rule-to-rule** hypothesis):
  build the syntax tree, and the logical form is assembled in lockstep.
- Composition is **function application** in the **typed λ-calculus** (`22`): a
  transitive verb is a function awaiting two arguments, a determiner a function from
  a noun-meaning to a quantifier. Lambda abstraction (`22`) is how a sub-phrase holds
  an argument slot open until its sister supplies it.
- Truth conditions are computed against a **model** in the `13` sense; the syntax →
  logical-form → model pipeline is exactly the `06` → `03`/`13` pipeline, just made
  systematic rather than ad hoc.

Why the evaluator cares: a *compositional* translation is **auditable** — each piece
of the formula traces to a phrase, so the symbol dictionary (`06`) can be checked
clause by clause. A non-compositional "gist" translation hides where it cheated.

## Generalized quantifiers — beyond ∀ and ∃

FOL ships two quantifiers. Natural language has a whole class: *most, few, many,
exactly three, at least half, all but two, infinitely many*. A **generalized
quantifier** (Mostowski; **Barwise & Cooper 1981**) treats a determiner as a
relation between two sets over the domain `M`: `Q(A, B)` where `A` is the noun's
extension and `B` the predicate's.

| English | As `Q(A,B)` | FO-definable? |
|---------|-------------|---------------|
| every A is B | `A ⊆ B` | yes — `∀x(A(x)→B(x))` |
| some A is B | `A ∩ B ≠ ∅` | yes — `∃x(A(x)∧B(x))` |
| exactly three A are B | `|A ∩ B| = 3` | yes — finite counting with `=` (`03`) |
| **most** A are B | `|A ∩ B| > |A \ B|` | **no** (see below) |
| an even number of A are B | parity of `|A∩B|` | no |

The canonical Barwise & Cooper form for **most** is `|A ∩ B| > |A \ B|` (the part of
`A` inside `B` outnumbers the part outside it). On a *finite* `A` this is equivalent
to the familiar `|A ∩ B| > |A|/2` ("more than half"); the `|A\B|` form is the primary
definition and the one that generalizes, so prefer it and treat `|A|/2` as the finite
special case (`19` uses the finite gloss).

**Conservativity** (CONSERV) is the near-universal property of natural-language
determiners: `Q(A, B) ⇔ Q(A, A ∩ B)` — only the part of `B` *inside* `A` matters,
so "most ravens are black" ignores non-ravens entirely. A purported determiner that
violates CONSERV (e.g. "only") is a signal it is not really a determiner but a focus
operator — worth flagging when a spec's quantifier behaves oddly.

**Why "most" is not FO-definable.** "Most A are B" asks whether `|A ∩ B| > |A \ B|`
— a *proportional* comparison of cardinalities. On infinite domains this comparison
outruns first-order expressive power, and even restricted to **finite** models it is
not FO-definable: the standard proof is an **Ehrenfeucht–Fraïssé games** argument —
for any quantifier-rank `k`, you build two finite models, one where "most" holds and
one where it fails, that the duplicator wins the `k`-round EF game on, so no rank-`k`
FO sentence separates them. (FO cannot count past a fixed threshold, so it cannot
compare two unbounded counts. Lindström's theorem is a separate result — it
*characterizes* FOL by compactness + Löwenheim–Skolem — not the inexpressibility
proof; don't conflate them.) This is the expressiveness boundary developed in `19`;
the operational upshot here is: **if an argument turns on "most" / "a majority" /
"more than half," plain FOL (`03`) cannot faithfully carry it** — escalate to a logic
with generalized quantifiers, encode a specific finite cardinality bound if the domain
is fixed, or flag the claim as out-of-scope for a binary FO validity verdict (`06`'s
"when plain FOL isn't the target").

## Dynamic semantics and DRT — the donkey problem

`06` exhibits the donkey sentence and gives its faithful universal reading; here is
*why* it is hard and *how* the framework that solves it works.

> *"Every farmer who owns a donkey beats it."*

The trouble: "a donkey" is an indefinite, which static Montague semantics treats as
**existential**. But the pronoun "it" outside the relative clause needs to be bound
by that donkey, and an `∃` trapped in the antecedent of the universal cannot reach
across to bind a variable in the consequent — its scope is too small. Worse, the
intuitively correct reading is **universal** (*every* such donkey gets beaten), so
the existential is the wrong quantifier *and* in the wrong place. Static
compositional semantics has no single tree that delivers it.

**Discourse Representation Theory** (DRT; **Hans Kamp**, 1981; **Irene Heim's**
File Change Semantics, 1982, independently) fixes this by making meaning **dynamic**
— a function from an input context to an output context, not a static truth value:

- Meaning is built as a **Discourse Representation Structure (DRS)**: nested *boxes*
  holding **discourse referents** (the entities introduced) and **conditions** on them.
- An **indefinite introduces a fresh discourse referent** rather than its own
  quantifier; its quantificational force is read off **where the box sits**. In the
  *main* box → existential ("A farmer owns a donkey" = there is one). In the
  *antecedent* of a conditional/universal box → the surrounding universal **unselectively
  binds** it, yielding universal force. That placement rule is exactly what turns
  the donkey's `∃` into the `∀∀…→` of `06`'s faithful translation.
- A pronoun is **accessible** to an antecedent referent iff that referent lives in an
  enclosing or preceding box — formalizing why "it" can pick up "a donkey" here but
  not across other scopes. Anaphora becomes a structural reachability check, not magic.

For the evaluator: when a text leans on **cross-sentence anaphora** or indefinites
whose force depends on embedding, a flat sentence-by-sentence FOL translation (`06`)
can silently get the quantifier wrong. DRT is the diagnosis; the practical move is to
translate the *discourse*, not each sentence in isolation, and to show the
accessibility you assumed.

## Controlled natural language (ACE → FOL)

If ordinary English is irreducibly ambiguous, **controlled natural language (CNL)**
flips the problem: restrict syntax and vocabulary so that *every* admissible sentence
has exactly one logical form. **Attempto Controlled English (ACE)** (University of
Zurich, since 1995) is the mature instance — a precisely defined subset of English
that reads as English but **is** a first-order language.

- The **Attempto Parsing Engine (APE)** parses ACE deterministically into a **DRS**,
  which then translates to FOL (and onward to OWL, SWRL, TPTP for reasoners like RACE).
- ACE *resolves* the ambiguities above by fiat: fixed interpretation rules pick one
  scoping, anaphora resolution follows DRT accessibility, and disallowed constructions
  simply fail to parse. The author trades expressive freedom for a guaranteed unique
  reading.

**The discipline:** CNL is a *recommendation you can offer the author*, never a
rewrite you silently substitute. When a spec's prose is genuinely ambiguous, the
honest move is: report the ambiguity (both readings, `06`), and optionally *propose*
an ACE-style rephrasing that the author can adopt to fix the reading. Rewriting their
requirement into your preferred CNL reading and checking *that* would be checking a
document they never wrote — a faithfulness violation (`99`).

## Argument mining — the front of the pipeline

Before `06` can translate, something must isolate *what* to translate. **Argument
mining** is the NLP task of extracting argumentative structure from prose:

1. **Claim/premise detection** — classify spans as claims, premises, or non-argumentative.
2. **Relation extraction** — link premises to the claims they support or attack.
3. **Structure assembly** — reconstruct the argument graph (which feeds `06` step 1–2:
   identify conclusion, identify premises).

Argument mining is **lossy and fallible** — it is statistical span-labeling, not
logic. Treat its output as a *candidate* parse of the argument to be confirmed, not
ground truth: a mis-attached premise or a missed conclusion silently corrupts every
downstream validity check. The reliable division of labor: mining proposes the
claim/premise graph; the human-auditable, compositional translation of `06` disposes.

## Residual limits (flag, don't fake)

Even with DRT and CNL, classical extensional translation leaves residue — escalate or
flag rather than force (`06`, `99`):

- **Scope ambiguity** — quantifier and operator orderings ("every student read a
  book", negation vs. quantifier). Surface *all* readings; let the verdict branch.
- **Intensionality** — belief, knowledge, "seeks", "necessarily": truth depends on
  more than extension. Substituting co-referring terms can fail ("believes Hesperus
  is bright" ↛ "believes Phosphorus is bright"). Needs modal/intensional logic, not
  plain FOL (`06`'s modal note).
- **Presupposition** — "the king of France", "stopped smoking" carry a backgrounded
  commitment that survives negation. A presupposition failure makes the sentence
  *neither* straightforwardly true nor false; do not silently encode it as an asserted
  premise (cf. Russell's definite-description treatment in `03`, which *asserts*
  uniqueness rather than presupposing it — say which you used).
- **Vagueness / gradability** — "tall", "likely", "soon": no sharp extension; out of
  scope for a binary validity verdict (`06`).

## Sources

- SEP: *Montague Semantics*, *Generalized Quantifiers*, *Discourse Representation
  Theory*, *Compositionality*, *Presupposition*, *Descriptions* — plato.stanford.edu.
- Barwise, J. & Cooper, R. (1981), "Generalized Quantifiers and Natural Language,"
  *Linguistics and Philosophy* 4. Conservativity; "most" as `|A∩B| > |A\B|` and its
  non-FO-definability.
- Kamp, H. (1981) & Kamp, van Genabith, Reyle, "Discourse Representation Theory"
  (Handbook of Philosophical Logic); Heim, I. (1982), File Change Semantics.
- Ebbinghaus & Flum, *Finite Model Theory* — Ehrenfeucht–Fraïssé games and the
  inexpressibility of counting/proportional quantifiers in FO.
- Attempto Controlled English — attempto.ifi.uzh.ch; Fuchs et al., "ACE for Knowledge
  Representation," Reasoning Web 2008 (APE → DRS → FOL).
- Argument mining survey: Lawrence & Reed (2019), *Computational Linguistics* 45(4).
- Cross-refs: `06` (NL→logic procedure, donkey example), `03` (FOL, definite
  descriptions), `13` (models), `19` (FO expressiveness limits / EF games), `99`
  (faithfulness caveats).
