# 11 — Kant's philosophy of mathematics

*Immanuel Kant* (1724–1804) was a **philosopher**, not a working mathematician — but
his account of *what mathematical knowledge is* is the backdrop against which
logicism, formalism (`01`), and intuitionism all defined themselves. Knowing it
sharpens the skill's central distinction (validity-by-form vs. content) and explains
*why* a purely formal pass is powerful yet incomplete. Grounded in the Stanford
Encyclopedia (Kant's views on space and time) and the *Critique of Pure Reason*.

## The analytic / synthetic and a priori / a posteriori grid

Kant crossed two distinctions, and his thesis about math lives in one cell.

- **Analytic** judgment: the predicate is contained in the concept of the subject —
  true by meaning alone ("all bachelors are unmarried"). Denying it is a
  contradiction. Uninformative about the world.
- **Synthetic** judgment: the predicate adds something not contained in the subject —
  genuinely informative ("the table is brown").
- **A priori**: knowable independently of experience; necessary and universal.
- **A posteriori**: knowable only through experience; contingent.

The easy cells are *analytic a priori* (logic, definitions) and *synthetic a
posteriori* (empirical facts). Kant's famous, contested claim:

> **Mathematics is synthetic a priori.**

Both **informative** (synthetic — it extends knowledge, isn't mere definition-
unpacking) **and** **necessary/universal** (a priori — not learned by counting
pebbles). His stock example: `7 + 5 = 12`. The concept of "the sum of 7 and 5" does
not, Kant argues, *contain* the concept "12"; you must go beyond the concepts —
*construct* the sum in intuition — to reach it. Geometry likewise: "the straight
line is the shortest between two points" adds (synthetic) yet holds necessarily.

## Pure intuition: space and time

How can a judgment be both informative and known prior to all experience? Kant's
answer: mathematics is grounded in the **pure forms of intuition** —
- **space** is the a priori form of *outer* sense → the ground of **geometry**;
- **time** is the a priori form of *inner* sense → the ground of **arithmetic**
  (number as successive synthesis in time).

Space and time are not concepts abstracted from experience and not features of
things-in-themselves; they are the mind's built-in framework that any possible
experience must conform to. So mathematics, read off these forms, is **necessarily
true of everything we can experience** — but, for the same reason, we get **no
guarantee it describes reality "in itself,"** independent of our perception.

## Construction in intuition

Kant's signature move: mathematics proceeds by **constructing** its concepts in pure
intuition, not by analyzing them. To prove a geometric theorem you *exhibit* a figure
(in pure intuition) and reason about the construction; arithmetic *enacts* counting.
Mathematical knowledge is knowledge by construction — a stance that echoes forward
into **intuitionism** and **constructive mathematics**.

## Why this matters to the skill

Kant frames the exact gap the plugin must respect between **form** and **content**:

| Kant's category | The skill's analogue |
|-----------------|----------------------|
| **Analytic** (true by form/meaning, denial is contradiction) | **Validity / tautology** — what the formal check decides (`02`,`04`,`10`) |
| **Synthetic** (adds content; needs more than concepts) | **Premise truth / soundness** — what logic alone *cannot* settle (`05`,`99`) |
| Synthetic **a priori** (informative *and* necessary) | the contested middle: a formal pass alone will treat substantive math/spec content as either already-true premises or out of scope — flag it, don't pretend to derive it |

Three operational reminders Kant sharpens:
1. **Analytic ≠ informative.** A conclusion that follows *analytically* (a tautology,
   or a premise restated) carries no new content — exactly the "valid but vacuous"
   trap (`10`). The plugin must not sell analytic validity as substantive truth.
2. **Synthetic content needs grounds outside the form.** When an argument's force
   depends on a *synthetic* claim ("this algorithm is O(n log n)", "this requirement
   reflects the regulation"), the validity check can't supply it — surface it as a
   premise-truth obligation, not a derivation.
3. **The whole formalist program (`01`) is in part a reaction to Kant.** Frege and the
   logicists tried to show arithmetic is *analytic* after all (reducible to logic);
   Hilbert's formalism and Brouwer's intuitionism are two further responses. The
   debate is precisely about how much of mathematics is form vs. construction vs.
   content — the same axis this skill walks every time it separates *validity* from
   *truth*.

## One honest caveat

Kant held *Euclidean* geometry to be synthetic a priori and necessary. The advent of
**non-Euclidean geometry** and general relativity is the classic counterexample
cited against him: space turned out not to be necessarily Euclidean. The lesson the
skill inherits: a framework that *feels* necessary and self-evident can still fail to
match the world — so "follows necessarily from the premises" is never the same as
"true of the domain." (Mirrors `05`/`99`.)

## Sources

- Kant, *Critique of Pure Reason* (1781/1787), esp. the Transcendental Aesthetic;
  *Prolegomena* (1783).
- Stanford Encyclopedia of Philosophy: *Kant's Views on Space and Time* —
  https://plato.stanford.edu/entries/kant-spacetime/
