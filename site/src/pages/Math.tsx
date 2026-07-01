import { Link } from "../router.js";
import { SCENARIOS } from "../data/scenarios.js";
import { ScenarioView } from "../components/ScenarioView.js";
import { TableauView } from "../components/TableauView.js";
import { TruthTableCard } from "../components/TruthTableCard.js";

const specScenario = SCENARIOS.find((s) => s.id === "spec")!;

const TOC: { id: string; label: string }[] = [
  { id: "prop", label: "Propositional logic" },
  { id: "refutation", label: "Validity by refutation" },
  { id: "tableau", label: "The semantic tableau" },
  { id: "dpll", label: "DPLL & SAT" },
  { id: "oracle", label: "The truth-table oracle" },
  { id: "consistency", label: "Consistency & minimal cores" },
  { id: "triad", label: "Validity ≠ truth ≠ faithfulness" },
  { id: "fragment", label: "Decidability & UNKNOWN" },
  { id: "metalogic", label: "Soundness, completeness, Gödel" },
];

export function Math() {
  return (
    <main className="wrap page">
      <div className="page-head">
        <div className="eyebrow">how it works</div>
        <h1 className="page-title">The mathematics</h1>
        <p className="page-lede">
          Entailer's verdicts are not heuristics or model outputs — they are decisions of{" "}
          <b>classical propositional logic</b>, computed by decision procedures that are proven correct
          against an exhaustive oracle. This page walks the theory, and every box below is a{" "}
          <em>live</em> computation by the published <code>@entailer/core</code>, running in your browser.
        </p>
      </div>

      <nav className="doc-toc" aria-label="On this page">
        {TOC.map((t) => (
          <a key={t.id} href={`#/math#${t.id}`}>{t.label}</a>
        ))}
      </nav>

      {/* 1 — Propositional logic & connectives */}
      <section id="prop" className="doc-section">
        <div className="section-head"><span className="n">01</span><h2>Propositional logic</h2></div>
        <p className="section-lede">
          The native language is <b>classical propositional logic</b>: atoms (<code>p</code>, <code>q</code>,
          …) that are each either true or false, combined with five connectives. A formula's meaning is fixed
          entirely by the truth values of its atoms — it is <em>truth-functional</em>.
        </p>
        <div className="doc-table">
          <table>
            <thead><tr><th>Connective</th><th>DSL</th><th>True exactly when</th></tr></thead>
            <tbody>
              <tr><td>negation ¬</td><td><code>~p</code></td><td><code>p</code> is false</td></tr>
              <tr><td>conjunction ∧</td><td><code>p &amp; q</code></td><td>both hold</td></tr>
              <tr><td>disjunction ∨</td><td><code>p | q</code></td><td>at least one holds (inclusive)</td></tr>
              <tr><td>implication →</td><td><code>p -&gt; q</code></td><td>not (<code>p</code> true and <code>q</code> false)</td></tr>
              <tr><td>biconditional ↔</td><td><code>p &lt;-&gt; q</code></td><td><code>p</code> and <code>q</code> match</td></tr>
            </tbody>
          </table>
        </div>
        <p className="section-lede">
          Because meaning is truth-functional, a formula's entire behavior fits in a finite table. Edit the
          formula and watch the oracle recompute it:
        </p>
        <TruthTableCard initial="p -> q" />
        <p className="hint">
          Note the material implication: <code>p -&gt; q</code> is <em>true</em> whenever <code>p</code> is
          false. That single row is the source of "vacuous" guarantees — see{" "}
          <a href="#/math#triad">the triad</a>.
        </p>
      </section>

      {/* 2 — Validity by refutation */}
      <section id="refutation" className="doc-section">
        <div className="section-head"><span className="n">02</span><h2>Validity by refutation</h2></div>
        <p className="section-lede">
          An argument is <b>valid</b> when the conclusion holds in every case that makes all premises true —
          written <code>Γ ⊨ φ</code>. Checking every case directly is expensive, so entailer uses the
          <em> refutation</em> idiom, the cornerstone of the whole engine:
        </p>
        <p className="formula-callout"><code>Γ ⊨ φ&nbsp;&nbsp;⟺&nbsp;&nbsp;Γ ∪ {"{"}¬φ{"}"} is unsatisfiable</code></p>
        <p className="section-lede">
          Assume every premise <em>and the negation of the conclusion</em>, then search for a single
          consistent case. If none exists, the argument is valid — and the failed search <em>is</em> the
          proof. If one exists, that case is a concrete counterexample. Here is the real engine doing it on
          a valid argument:
        </p>
        <TableauView
          premises={["deployed -> passed", "~passed"]}
          conclusion="~deployed"
          glosses={[
            { symbol: "deployed", gloss: "the build was deployed" },
            { symbol: "passed", gloss: "the tests passed" },
          ]}
        />
        <p className="section-lede" style={{ marginTop: 24 }}>
          And on an argument that only <em>looks</em> valid — affirming the consequent. The refutation
          succeeds: there is an open case, which becomes the counter-model.
        </p>
        <TableauView
          premises={["admin -> del", "del"]}
          conclusion="admin"
          glosses={[
            { symbol: "admin", gloss: "Dana is an admin" },
            { symbol: "del", gloss: "Dana can delete records" },
          ]}
        />
        <p className="hint">More of these live in the <Link to="showcase">Showcase</Link>.</p>
      </section>

      {/* 3 — Semantic tableau */}
      <section id="tableau" className="doc-section">
        <div className="section-head"><span className="n">03</span><h2>The semantic tableau</h2></div>
        <p className="section-lede">
          The search above is a <b>semantic (analytic) tableau</b>. It repeatedly breaks formulas down with
          two kinds of rule until each branch either contradicts itself or runs out of work.
        </p>
        <div className="split">
          <div className="split-card">
            <h4>α-rules — extend</h4>
            <p>Non-branching: both parts must hold, so add them to the same branch.</p>
            <ul className="doc-list">
              <li><code>p &amp; q</code> → add <code>p</code>, add <code>q</code></li>
              <li><code>~(p | q)</code> → add <code>~p</code>, <code>~q</code></li>
              <li><code>~(p -&gt; q)</code> → add <code>p</code>, <code>~q</code></li>
              <li><code>~~p</code> → add <code>p</code></li>
            </ul>
          </div>
          <div className="split-card">
            <h4>β-rules — branch</h4>
            <p>Branching: alternatives, so split the branch in two and explore each.</p>
            <ul className="doc-list">
              <li><code>p | q</code> → <code>p</code> | <code>q</code></li>
              <li><code>p -&gt; q</code> → <code>~p</code> | <code>q</code></li>
              <li><code>~(p &amp; q)</code> → <code>~p</code> | <code>~q</code></li>
              <li><code>p &lt;-&gt; q</code> → {"{"}<code>p,q</code>{"}"} | {"{"}<code>~p,~q</code>{"}"}</li>
            </ul>
          </div>
        </div>
        <p className="section-lede">
          A branch <b>closes</b> (<code>✕</code>) when it carries some literal and its negation (or ⊥).
          Every branch closed ⇒ the set is unsatisfiable ⇒ (in the refutation setup) the argument is valid,
          and the closed tree is the certificate. A branch that saturates while still open <em>is</em> a
          satisfying assignment — the counter-model. That is exactly what the proof trees in §02 show.
        </p>
      </section>

      {/* 4 — DPLL */}
      <section id="dpll" className="doc-section">
        <div className="section-head"><span className="n">04</span><h2>DPLL &amp; SAT</h2></div>
        <p className="section-lede">
          Satisfiability sits under everything here, and the tableau is one way to decide it. The core also
          carries a classic <b>DPLL</b> SAT procedure as an independent decision path:
        </p>
        <ul className="doc-list">
          <li><b>Tseitin encoding</b> — rewrite the formula into CNF (a conjunction of clauses) with one fresh variable per connective, so the encoding grows linearly rather than exploding.</li>
          <li><b>Unit propagation</b> — a clause down to its last unassigned literal forces that literal; cascade the consequences.</li>
          <li><b>Pure-literal elimination</b> — a variable that only ever appears with one polarity can be set to satisfy every clause it touches.</li>
          <li><b>Branch &amp; backtrack</b> — guess a remaining variable, recurse, and undo on conflict.</li>
        </ul>
        <p className="hint">
          Two independent procedures deciding the same question is not redundancy — it is the cross-check that
          makes the answer trustworthy. See the oracle next.
        </p>
      </section>

      {/* 5 — Truth-table oracle */}
      <section id="oracle" className="doc-section">
        <div className="section-head"><span className="n">05</span><h2>The truth-table oracle</h2></div>
        <p className="section-lede">
          How do we know the tableau and DPLL are <em>right</em>? Because both are checked against an
          exhaustive <b>truth-table oracle</b> — enumerate all 2<sup>n</sup> assignments and evaluate
          directly. The oracle is obviously correct (if slow), so it is the ground truth a property test
          holds the fast procedures to before anything trusts them.
        </p>
        <p className="section-lede">
          <b>Correctness is the product.</b> A wrong VALID is worse than no tool at all, so every
          verification path is validated against the oracle before it ships. You can drive the oracle
          yourself — a formula with no false row is a tautology; a false row is a counter-model:
        </p>
        <TruthTableCard initial="(p -> q) & p -> q" />
      </section>

      {/* 6 — Consistency & minimal conflicting subset */}
      <section id="consistency" className="doc-section">
        <div className="section-head"><span className="n">06</span><h2>Consistency &amp; minimal cores</h2></div>
        <p className="section-lede">
          A set of requirements is <b>consistent</b> when some single assignment satisfies them all. When it
          is not, entailer does more than say "no" — it computes a <em>minimal conflicting subset</em>: the
          smallest group of claims that already cannot all hold, by deletion-minimization (drop a claim; if
          the rest is still unsatisfiable, that claim was not needed). The finiteness that makes this
          well-defined is the compactness of propositional logic.
        </p>
        <div className="pg">
          <ScenarioView scenario={specScenario} />
        </div>
        <p className="hint">
          The highlighted claims are the minimal core. Removing or weakening any one of them makes the spec
          satisfiable again — that is the actionable output a style linter cannot produce.
        </p>
      </section>

      {/* 7 — The triad */}
      <section id="triad" className="doc-section">
        <div className="section-head"><span className="n">07</span><h2>Validity ≠ truth ≠ faithfulness</h2></div>
        <p className="section-lede">
          The single distinction the whole tool exists to protect — three independent questions that are
          never collapsed into one score:
        </p>
        <div className="discipline">
          <div>
            <h4>validity / consistency</h4>
            <p>What the deterministic core licenses. Sound by construction, reproducible, certificate-backed. This is the only thing entailer claims.</p>
          </div>
          <div>
            <h4>faithful formalization</h4>
            <p>Does the formula capture the English? Attestable only by a human or model. It is the weak link, so it is <em>always shown</em> — a verdict with no symbol dictionary cannot ship.</p>
          </div>
          <div>
            <h4>premise truth</h4>
            <p>Are the premises actually true of the world? Out of scope, on purpose. A valid argument can rest on false premises.</p>
          </div>
        </div>
        <p className="hint">
          The vacuous case makes this concrete: <code>(on &amp; ~on) -&gt; cache</code> is <em>valid</em>
          (true in every row, because its antecedent never holds) yet guarantees nothing. Entailer flags the
          vacuity instead of laundering it into an assurance.
        </p>
      </section>

      {/* 8 — Decidability & UNKNOWN */}
      <section id="fragment" className="doc-section">
        <div className="section-head"><span className="n">08</span><h2>Decidability &amp; UNKNOWN</h2></div>
        <p className="section-lede">
          Propositional validity is <b>decidable</b>: a terminating procedure always answers. That is why the
          core lives there. But real prose reaches past it — quantifiers, necessity/possibility (modal),
          obligation/permission ("shall/may", deontic), "always/eventually" (temporal), "most/few"
          (generalized quantifiers). Those fragments are either undecidable or simply out of the core's scope.
        </p>
        <p className="section-lede">
          Entailer's rule: <b>right-size the logic, and never guess.</b> Non-propositional input returns a
          first-class <code>UNKNOWN</code> — never a silent VALID or INVALID. Out-of-fragment content is
          flagged, not flattened. (Opt-in Z3/SMT escalation, in <code>@entailer/solver</code>, can amplify
          this reach, but it is an amplifier, never a gate.)
        </p>
      </section>

      {/* 9 — Metalogic */}
      <section id="metalogic" className="doc-section">
        <div className="section-head"><span className="n">09</span><h2>Soundness, completeness, Gödel</h2></div>
        <p className="section-lede">
          Two properties make the propositional procedures trustworthy. <b>Soundness</b>: every VALID the
          engine derives really is valid (<code>Γ ⊢ φ ⇒ Γ ⊨ φ</code>). <b>Completeness</b>: every valid
          argument can be derived (<code>Γ ⊨ φ ⇒ Γ ⊢ φ</code>). For propositional logic both hold, and the
          oracle cross-check is the practical guarantee.
        </p>
        <p className="section-lede">
          The honesty discipline is Gödel's lesson in miniature: <b>truth outruns provability</b>. "Does not
          follow" is not "is false"; "no contradiction found under this formalization" is not "proven
          consistent forever". Entailer reports the witnessed fact and stops — it never self-certifies more
          than its certificate licenses.
        </p>
        <p className="hint">
          The full pipeline and references are in{" "}
          <a href="https://github.com/barmoshe/entailer/blob/main/DESIGN.md">DESIGN.md</a>. Ready to use it?
          Head to the <Link to="docs">Docs</Link>.
        </p>
      </section>
    </main>
  );
}
