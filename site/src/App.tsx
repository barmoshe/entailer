import { useMemo, useState } from "react";
import {
  ParseError,
  checkConsistency,
  checkValidity,
  classify,
  evaluateMarkdown,
  evaluateSentence,
  formulaToString,
  isPropositional,
  parse,
  type LogicReport,
} from "@entailer/core";
import { truthTableToSvg, truthTableView, verdictBadge } from "@entailer/viz";

/* ------------------------------------------------------------------ *
 * The playground is reframed around the artifact entailer actually
 * judges: real prose. Each scenario shows the English first, then the
 * engine's *own work* (how it formalized the claims), then the verdict
 * with a certificate translated back into English. The raw logic is an
 * "edit" affordance, not the headline — entailer is not a calculator.
 * Every analysis below is computed by the published @entailer/core,
 * running client-side.
 * ------------------------------------------------------------------ */

type Badge = "valid" | "invalid" | "inconsistent" | "inconclusive" | "unknown" | "neutral";

interface Stmt {
  label: string;
  english: string;
  dsl: string;
  role: "requirement" | "premise" | "conclusion" | "claim";
}

interface Gloss {
  symbol: string;
  gloss: string;
}

interface Scenario {
  id: string;
  kind: "spec" | "argument" | "claim";
  tag: string;
  title: string;
  blurb: string;
  hint: string;
  glosses: Gloss[];
  statements: Stmt[];
}

type CertKind = "conflict" | "counter-model" | "proof" | "classify" | "none";

interface Analysis {
  badge: Badge;
  label: string;
  summary: string;
  glosses: Gloss[];
  statements: Stmt[];
  highlight: Set<number>;
  cert: {
    kind: CertKind;
    heading: string;
    blurb: string;
    model?: { gloss: string; value: boolean }[];
    conflict?: { label: string; english: string }[];
  } | null;
  contract: string;
  truthTable?: string | null;
}

/* ------------------------------------------------------------------ *
 * Scenarios — real software artifacts, formalized by hand for the demo
 * (the LLM translator lives in @entailer/translate; this page stays
 * deterministic). The verdicts are computed live, not hard-coded.
 * ------------------------------------------------------------------ */

const SCENARIOS: Scenario[] = [
  {
    id: "spec",
    kind: "spec",
    tag: "spec",
    title: "A spec that cannot be satisfied",
    blurb: "Three requirements, written pages apart. No system can honor all three at once.",
    hint: "expects INCONSISTENT",
    glosses: [
      { symbol: "req", gloss: "the call is an incoming request" },
      { symbol: "logged", gloss: "the call is written to the audit log" },
      { symbol: "health", gloss: "the call is a /healthz health-check" },
    ],
    statements: [
      { label: "R1", english: "Every incoming request must be written to the audit log.", dsl: "req -> logged", role: "requirement" },
      { label: "R2", english: "Health-check calls must never be written to the audit log.", dsl: "health -> ~logged", role: "requirement" },
      { label: "R3", english: "Our /healthz health-check is itself an incoming request.", dsl: "health & req", role: "requirement" },
    ],
  },
  {
    id: "fallacy",
    kind: "argument",
    tag: "argument",
    title: "An argument that does not follow",
    blurb: "It sounds airtight in code review. It commits a classic fallacy, and entailer hands you the counterexample.",
    hint: "expects INVALID",
    glosses: [
      { symbol: "admin", gloss: "Dana is an admin" },
      { symbol: "del", gloss: "Dana can delete records" },
    ],
    statements: [
      { label: "P1", english: "Every admin can delete records.", dsl: "admin -> del", role: "premise" },
      { label: "P2", english: "Dana can delete records.", dsl: "del", role: "premise" },
      { label: "∴", english: "Therefore Dana is an admin.", dsl: "admin", role: "conclusion" },
    ],
  },
  {
    id: "valid",
    kind: "argument",
    tag: "argument",
    title: "An argument that does follow",
    blurb: "Same surface shape as the last one, but this one is airtight — valid no matter whether the premises are actually true.",
    hint: "expects VALID",
    glosses: [
      { symbol: "deployed", gloss: "the build was deployed to production" },
      { symbol: "passed", gloss: "the test suite passed" },
    ],
    statements: [
      { label: "P1", english: "If the build was deployed to production, the test suite passed.", dsl: "deployed -> passed", role: "premise" },
      { label: "P2", english: "The test suite did not pass.", dsl: "~passed", role: "premise" },
      { label: "∴", english: "Therefore the build was not deployed to production.", dsl: "~deployed", role: "conclusion" },
    ],
  },
  {
    id: "vacuous",
    kind: "claim",
    tag: "single claim",
    title: "A claim that is true for the wrong reason",
    blurb: "A guarantee whose precondition can never hold is 'technically true'. Entailer flags it as vacuous instead of laundering it into a real assurance.",
    hint: "expects VACUOUS",
    glosses: [
      { symbol: "on", gloss: "the feature flag is on" },
      { symbol: "cache", gloss: "the response may be cached" },
    ],
    statements: [
      { label: "C", english: "If the flag is both on and off, the response may be cached.", dsl: "(on & ~on) -> cache", role: "claim" },
    ],
  },
];

/* ---- engine drivers (real @entailer/core) ------------------------- */

function glossFor(glosses: Gloss[], symbol: string): string {
  return glosses.find((g) => g.symbol === symbol)?.gloss ?? `“${symbol}” (no gloss supplied)`;
}

/* Recolor the viz truth-table SVG (which ships fixed dark/slate hexes) to the
 * watercolor palette — purely presentational, the engine + view-model are
 * untouched. Falsifying rows stay tinted, now in terracotta. */
function recolorTruthTable(svg: string): string {
  return svg
    .replaceAll("#1f2937", "#37535c") // header band → teal-deep
    .replaceAll("#ffffff", "#f7f0df") // satisfying rows → cream paper
    .replaceAll("#fee2e2", "#ecd5c7") // falsifying rows → soft terracotta wash
    .replaceAll("#e5e7eb", "#d8c6a2"); // cell strokes → warm line
}

function analyzeSpec(s: Scenario): Analysis {
  const formulas = s.statements.map((st) => parse(st.dsl));
  const cons = checkConsistency(formulas);
  const base = { glosses: s.glosses, statements: s.statements, contract: HONESTY };
  if (cons.status === "UNSAT") {
    const subset = cons.minimalConflictingSubset ?? s.statements.map((_, i) => i);
    return {
      ...base,
      badge: "inconsistent",
      label: "INCONSISTENT",
      summary: "These requirements contradict each other. No system can satisfy them all.",
      highlight: new Set(subset),
      cert: {
        kind: "conflict",
        heading: "Minimal conflicting set",
        blurb: "The smallest group of claims that already cannot all hold. Remove or weaken one of these:",
        conflict: subset.map((i) => ({ label: s.statements[i]!.label, english: s.statements[i]!.english })),
      },
    };
  }
  return {
    ...base,
    badge: "valid",
    label: "CONSISTENT",
    summary: "No contradiction found among the requirements. (That is not a proof they are correct, only that they can co-exist.)",
    highlight: new Set(),
    cert: { kind: "none", heading: "No conflict found", blurb: "Every requirement can hold at the same time." },
  };
}

function analyzeArgument(s: Scenario): Analysis {
  const premises = s.statements.filter((st) => st.role === "premise");
  const conclusion = s.statements.find((st) => st.role === "conclusion")!;
  const concIdx = s.statements.indexOf(conclusion);
  const val = checkValidity(premises.map((p) => parse(p.dsl)), parse(conclusion.dsl));
  const base = { glosses: s.glosses, statements: s.statements, contract: HONESTY };
  if (val.verdict === "VALID" && !val.vacuous) {
    return {
      ...base,
      badge: "valid",
      label: "VALID",
      summary: "The conclusion follows by logic alone. No case makes the premises true and the conclusion false.",
      highlight: new Set([concIdx]),
      cert: {
        kind: "proof",
        heading: "Why it holds",
        blurb: "Entailer assumed the premises and the negated conclusion, then refuted that combination — every branch closes, so no counterexample exists.",
      },
    };
  }
  if (val.verdict === "INVALID") {
    const model = val.counterModel ?? {};
    return {
      ...base,
      badge: "invalid",
      label: "INVALID",
      summary: "The conclusion does not follow. Here is a case where every premise is true yet the conclusion is false.",
      highlight: new Set([concIdx]),
      cert: {
        kind: "counter-model",
        heading: "Counterexample",
        blurb: "Make these true — every premise still holds, but the conclusion fails:",
        model: Object.entries(model).map(([sym, v]) => ({ gloss: glossFor(s.glosses, sym), value: v })),
      },
    };
  }
  return {
    ...base,
    badge: "unknown",
    label: val.vacuous ? "VACUOUSLY VALID" : "UNKNOWN",
    summary: val.vacuous
      ? "The premises contradict each other, so the argument is 'valid' only in the empty sense. Fix the premises first."
      : "Outside the engine's decidable fragment — entailer refuses to guess.",
    highlight: new Set(),
    cert: { kind: "none", heading: "No clean verdict", blurb: "Entailer returns UNKNOWN rather than a guessed answer." },
  };
}

function analyzeClaim(s: Scenario): Analysis {
  const st = s.statements[0]!;
  const formula = parse(st.dsl);
  const report = evaluateSentence(st.dsl);
  const k = classify(formula);
  const base = { glosses: s.glosses, statements: s.statements, contract: report.honestyContract };
  const vacuous = report.validity.vacuous || k.kind === "vacuous";
  const tt =
    isPropositional(formula) && report.symbolDictionary.length <= 4
      ? recolorTruthTable(truthTableToSvg(truthTableView(formula)))
      : null;
  const map: Record<string, { badge: Badge; label: string; summary: string }> = {
    tautology: { badge: "neutral", label: "TAUTOLOGY", summary: "True under every assignment — it rules nothing out, so it carries no information." },
    contradiction: { badge: "invalid", label: "CONTRADICTION", summary: "False under every assignment — it can never hold." },
    contingent: { badge: "neutral", label: "CONTINGENT", summary: "True in some cases, false in others. Its truth depends on the facts." },
    vacuous: { badge: "unknown", label: "VACUOUSLY TRUE", summary: "True only because its precondition can never be met — not a real guarantee." },
  };
  const pick = vacuous ? map.vacuous! : map[k.kind]!;
  return {
    ...base,
    badge: pick.badge,
    label: pick.label,
    summary: pick.summary,
    highlight: new Set(),
    truthTable: tt,
    cert: vacuous
      ? { kind: "classify", heading: "Vacuity flag", blurb: "The antecedent “the flag is both on and off” is unsatisfiable, so the implication is true for free. Entailer surfaces that instead of hiding it." }
      : { kind: "classify", heading: "Classification", blurb: `Entailer classified this claim as ${k.kind} by its truth table.` },
  };
}

const HONESTY =
  "Entailer judges validity and consistency, not truth. It assumes the formalization above is faithful — that is the human's job to check, which is why it is always shown.";

function analyze(s: Scenario): Analysis {
  if (s.kind === "spec") return analyzeSpec(s);
  if (s.kind === "argument") return analyzeArgument(s);
  return analyzeClaim(s);
}

/* ---- presentation ------------------------------------------------- */

function VerdictBadge({ badge, label }: { badge: Badge; label: string }) {
  return (
    <span className={`badge ${badge}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

function Artifact({ statements, highlight }: { statements: Stmt[]; highlight: Set<number> }) {
  return (
    <div className="artifact">
      {statements.map((st, i) => (
        <div className={`stmt ${highlight.has(i) ? "hot" : ""} ${st.role === "conclusion" ? "concl" : ""}`} key={i}>
          <span className="lbl">{st.label}</span>
          <span className="eng">{st.english}</span>
        </div>
      ))}
    </div>
  );
}

function Reads({ a }: { a: Analysis }) {
  return (
    <div className="reads">
      <h5>How entailer reads it</h5>
      <table className="dict">
        <tbody>
          {a.glosses.map((g) => (
            <tr key={g.symbol}>
              <td className="k"><code>{g.symbol}</code></td>
              <td>{g.gloss}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="formal">
        <tbody>
          {a.statements.map((st, i) => (
            <tr key={i}>
              <td className="k">{st.label}</td>
              <td><code>{formulaToString(parse(st.dsl))}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Certificate({ a }: { a: Analysis }) {
  if (!a.cert) return null;
  const c = a.cert;
  return (
    <div className={`cert ${a.badge}`}>
      <div className="cert-head">{c.heading}</div>
      <p className="cert-blurb">{c.blurb}</p>
      {c.model && (
        <div className="model">
          {c.model.map((m, i) => (
            <div className="mrow" key={i}>
              <span className={`tf ${m.value ? "t" : "f"}`}>{m.value ? "TRUE" : "FALSE"}</span>
              <span>{m.gloss}</span>
            </div>
          ))}
        </div>
      )}
      {c.conflict && (
        <div className="conflict">
          {c.conflict.map((cf) => (
            <div className="crow" key={cf.label}>
              <span className="clbl">{cf.label}</span>
              <span>{cf.english}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScenarioView({ scenario }: { scenario: Scenario }) {
  const [open, setOpen] = useState(false);
  let a: Analysis | null = null;
  let error: string | null = null;
  try {
    a = analyze(scenario);
  } catch (e) {
    error = e instanceof ParseError ? e.message : String(e);
  }
  if (error || !a) return <p className="err">{error}</p>;

  return (
    <div className="canvas fadein" key={scenario.id}>
      <div className="col col-artifact">
        <div className="col-head">The artifact</div>
        <Artifact statements={a.statements} highlight={a.highlight} />
        <button className="disclosure" onClick={() => setOpen((o) => !o)}>
          {open ? "▾" : "▸"} the logic entailer ran
        </button>
        {open && <Reads a={a} />}
        {a.truthTable && (
          <div className="svgwrap" dangerouslySetInnerHTML={{ __html: a.truthTable }} />
        )}
      </div>
      <div className="col col-verdict">
        <div className="col-head">The verdict</div>
        <VerdictBadge badge={a.badge} label={a.label} />
        <p className="summary">{a.summary}</p>
        <Certificate a={a} />
        <p className="contract">{a.contract}</p>
      </div>
    </div>
  );
}

/* ---- write-your-own (real Tier-3 markdown engine) ----------------- */

const OWN_DEFAULT = `# Caching policy

\`\`\`entailer
let fresh = the response is served fresh
let cached = the response is served from cache
let stale = the cache entry is stale

fresh -> ~cached
stale -> ~fresh
cached -> stale
fresh & cached
\`\`\``;

function OwnView() {
  const [md, setMd] = useState(OWN_DEFAULT);
  const result = useMemo(() => {
    if (!md.trim()) return null;
    let report: LogicReport;
    try {
      report = evaluateMarkdown({ markdown: md, uri: "doc.md" });
    } catch (e) {
      return <p className="err">{e instanceof ParseError ? e.message : String(e)}</p>;
    }
    const badge = verdictBadge(report) as Badge;
    const subset = report.consistency.minimalConflictingSubset;
    return (
      <div className="own-out fadein" key={md}>
        <VerdictBadge badge={badge} label={report.verdict.replace(/_/g, " ")} />
        {subset && subset.length > 0 && (
          <div className={`cert ${badge}`}>
            <div className="cert-head">Minimal conflicting set</div>
            <p className="cert-blurb">Claims that already cannot all hold: [{subset.join(", ")}].</p>
          </div>
        )}
        {report.symbolDictionary.length > 0 && report.symbolDictionary[0]!.symbol !== "(none)" && (
          <>
            <h5>How entailer reads it</h5>
            <table className="dict">
              <tbody>
                {report.symbolDictionary.map((s) => (
                  <tr key={s.symbol}>
                    <td className="k"><code>{s.symbol}</code></td>
                    <td>{s.gloss}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <p className="contract">{report.honestyContract}</p>
      </div>
    );
  }, [md]);

  return (
    <div className="canvas">
      <div className="col col-artifact">
        <div className="col-head">Your document</div>
        <p className="hint" style={{ marginTop: 0 }}>
          Declare glosses with <code>let name = english</code>, then one claim per line inside a fenced{" "}
          <code>entailer</code> block. <code>~</code> not · <code>&amp;</code> and · <code>|</code> or ·{" "}
          <code>-&gt;</code> implies · <code>&lt;-&gt;</code> iff
        </p>
        <textarea className="own-edit" rows={14} value={md} onChange={(e) => setMd(e.target.value)} />
      </div>
      <div className="col col-verdict">
        <div className="col-head">The verdict</div>
        {result}
      </div>
    </div>
  );
}

/* ---- Tier-4 repo map (representative report mockup) --------------- */

type Tone = "ok" | "warn" | "bad";
type Sev = "high" | "medium" | "low" | "resolved";

const REPO_CARDS: { name: string; status: string; tone: Tone }[] = [
  { name: "auth/", status: "consistent", tone: "ok" },
  { name: "api spec", status: "2 gaps", tone: "bad" },
  { name: "rate-limits", status: "fixed", tone: "warn" },
  { name: "billing/", status: "3 inconsistent", tone: "bad" },
  { name: "cross-cutting", status: "mixed", tone: "warn" },
];

const REPO_FINDINGS: { sev: Sev; where: string; why: string }[] = [
  { sev: "high", where: "spec/auth.md ↔ config/roles.yaml", why: "all routes require auth vs guests may read orders" },
  { sev: "high", where: "billing/refunds.md ↔ policy/refunds.md", why: "refunds allowed any time vs blocked after 30 days" },
  { sev: "high", where: "api/orders.md ↔ db/schema.sql", why: "order total is optional vs NOT NULL on total" },
  { sev: "medium", where: "README.md ↔ docs/deploy.md", why: "single-region deploy vs multi-region failover" },
  { sev: "medium", where: "config/cache.yaml ↔ spec/freshness.md", why: "cache for 1h vs reads must always be fresh" },
  { sev: "low", where: "CHANGELOG.md ↔ package.json", why: "documents v2.1 vs version 2.0.3" },
  { sev: "resolved", where: "spec/webhooks.md", why: "retry-once vs retry-until-ack, reconciled in this pass" },
];

const SEV_LABEL: Record<Sev, string> = { high: "High", medium: "Medium", low: "Low", resolved: "Resolved" };

function RepoReport() {
  return (
    <div className="repo">
      <div className="repo-cards">
        {REPO_CARDS.map((c) => (
          <div className={`rcard ${c.tone}`} key={c.name}>
            <span className="rcard-name">{c.name}</span>
            <span className="rcard-status">{c.status}</span>
          </div>
        ))}
      </div>
      <div className="repo-list-head">confirmed cross-file contradictions</div>
      <div className="repo-list">
        {REPO_FINDINGS.map((f, i) => (
          <div className="rrow" key={i}>
            <span className={`sev ${f.sev}`} />
            <span className="rwhere">{f.where}</span>
            <span className="rsep">·</span>
            <span className="rwhy">{f.why}</span>
          </div>
        ))}
      </div>
      <div className="repo-legend">
        {(["high", "medium", "low", "resolved"] as Sev[]).map((s) => (
          <span className="leg" key={s}>
            <span className={`sev ${s}`} /> {SEV_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---- page --------------------------------------------------------- */

export function App() {
  const [active, setActive] = useState<string>(SCENARIOS[0]!.id);
  const scenario = SCENARIOS.find((s) => s.id === active) ?? null;

  return (
    <>
      {/* Shared SVG filters: a deckle (torn watercolor-paper) edge for card
          backgrounds. Applied to a background-only pseudo-element so the painted
          edge roughens while the text above stays crisp. */}
      <svg className="filters" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="deckle" x="-8%" y="-14%" width="116%" height="128%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.019" numOctaves="3" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="deckle-lg" x="-6%" y="-8%" width="112%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.011 0.014" numOctaves="3" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="deckle-sm" x="-10%" y="-18%" width="120%" height="136%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.03" numOctaves="3" seed="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <header className="hero">
        <div className="glyph" aria-hidden>⊨</div>
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy">
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
                <a className="btn" href="https://github.com/barmoshe/entailer">GitHub</a>
                <a className="btn" href="https://www.npmjs.com/package/@entailer/core">npm</a>
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
      </section>

      <footer>
        <div className="wrap row">
          <span>entailer — MIT licensed. The engine on this page is the published <code>@entailer/core</code>, running client-side.</span>
          <span>
            <a href="https://github.com/barmoshe/entailer">source</a> ·{" "}
            <a href="https://github.com/barmoshe/entailer/blob/main/DESIGN.md">design</a>
          </span>
        </div>
      </footer>
    </>
  );
}
