import { useEffect, useState } from "react";
import { Link } from "../router.js";
import { SCENARIOS } from "../data/scenarios.js";
import { OwnView } from "../components/OwnView.js";
import { RepoReport } from "../components/RepoReport.js";
import { ScenarioView } from "../components/ScenarioView.js";

export function Home({ anchor }: { anchor?: string | null }) {
  const [active, setActive] = useState<string>(SCENARIOS[0]!.id);
  const scenario = SCENARIOS.find((s) => s.id === active) ?? null;

  // Honor an incoming #/#playground anchor once mounted.
  useEffect(() => {
    if (anchor) {
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }));
    }
  }, [anchor]);

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
              <div className="eyebrow">does it follow?</div>
              <h1 className="title">
                entail<em>er</em>
              </h1>
              <p className="tagline">a logician's-pass linter for software artifacts.</p>
              <p className="lede">
                A linter for <i>style</i> cannot catch a spec that quietly contradicts itself, or an
                argument that sounds airtight but doesn't follow. Entailer formalizes the load-bearing
                claims in your prose into logic and checks them deterministically. It reports{" "}
                <b>validity</b> and <b>consistency</b> separately from <b>truth</b>, and never ships a
                verdict without showing the formalization it judged. Pick a real artifact below — the
                engine runs in your browser.
              </p>
              <div className="cta">
                <a className="btn primary" href="#playground">See it catch a bug</a>
                <Link to="math" className="btn">The mathematics</Link>
                <Link to="docs" className="btn">Docs</Link>
                <a className="btn" href="https://github.com/barmoshe/entailer">GitHub</a>
              </div>
            </div>
            <div className="hero-art">
              <img
                src={`${import.meta.env.BASE_URL}owl-verdict.webp`}
                width={800}
                height={1000}
                alt="A spectacled owl judge in a teal coat inspects a nervous stack of code files (README.md, main.py, utils.js) in an 'awesome-repo' box through a magnifying glass, about to stamp a VALID certificate with a wax seal, the entails symbol glowing above."
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

      <section id="playground" className="wrap">
        <div className="section-head">
          <span className="n">01</span>
          <h2>See it on a real artifact</h2>
        </div>
        <p className="section-lede">
          Each card is a real software artifact in plain English. Entailer formalizes the claims,
          judges them, and shows its work — including <em>why</em>, as a certificate you can read.
        </p>

        <div className="scenarios">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={`scn ${active === s.id ? "on" : ""}`}
              onClick={() => setActive(s.id)}
            >
              <span className="scn-tag">{s.tag}</span>
              <span className="scn-title">{s.title}</span>
              <span className="scn-blurb">{s.blurb}</span>
              <span className="scn-hint">{s.hint}</span>
            </button>
          ))}
          <button
            className={`scn own ${active === "own" ? "on" : ""}`}
            onClick={() => setActive("own")}
          >
            <span className="scn-tag">sandbox</span>
            <span className="scn-title">Write your own</span>
            <span className="scn-blurb">Drop your own requirements into a fenced block and watch the engine check them.</span>
            <span className="scn-hint">live Tier-3 engine</span>
          </button>
        </div>

        <div className="pg">
          {active === "own" ? <OwnView /> : scenario && <ScenarioView scenario={scenario} />}
        </div>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="n">02</span>
          <h2>The whole-repo view</h2>
        </div>
        <p className="section-lede">
          Tier 4 runs the same consistency check across a whole repository, then reports the{" "}
          <em>minimal conflicting set</em> whose claims span different files — the contradictions a
          style linter structurally cannot see. A representative report:
        </p>
        <RepoReport />
        <p className="repo-caveat">
          Illustrative — a real run is <code>npx @entailer/cli repo .</code>; the core itself stays
          filesystem-free and only ever judges supplied claims.
        </p>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="n">03</span>
          <h2>Four tiers, one core</h2>
        </div>
        <div className="tiers">
          <div className="tier"><span className="lvl">1</span><p><b>Sentence.</b> Classify a single claim: tautology, contingent, contradiction — and flag vacuous "guarantees".</p></div>
          <div className="tier"><span className="lvl">2</span><p><b>Prompt / argument.</b> Recover the conclusion from indicator words, handle enthymemes, check whether it follows.</p></div>
          <div className="tier"><span className="lvl">3</span><p><b>Markdown.</b> Within-doc consistency over fenced claim blocks, reported back to <code>path:line</code>.</p></div>
          <div className="tier"><span className="lvl">4</span><p><b>Repo.</b> Cross-file consistency: a minimal conflicting set whose claims span different files.</p></div>
        </div>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="n">04</span>
          <h2>Packages</h2>
        </div>
        <div className="pkgs">
          <div className="pkg"><code>@entailer/core</code><p>The trusted kernel: AST, parser, DPLL + tableau, verify API, IR, and the honesty-checked LogicReport. Pure TypeScript.</p></div>
          <div className="pkg"><code>@entailer/cli</code><p>The <code>entailer</code> binary: sentence / check / prompt / markdown / repo, with honest exit codes.</p></div>
          <div className="pkg"><code>@entailer/mcp</code><p>A stdio MCP server exposing the deterministic check / evaluate tools with structured output.</p></div>
          <div className="pkg"><code>@entailer/translate</code><p>The only LLM-touching package: prose to a validated IR, degrading to UNKNOWN on a shaky translation.</p></div>
          <div className="pkg"><code>@entailer/viz</code><p>Deterministic view-models and renderers (text, SVG, Mermaid) — the ones powering this page.</p></div>
          <div className="pkg"><code>@entailer/solver</code><p>Opt-in Z3/SMT escalation behind a capability probe. An amplifier, never a gate.</p></div>
        </div>
        <p className="section-lede" style={{ marginTop: 24 }}>
          Want the full API and CLI reference? See the <Link to="docs">Docs</Link>. Curious how the verdicts are
          computed? Read <Link to="math">The Mathematics</Link>.
        </p>
      </section>
    </>
  );
}
