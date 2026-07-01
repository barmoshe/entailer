# 01 — Formalism in the philosophy of mathematics

*Why this skill checks symbols under rules rather than appealing to intuition —
and why that method has a hard ceiling (Gödel).* Grounded in the Stanford
Encyclopedia of Philosophy entry "Formalism in the Philosophy of Mathematics" and
the classic Hilbert/Frege/Curry literature.

## The core thesis

**Formalism** holds that mathematics is fundamentally about the manipulation of
**symbols according to explicit rules**, rather than about a realm of abstract
objects (Platonism) or mental constructions (intuitionism). On the strongest
reading, mathematical statements are not *about* anything beyond the formal system;
their "truth" is **derivability within a system**. The signless intuition behind
the skill: *to check an argument, you don't need to know what the symbols "really"
mean — you need to know the rules and whether the conclusion is reachable under
them.*

This is exactly the leverage a machine (or a disciplined agent) has over informal
prose: strip the rhetoric, fix the rules, and ask whether the conclusion is
*derivable*. Persuasiveness is not derivability.

## Three strands of formalism

### 1. Term formalism and game formalism (Heine & Thomae)

The earliest formalism, associated with **Eduard Heine** and **Johannes Thomae**
(19th c.), and the target of Frege's critique in *Grundgesetze der Arithmetik*
vol. II.

- **Term formalism**: mathematical statements are *about* the symbols themselves;
  numerals (`7`, `√2`) are the objects of arithmetic, not names of abstract
  numbers. Math is a syntax of terms.
- **Game formalism**: mathematics is a *game* played with marks on paper according
  to stipulated rules, like chess. The symbols have no meaning at all; what matters
  is only that the rules are followed. ("The arithmetic game" — Thomae.)

**Frege's three criticisms** (still the canonical objections):
1. **Applicability.** If math is a meaningless game, *why is it useful*? Chess does
   not predict bridge loads. Game formalism cannot explain why arithmetic applies
   to the world.
2. **Theory vs. metatheory confusion.** Formalists conflate the formal *theory*
   (the marks) with statements *about* the theory (the rules, which are themselves
   meaningful). The rules of the game are contentful even if the pieces are not.
3. **Infinite sequences / real numbers.** A pure syntax of finite terms cannot
   account for the infinite (e.g. the reals) without smuggling in meaning.

*Takeaway for the skill:* game formalism is too strong as a philosophy of all
math, but its **method** — fix the rules, ignore the "meaning," check the moves —
is precisely the right method for *checking an argument's form*. We borrow the
method without the metaphysics.

### 2. Hilbert's formalism and Hilbert's program

**David Hilbert** is the towering figure. He began as a **deductivist** (axioms
implicitly define their terms; "point", "line" mean whatever satisfies the axioms —
*Foundations of Geometry*, 1899) but his mature view is more subtle than "math is a
meaningless game."

Hilbert divided mathematics into two parts:

- **Real (contentful, finitary) mathematics** — statements about concrete finite
  objects (e.g. `2 + 2 = 4`, decidable numeral computations). These are *meaningful*
  and *secure*.
- **Ideal (infinitary) mathematics** — statements involving completed infinities
  (quantification over all reals, etc.). These are *instruments*: meaningless-in-
  themselves "ideal elements" added to round out the theory, like points at infinity
  in projective geometry.

**Hilbert's Program** (1920s): justify the ideal mathematics by using it freely,
then prove — using only secure **finitary** reasoning — that the whole formal
system is **consistent** (never derives `0 = 1`). If the ideal machinery is
consistent and conservatively extends the real part, its use is legitimate even if
the ideal statements lack content. This launched **metamathematics**: the rigorous
study of *formal systems themselves* as mathematical objects (syntax, proofs,
consistency, completeness become things you prove theorems *about*).

*Takeaway for the skill:* metamathematics is our home turf. We treat a document's
argument as a formal object and prove things *about* it (valid? consistent?). The
real/ideal split also models a useful practical move: separate the **checkable
finite core** of a claim from its **unbounded generalizations**, and be more
confident about the former.

### 3. Curry's formalism

**Haskell Curry** (*Outlines of a Formalist Philosophy of Mathematics*, 1951)
defined mathematics as **"the science of formal systems"**. Unlike game formalism,
Curry's view is not that any *single* system is the game; mathematics studies the
*structure* of formal systems in general. Truth in mathematics is *acceptability*
relative to a system, judged by the system's fruitfulness — not correspondence to
Platonic objects.

## Gödel: the ceiling on the program (and on us)

Hilbert's program in its strongest form was undone by **Kurt Gödel** (1931):

- **First incompleteness theorem.** Any consistent, effectively axiomatized formal
  system strong enough to express elementary arithmetic is **incomplete**: there are
  true arithmetical sentences it can neither prove nor refute.
- **Second incompleteness theorem.** Such a system **cannot prove its own
  consistency** (using only its own means). So the finitary consistency proof
  Hilbert wanted — for a system containing finitary arithmetic — is impossible from
  within.

This did **not** kill formalism or metamathematics; it bounded the *finitary
consistency* ambition. Relative and transfinite consistency proofs (Gentzen's
ε₀-induction proof of the consistency of arithmetic, 1936) survive. But it
permanently establishes that **"derivable in a fixed system" and "true" come
apart**, and that no single mechanical system captures all mathematical truth.

**The honest limit this imposes on the plugin** (carried into `99-caveats.md`):
- "Valid in our formalization" is a claim about a *chosen* system, not an oracle of
  truth. Different reasonable formalizations can disagree.
- We cannot certify the consistency of an arbitrarily rich system from inside it;
  for real specs we look for *witnessed* inconsistency (a derivable contradiction)
  rather than claiming to prove global consistency.
- Some genuinely true claims in a document may be *unprovable from the stated
  premises* — "doesn't follow from what you wrote" is not "false."

## Main objections to formalism (know them; they shape our honesty rules)

- **Frege's applicability problem** (above): meaning has to enter somewhere for math
  to apply to the world.
- **Gödel's incompleteness**: derivability ≠ truth; no complete consistent
  recursive system for arithmetic.
- **The "which game?" problem**: if any consistent system is as good as any other,
  what makes classical analysis better than a contrived alternative? (Curry answers
  with fruitfulness/applicability; pure game formalism cannot.)

## How this stance configures the skill

| Formalist commitment | What the skill does |
|----------------------|---------------------|
| Check the symbols under explicit rules | Translate prose to logic, derive mechanically |
| Theory vs. metatheory are distinct | We reason *about* the argument, not within its subject |
| Derivability ≠ truth (Gödel) | Report validity and premise-truth separately; never claim an oracle |
| Consistency is the security property | For specs, hunt a derivable contradiction; flag unsatisfiable requirement sets |
| Finitary core is the secure part | Prefer the weakest logic; be most confident about checkable finite claims |

## Sources

- Stanford Encyclopedia of Philosophy, *Formalism in the Philosophy of Mathematics*
  — https://plato.stanford.edu/entries/formalism-mathematics/
- Frege, *Grundgesetze der Arithmetik* vol. II (critique of Heine/Thomae).
- Hilbert, "On the Infinite" (1925); Hilbert & Bernays, *Grundlagen der Mathematik*.
- Curry, *Outlines of a Formalist Philosophy of Mathematics* (1951).
- Gödel (1931), incompleteness theorems; Gentzen (1936), consistency of arithmetic.
