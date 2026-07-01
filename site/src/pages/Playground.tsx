import { useEffect, useState } from "react";
import { SCENARIOS } from "../data/scenarios.js";
import { OwnView } from "../components/OwnView.js";
import { PrDemo } from "../components/PrDemo.js";
import { DomainDemo } from "../components/DomainDemo.js";
import { RepoReport } from "../components/RepoReport.js";
import { ScenarioView } from "../components/ScenarioView.js";

/* ------------------------------------------------------------------ *
 * The Playground: every exhibit runs the published @entailer/core in
 * your browser. Kept off the landing page on purpose — this is where
 * you go to try it, not to read the pitch.
 * ------------------------------------------------------------------ */
export function Playground({ anchor }: { anchor?: string | null }) {
  const [active, setActive] = useState<string>(SCENARIOS[0]!.id);
  const scenario = SCENARIOS.find((s) => s.id === active) ?? null;

  useEffect(() => {
    if (anchor) {
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }));
    }
  }, [anchor]);

  return (
    <>
      <section className="wrap pg-intro">
        <div className="eyebrow">playground</div>
        <h1 className="pg-h1">Try it in your browser</h1>
        <p className="section-lede">
          Every exhibit below runs the real <code>@entailer/core</code> client-side — no server, no
          sign-up. Pick a real artifact, flip a gate, declare a concept cluster. The engine judges it and
          shows its work, including <em>why</em>.
        </p>
      </section>

      <section id="artifacts" className="wrap">
        <div className="section-head">
          <span className="n">01</span>
          <h2>See it on a real artifact</h2>
        </div>
        <p className="section-lede">
          Each card is a real software artifact in plain English. Entailer formalizes the claims, judges
          them, and shows the certificate you can read.
        </p>
        <div className="scenarios">
          {SCENARIOS.map((s) => (
            <button key={s.id} className={`scn ${active === s.id ? "on" : ""}`} onClick={() => setActive(s.id)}>
              <span className="scn-tag">{s.tag}</span>
              <span className="scn-title">{s.title}</span>
              <span className="scn-blurb">{s.blurb}</span>
              <span className="scn-hint">{s.hint}</span>
            </button>
          ))}
          <button className={`scn own ${active === "own" ? "on" : ""}`} onClick={() => setActive("own")}>
            <span className="scn-tag">sandbox</span>
            <span className="scn-title">Write your own</span>
            <span className="scn-blurb">Drop your own requirements into a fenced block and watch the engine check them.</span>
            <span className="scn-hint">live Tier-3 engine</span>
          </button>
        </div>
        <div className="pg">{active === "own" ? <OwnView /> : scenario && <ScenarioView scenario={scenario} />}</div>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="n">02</span>
          <h2>The whole-repo view</h2>
        </div>
        <p className="section-lede">
          Tier 4 runs the same consistency check across a whole repository, then reports the{" "}
          <em>minimal conflicting set</em> whose claims span different files — the contradictions a style
          linter structurally cannot see. A representative report:
        </p>
        <RepoReport />
        <p className="repo-caveat">
          Illustrative — a real run is <code>npx @entailer/cli repo .</code>; the core stays
          filesystem-free and only ever judges supplied claims.
        </p>
      </section>

      <section id="pr" className="wrap">
        <div className="section-head">
          <span className="n">03</span>
          <h2>The pull-request gate</h2>
        </div>
        <p className="section-lede">
          Tier 5 asks a sharper question than "is the repo consistent?" — it asks{" "}
          <em>did this PR make it worse?</em> It computes a <b>base→head delta</b> and attributes every
          contradiction as introduced, fixed, or pre-existing. Pick a PR, flip the gate:
        </p>
        <PrDemo />
        <p className="repo-caveat">
          Live <code>evaluatePr</code>. A real run is <code>entailer pr 128</code> (or{" "}
          <code>--base main</code>); <code>gate=head</code> fails on any head inconsistency,{" "}
          <code>gate=introduced</code> fails only on what the PR introduced.
        </p>
      </section>

      <section id="lens" className="wrap">
        <div className="section-head">
          <span className="n">04</span>
          <h2>The concept-faithfulness lens</h2>
        </div>
        <p className="section-lede">
          A different axis from the five tiers: not "does the logic hold?" but{" "}
          <em>does the code stay faithful to its own concepts?</em> Declare a small cluster on its four
          sides; the lens flags where one identifier fuses two concepts you declared mutually exclusive.
          Only a <b>rank-1</b> contradiction is a verdict; a legitimate <code>is-a</code> overlap stays
          silent:
        </p>
        <DomainDemo />
        <p className="repo-caveat">
          Live <code>evaluateDomain</code>. Classification is lexical — the irreducible weak link — so a
          human confirms each site; ranks 2–3 are reader hints, never a blocking claim. Not a tier: a
          distinct axis on the same honest core.
        </p>
      </section>
    </>
  );
}
