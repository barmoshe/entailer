import { useMemo, useState } from "react";
import {
  ParseError,
  checkConsistency,
  checkValidity,
  evaluateMarkdown,
  evaluateSentence,
  isPropositional,
  parse,
  type Assignment,
  type Formula,
  type LogicReport,
} from "@entailer/core";
import { counterModelToText, truthTableToSvg, truthTableView, verdictBadge } from "@entailer/viz";

type Mode = "sentence" | "argument" | "markdown";
type Badge = "valid" | "invalid" | "inconsistent" | "inconclusive" | "unknown";

function Verdict({ badge, label }: { badge: Badge; label: string }) {
  return (
    <span className={`badge ${badge}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

function Dictionary({ report }: { report: LogicReport }) {
  if (report.symbolDictionary.length === 0) return null;
  return (
    <>
      <h5>Symbol dictionary</h5>
      <table>
        <tbody>
          {report.symbolDictionary.map((s) => (
            <tr key={s.symbol}>
              <td className="k">
                <code>{s.symbol}</code>
              </td>
              <td>{s.gloss}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Contract({ text }: { text: string }) {
  return <p className="contract">{text}</p>;
}

function SentenceResult({ input }: { input: string }) {
  if (!input.trim()) return <p className="hint">Type a claim to classify it.</p>;
  let report: LogicReport;
  let formula: Formula | null = null;
  try {
    formula = parse(input);
    report = evaluateSentence(input);
  } catch (e) {
    return <p className="err">{e instanceof ParseError ? e.message : String(e)}</p>;
  }
  const badge = verdictBadge(report) as Badge;
  const svg =
    formula && isPropositional(formula) && report.symbolDictionary.length <= 4
      ? truthTableToSvg(truthTableView(formula))
      : null;
  return (
    <div className="res fadein" key={input}>
      <Verdict badge={badge} label={report.verdict.replace(/_/g, " ")} />
      <h5>Formalization</h5>
      <code>{report.formalization[0]?.formal}</code>
      {report.validity.vacuous && <p className="hint">⚠ vacuously true: the antecedent is unsatisfiable.</p>}
      <Dictionary report={report} />
      {svg && (
        <>
          <h5>Truth table</h5>
          <div className="svgwrap" dangerouslySetInnerHTML={{ __html: svg }} />
        </>
      )}
      <Contract text={report.honestyContract} />
    </div>
  );
}

function ArgumentResult({ premisesText, conclusion }: { premisesText: string; conclusion: string }) {
  const lines = premisesText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return <p className="hint">Add one premise per line, then a conclusion.</p>;
  let premises: Formula[];
  let concl: Formula | null = null;
  try {
    premises = lines.map(parse);
    if (conclusion.trim()) concl = parse(conclusion);
  } catch (e) {
    return <p className="err">{e instanceof ParseError ? e.message : String(e)}</p>;
  }
  const cons = checkConsistency(premises);
  const val = concl ? checkValidity(premises, concl) : null;
  let badge: Badge = "inconclusive";
  let label = "NO CONCLUSION";
  let cm: Assignment | undefined;
  if (val) {
    if (val.verdict === "VALID") {
      badge = val.vacuous ? "inconclusive" : "valid";
      label = val.vacuous ? "VACUOUSLY VALID" : "VALID";
    } else if (val.verdict === "INVALID") {
      badge = "invalid";
      label = "INVALID";
      cm = val.counterModel;
    } else {
      badge = "unknown";
      label = "UNKNOWN";
    }
  } else {
    badge = cons.status === "UNSAT" ? "inconsistent" : "inconclusive";
    label = cons.status === "UNSAT" ? "INCONSISTENT" : "CONSISTENT SET";
  }
  return (
    <div className="res fadein" key={premisesText + "|" + conclusion}>
      <Verdict badge={badge} label={label} />
      {cm && (
        <p className="cm" style={{ marginTop: 12 }}>
          counter-model: <code>{counterModelToText(cm)}</code> — satisfies every premise, falsifies the conclusion.
        </p>
      )}
      <h5>Consistency of premises</h5>
      <p style={{ margin: 0, color: cons.status === "UNSAT" ? "var(--invalid)" : "var(--muted)" }}>
        {cons.status === "UNSAT"
          ? `UNSAT — minimal conflicting subset: premises [${(cons.minimalConflictingSubset ?? []).join(", ")}]`
          : cons.status === "SAT"
            ? "no contradiction found (not a proof of consistency)"
            : "UNKNOWN"}
      </p>
      <h5>Formalization</h5>
      <table>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="k">P{i}</td>
              <td>
                <code>{l}</code>
              </td>
            </tr>
          ))}
          {conclusion.trim() && (
            <tr>
              <td className="k">∴</td>
              <td>
                <code>{conclusion.trim()}</code>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownResult({ md }: { md: string }) {
  if (!md.trim()) return <p className="hint">Paste a doc with fenced ```entailer claim blocks.</p>;
  let report: LogicReport;
  try {
    report = evaluateMarkdown({ markdown: md, uri: "doc.md" });
  } catch (e) {
    return <p className="err">{e instanceof ParseError ? e.message : String(e)}</p>;
  }
  const badge = verdictBadge(report) as Badge;
  const subset = report.consistency.minimalConflictingSubset;
  return (
    <div className="res fadein" key={md}>
      <Verdict badge={badge} label={report.verdict.replace(/_/g, " ")} />
      {subset && subset.length > 0 && (
        <p className="subset" style={{ marginTop: 12 }}>
          minimal conflicting subset: claims [{subset.join(", ")}]
        </p>
      )}
      {report.findings.length > 0 && (
        <>
          <h5>Findings</h5>
          <table>
            <tbody>
              {report.findings.map((f, i) => (
                <tr key={i}>
                  <td className="k">{f.location?.line !== undefined ? `:${f.location.line}` : ""}</td>
                  <td>{f.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <Dictionary report={report} />
      <Contract text={report.honestyContract} />
    </div>
  );
}

const EX = {
  sentence: ["a | ~a", "a & ~a", "(p -> q) -> (~q -> ~p)", "(a & ~a) -> b"],
  markdown: [
    "# Logging policy\n\n```entailer\nlet req = a request\nlet logged = it is logged\nlet health = a health-check\nreq -> logged\nhealth -> ~logged\nhealth & req\n```",
  ],
};

export function App() {
  const [mode, setMode] = useState<Mode>("sentence");
  const [sentence, setSentence] = useState("(a & ~a) -> b");
  const [premises, setPremises] = useState("p -> q\nq");
  const [conclusion, setConclusion] = useState("p");
  const [md, setMd] = useState(EX.markdown[0]!);

  const result = useMemo(() => {
    if (mode === "sentence") return <SentenceResult input={sentence} />;
    if (mode === "argument") return <ArgumentResult premisesText={premises} conclusion={conclusion} />;
    return <MarkdownResult md={md} />;
  }, [mode, sentence, premises, conclusion, md]);

  return (
    <>
      <header className="hero">
        <div className="glyph" aria-hidden>⊨</div>
        <div className="wrap">
          <div className="eyebrow">does it follow?</div>
          <h1 className="title">
            entail<em>er</em>
          </h1>
          <p className="tagline">a logician's-pass linter for software artifacts.</p>
          <p className="lede">
            Entailer checks whether prose that argues actually <b>follows</b>, and whether a set of
            requirements is <b>consistent</b>, by formalizing the load-bearing claims into logic and
            verifying them deterministically. It reports <b>validity</b> and <b>consistency</b>{" "}
            separately from <b>truth</b>, and never ships a verdict without showing the formalization
            it judged. The playground below runs the real engine, entirely in your browser.
          </p>
          <div className="cta">
            <a className="btn primary" href="#playground">Try the playground</a>
            <a className="btn" href="https://github.com/barmoshe/entailer">GitHub</a>
            <a className="btn" href="https://www.npmjs.com/package/@entailer/core">npm</a>
          </div>

          <div className="discipline">
            <div>
              <h4>validity ≠ truth</h4>
              <p>A valid argument can rest on false premises. Premise truth is out of scope.</p>
            </div>
            <div>
              <h4>certificate or nothing</h4>
              <p>INVALID ships a counter-model; INCONSISTENT a minimal conflicting subset.</p>
            </div>
            <div>
              <h4>UNKNOWN is honest</h4>
              <p>Out of fragment or low confidence returns UNKNOWN, never a guessed verdict.</p>
            </div>
          </div>
        </div>
      </header>

      <section id="playground" className="wrap">
        <div className="section-head">
          <span className="n">01</span>
          <h2>Playground</h2>
        </div>
        <div className="pg">
          <div className="tabs" role="tablist">
            {(["sentence", "argument", "markdown"] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                className="tab"
                onClick={() => setMode(m)}
              >
                {m === "sentence" ? "Tier 1 · sentence" : m === "argument" ? "Tier 2 · argument" : "Tier 3 · markdown"}
              </button>
            ))}
          </div>
          <div className="pg-body">
            <div className="pg-in">
              {mode === "sentence" && (
                <>
                  <label className="fld">Claim (logic DSL)</label>
                  <input className="txt" value={sentence} onChange={(e) => setSentence(e.target.value)} />
                  <p className="hint">~ not · &amp; and · | or · -&gt; implies · &lt;-&gt; iff</p>
                  <div className="examples">
                    {EX.sentence.map((x) => (
                      <button key={x} className="chip" onClick={() => setSentence(x)}>{x}</button>
                    ))}
                  </div>
                </>
              )}
              {mode === "argument" && (
                <>
                  <label className="fld">Premises (one per line)</label>
                  <textarea rows={4} value={premises} onChange={(e) => setPremises(e.target.value)} />
                  <label className="fld" style={{ marginTop: 12 }}>Conclusion</label>
                  <input className="txt" value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
                  <p className="hint">Try the classic: <code>p -&gt; q</code>, <code>q</code> ⊢ <code>p</code> (affirming the consequent).</p>
                </>
              )}
              {mode === "markdown" && (
                <>
                  <label className="fld">Markdown with fenced `entailer` blocks</label>
                  <textarea rows={12} value={md} onChange={(e) => setMd(e.target.value)} />
                  <div className="examples">
                    {EX.markdown.map((x, i) => (
                      <button key={i} className="chip" onClick={() => setMd(x)}>inconsistent spec</button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="pg-out">{result}</div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="n">02</span>
          <h2>Four tiers, one core</h2>
        </div>
        <div className="tiers">
          <div className="tier"><span className="lvl">1</span><p><b>Sentence.</b> Classify a single claim: tautology, contingent, or contradiction.</p></div>
          <div className="tier"><span className="lvl">2</span><p><b>Prompt.</b> Recover the conclusion from indicator words, handle enthymemes, check argument validity.</p></div>
          <div className="tier"><span className="lvl">3</span><p><b>Markdown.</b> Within-doc consistency over fenced claim blocks, reported back to <code>path:line</code>.</p></div>
          <div className="tier"><span className="lvl">4</span><p><b>Repo.</b> Cross-file consistency: a minimal conflicting subset whose claims span different files.</p></div>
        </div>
      </section>

      <section className="wrap">
        <div className="section-head">
          <span className="n">03</span>
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
