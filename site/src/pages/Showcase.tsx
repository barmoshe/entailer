import { ParseError } from "@entailer/core";
import { Link } from "../router.js";
import { FALLACIES, VALID_FORMS, type Analysis, type Scenario } from "../data/scenarios.js";
import { analyze } from "../lib/analyze.js";
import { Artifact } from "../components/Artifact.js";
import { Certificate } from "../components/Certificate.js";
import { VerdictBadge } from "../components/VerdictBadge.js";

/** A compact gallery card: the pattern, the English argument, and the live
 * verdict + certificate computed by @entailer/core. */
function GalleryCard({ scenario, pattern }: { scenario: Scenario; pattern: string }) {
  let a: Analysis | null = null;
  let error: string | null = null;
  try {
    a = analyze(scenario);
  } catch (e) {
    error = e instanceof ParseError ? e.message : String(e);
  }

  return (
    <div className="gcard">
      <div className="gcard-head">
        <span className="gcard-tag">{scenario.tag}</span>
        <code className="gcard-pattern">{pattern}</code>
      </div>
      <h3 className="gcard-title">{scenario.title}</h3>
      <p className="gcard-blurb">{scenario.blurb}</p>
      {error || !a ? (
        <p className="err">{error}</p>
      ) : (
        <>
          <Artifact statements={a.statements} highlight={a.highlight} />
          <div className="gcard-verdict">
            <VerdictBadge badge={a.badge} label={a.label} />
          </div>
          <Certificate a={a} />
        </>
      )}
    </div>
  );
}

export function Showcase() {
  return (
    <main className="wrap page">
      <div className="page-head">
        <div className="eyebrow">worked examples</div>
        <h1 className="page-title">Showcase</h1>
        <p className="page-lede">
          A gallery of arguments run through the real <code>@entailer/core</code>. The invalid ones each come
          back with a concrete counterexample; the valid ones with a proof. Nothing here is hard-coded — every
          verdict and every counter-model below is computed in your browser. For the theory behind them, see{" "}
          <Link to="math">The Mathematics</Link>.
        </p>
      </div>

      <section className="doc-section">
        <div className="section-head"><span className="n">01</span><h2>Formal fallacies</h2></div>
        <p className="section-lede">
          Each of these <em>sounds</em> airtight in a code review, and each is invalid. Entailer refutes the
          argument and hands back the exact case where the premises hold but the conclusion fails.
        </p>
        <div className="gallery">
          {FALLACIES.map((f) => (
            <GalleryCard key={f.id} scenario={f} pattern={f.pattern} />
          ))}
        </div>
      </section>

      <section className="doc-section">
        <div className="section-head"><span className="n">02</span><h2>Valid inference forms</h2></div>
        <p className="section-lede">
          The airtight counterparts — the same surface shapes done correctly. No case makes the premises true
          and the conclusion false, so the refutation finds nothing and the argument stands.
        </p>
        <div className="gallery">
          {VALID_FORMS.map((f) => (
            <GalleryCard key={f.id} scenario={f} pattern={f.pattern} />
          ))}
        </div>
        <p className="hint" style={{ marginTop: 20 }}>
          Want to run your own? The <Link to="home" anchor="playground">playground</Link> takes a fenced block
          of requirements, and the <Link to="docs">Docs</Link> show the CLI and library APIs.
        </p>
      </section>
    </main>
  );
}
