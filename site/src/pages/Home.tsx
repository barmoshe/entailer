import { Link } from "../router.js";
import { VerdictBadge } from "../components/VerdictBadge.js";

/* ------------------------------------------------------------------ *
 * Home = the pitch, kept lean. One hero, one honest taste of a verdict,
 * the two axes, the packages. Every live exhibit lives on the
 * Playground page so the landing stays scannable.
 * ------------------------------------------------------------------ */
export function Home() {
  return (
    <>
      <header className="hero">
        <img className="glyph" src={`${import.meta.env.BASE_URL}logo.webp`} alt="" aria-hidden="true" />
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy">
              <img
                className="brandmark"
                src={`${import.meta.env.BASE_URL}logo.webp`}
                width={56}
                height={56}
                alt=""
                aria-hidden="true"
              />
              <div className="eyebrow">v1.2.0 · now with the concept lens</div>
              <h1 className="title">
                entail<em>er</em>
              </h1>
              <p className="tagline">a logician's-pass linter for software artifacts.</p>
              <p className="lede">
                A style linter can't catch a spec that quietly contradicts itself. Entailer formalizes the
                load-bearing claims in your prose into logic and checks them deterministically — reporting{" "}
                <b>validity</b> and <b>consistency</b> separately from <b>truth</b>, and never shipping a
                verdict without the formalization it judged.
              </p>
              <div className="cta">
                <Link to="playground" className="btn primary">Open the playground</Link>
                <Link to="math" className="btn">The mathematics</Link>
                <a className="btn" href="https://github.com/barmoshe/entailer">GitHub</a>
              </div>
            </div>
            <div className="hero-art">
              <img
                src={`${import.meta.env.BASE_URL}owl-verdict.webp`}
                width={800}
                height={1000}
                alt="A spectacled owl judge in a teal coat inspects a nervous stack of code files through a magnifying glass, about to stamp a VALID certificate with a wax seal, the entails symbol glowing above."
              />
            </div>
          </div>

          <div className="discipline">
            <div>
              <h4>validity ≠ truth</h4>
              <p>A valid argument can rest on false premises. Premise truth is out of scope, on purpose.</p>
            </div>
            <div>
              <h4>certificate or nothing</h4>
              <p>INVALID ships a counterexample; INCONSISTENT a minimal conflicting set. Never a vibe.</p>
            </div>
            <div>
              <h4>UNKNOWN is honest</h4>
              <p>Out of fragment or shaky formalization returns UNKNOWN, never a guessed verdict.</p>
            </div>
          </div>
        </div>
      </header>

      <section className="wrap">
        <div className="section-head">
          <span className="n">01</span>
          <h2>What a verdict looks like</h2>
        </div>
        <p className="section-lede">
          Three requirements in plain English, quietly at war. A style linter sees nothing wrong; Entailer
          returns the <em>minimal conflicting set</em> — the smallest group of claims that can't all hold.
        </p>
        <div className="taste">
          <div className="taste-doc">
            <div className="taste-name">spec.md</div>
            <pre className="taste-body">
{`R1  Every request must be logged.
R2  Health-check requests must not be logged.
R3  /healthz is a request.`}
            </pre>
          </div>
          <div className="taste-out">
            <VerdictBadge badge="inconsistent" label="INCONSISTENT" />
            <p className="taste-why">
              minimal conflicting subset <code>{`{R1, R2, R3}`}</code> — R3 makes <code>/healthz</code> a
              request, R1 forces it logged, R2 forbids it.
            </p>
            <Link to="playground" anchor="artifacts" className="btn primary">Run it yourself →</Link>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="n">02</span>
          <h2>Two axes, one honest core</h2>
        </div>
        <p className="section-lede">
          The same deterministic kernel judges along two independent axes. Every surface is live in the{" "}
          <Link to="playground">playground</Link>.
        </p>
        <div className="axes">
          <div className="axis">
            <div className="axis-head">
              <span className="axis-kicker">five tiers</span>
              <h3>Does the logic hold?</h3>
            </div>
            <ul className="axis-list">
              <li><b>1 · Sentence</b> — classify a claim; flag vacuous "guarantees".</li>
              <li><b>2 · Prompt</b> — recover the conclusion, check whether it follows.</li>
              <li><b>3 · Markdown</b> — within-doc consistency, back to <code>path:line</code>.</li>
              <li><b>4 · Repo</b> — cross-file conflicts spanning different files.</li>
              <li><b>5 · Pull request</b> — a base→head delta; gate on regressions, not a dirty head.</li>
            </ul>
            <Link to="playground" anchor="pr" className="axis-cta">Try the PR gate →</Link>
          </div>
          <div className="axis">
            <div className="axis-head">
              <span className="axis-kicker">a lens, not a tier</span>
              <h3>Does the code stay faithful to its concepts?</h3>
            </div>
            <p className="axis-body">
              Declare a small concept cluster on its four sides — relationships, rule, examples,
              vocabulary. The lens flags where one identifier fuses two concepts you declared mutually
              exclusive. Only a <b>rank-1</b> contradiction is a verdict; a legitimate <code>is-a</code>{" "}
              overlap stays silent, so there's no false positive. Ranks 2–3 are reader hints that assert
              nothing and can never block.
            </p>
            <Link to="playground" anchor="lens" className="axis-cta">Try the concept lens →</Link>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="n">03</span>
          <h2>Packages</h2>
        </div>
        <div className="pkgs">
          <div className="pkg"><code>@entailer/core</code><p>The trusted kernel: AST, parser, DPLL + tableau, verify API, IR, the honesty-checked LogicReport, and the domain lens. Pure TypeScript.</p></div>
          <div className="pkg"><code>@entailer/cli</code><p>The <code>entailer</code> binary: sentence / check / prompt / markdown / repo / pr / domain, with honest exit codes.</p></div>
          <div className="pkg"><code>@entailer/mcp</code><p>A stdio MCP server exposing the deterministic check / evaluate tools with structured output.</p></div>
          <div className="pkg"><code>@entailer/translate</code><p>The only LLM-touching package: prose to a validated IR, degrading to UNKNOWN on a shaky translation.</p></div>
          <div className="pkg"><code>@entailer/viz</code><p>Deterministic view-models and renderers (text, SVG, Mermaid) — the ones powering this page.</p></div>
          <div className="pkg"><code>@entailer/solver</code><p>Opt-in Z3/SMT escalation behind a capability probe. An amplifier, never a gate.</p></div>
        </div>
        <p className="section-lede" style={{ marginTop: 24 }}>
          Full API and CLI reference is in the <Link to="docs">Docs</Link>; how the verdicts are computed
          is in <Link to="math">The Mathematics</Link>.
        </p>
      </section>
    </>
  );
}
