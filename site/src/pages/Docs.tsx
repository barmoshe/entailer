import { Link } from "../router.js";

/* A small helper for read-only code blocks in the watercolor theme. */
function Code({ children }: { children: string }) {
  return <pre className="codeblock"><code>{children}</code></pre>;
}

const TOC: { id: string; label: string }[] = [
  { id: "install", label: "Install" },
  { id: "cli", label: "CLI" },
  { id: "library", label: "Library API" },
  { id: "mcp", label: "MCP server" },
  { id: "tiers", label: "The four tiers" },
  { id: "ir", label: "IR & the honesty contract" },
];

export function Docs() {
  return (
    <main className="wrap page">
      <div className="page-head">
        <div className="eyebrow">documentation</div>
        <h1 className="page-title">Using entailer</h1>
        <p className="page-lede">
          Entailer checks whether prose that argues actually <em>follows</em>, and whether a set of
          requirements is <em>consistent</em> — by formalizing the load-bearing claims into logic and
          verifying them deterministically. It reports validity and consistency separately from truth, and
          never ships a verdict without showing the formalization it judged. This page is the reference for
          the CLI, the library, and the MCP server; for the theory, see{" "}
          <Link to="math">The Mathematics</Link>.
        </p>
      </div>

      <nav className="doc-toc" aria-label="On this page">
        {TOC.map((t) => (
          <a key={t.id} href={`#/docs#${t.id}`}>{t.label}</a>
        ))}
      </nav>

      <section id="install" className="doc-section">
        <div className="section-head"><span className="n">01</span><h2>Install</h2></div>
        <p className="section-lede">
          The verifier core and the visualizers are plain npm packages; the CLI needs no install with{" "}
          <code>npx</code>.
        </p>
        <Code>{`# Library (the deterministic kernel + renderers)
npm i @entailer/core @entailer/viz

# CLI, no install
npx @entailer/cli sentence "a -> a"

# MCP server (stdio)
npx @entailer/mcp`}</Code>
        <p className="hint">Requires Node ≥ 20.19. Everything is MIT licensed and dependency-light — the core has zero LLM or solver dependencies.</p>
      </section>

      <section id="cli" className="doc-section">
        <div className="section-head"><span className="n">02</span><h2>CLI</h2></div>
        <p className="section-lede">
          The <code>entailer</code> binary is a thin adapter over the core, one subcommand per tier plus a
          direct <code>check</code> over a supplied IR.
        </p>
        <Code>{`entailer sentence "a -> a"          # Tier 1: classify a single claim
entailer check --ir argument.json   # validity of a supplied argument (IR)
entailer prompt --file arg.txt      # Tier 2: recover the conclusion, then check
entailer markdown spec.md           # Tier 3: within-doc consistency
entailer repo .                     # Tier 4: cross-file consistency

# add --json to any command for structured output`}</Code>
        <p className="section-lede" style={{ marginBottom: 8 }}>Honest exit codes let CI gate on logic:</p>
        <div className="doc-table">
          <table>
            <thead><tr><th>Code</th><th>Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>0</code></td><td>valid / consistent — no issue found</td></tr>
              <tr><td><code>1</code></td><td>invalid or inconsistent</td></tr>
              <tr><td><code>2</code></td><td>malformed input (parse error)</td></tr>
              <tr><td><code>3</code></td><td><code>UNKNOWN</code>-blocked — out of fragment or a shaky formalization</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">
          The distinct <code>3</code> matters: entailer never launders an <code>UNKNOWN</code> into a
          passing <code>0</code>. A build can choose to fail closed on it.
        </p>
      </section>

      <section id="library" className="doc-section">
        <div className="section-head"><span className="n">03</span><h2>Library API</h2></div>
        <p className="section-lede">
          Everything in <code>@entailer/core</code> is pure and deterministic. The typical path: parse a
          claim (or build the AST), then call a verify function.
        </p>
        <Code>{`import { parse, checkValidity, checkConsistency, classify } from "@entailer/core";

// Validity: does the conclusion follow from the premises?
checkValidity([parse("p -> q"), parse("p")], parse("q"));
// -> { verdict: "VALID", method: "tableau-refutation", proof: {...} }

// Consistency: can all of these hold at once?
checkConsistency([parse("p -> q"), parse("p -> ~q"), parse("p")]);
// -> { status: "UNSAT", minimalConflictingSubset: [0, 1, 2] }

// Classify a single formula by its truth table
classify(parse("p | ~p"));   // -> { kind: "tautology" }`}</Code>
        <div className="doc-table">
          <table>
            <thead><tr><th>Export</th><th>What it does</th></tr></thead>
            <tbody>
              <tr><td><code>parse(dsl)</code></td><td>DSL string → Formula AST (<code>~ &amp; | -&gt; &lt;-&gt;</code>, ASCII or Unicode)</td></tr>
              <tr><td><code>formulaToString(f)</code></td><td>AST → canonical string, for display</td></tr>
              <tr><td><code>checkValidity(prem, concl)</code></td><td>VALID (+ proof) / INVALID (+ counter-model) / UNKNOWN</td></tr>
              <tr><td><code>checkConsistency(fs)</code></td><td>SAT (+ model) / UNSAT (+ minimal conflicting subset) / UNKNOWN</td></tr>
              <tr><td><code>classify(f)</code></td><td>tautology / contradiction / contingent</td></tr>
              <tr><td><code>refute(fs)</code></td><td>the raw tableau: <code>{`{closed, tree}`}</code> or <code>{`{closed:false, model}`}</code></td></tr>
              <tr><td><code>evaluate / isSat / isValid / firstCounterModel</code></td><td>the truth-table oracle (exhaustive, the trust anchor)</td></tr>
              <tr><td><code>evaluateSentence / evaluateArgument / evaluatePrompt / evaluateMarkdown / evaluateRepo</code></td><td>the tier adapters — each returns a full <code>LogicReport</code></td></tr>
              <tr><td><code>toMarkdown(report)</code></td><td>render a <code>LogicReport</code> as human-readable Markdown</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">
          Rendering lives in <code>@entailer/viz</code>: <code>truthTableView</code> + <code>truthTableToSvg</code>,{" "}
          <code>tableauToText</code> / <code>tableauToMermaid</code>, and <code>verdictBadge</code> (the
          certificate-gated color). The widgets on <Link to="math">The Mathematics</Link> use exactly these.
        </p>
      </section>

      <section id="mcp" className="doc-section">
        <div className="section-head"><span className="n">04</span><h2>MCP server</h2></div>
        <p className="section-lede">
          <code>@entailer/mcp</code> is a stdio MCP server exposing the deterministic tools with structured
          input/output. The default path is one call: the model formalizes in-context, then calls a tool.
        </p>
        <Code>{`# in an MCP client's server config
{ "command": "npx", "args": ["@entailer/mcp"] }`}</Code>
        <div className="doc-table">
          <table>
            <thead><tr><th>Tool</th><th>Tier / purpose</th></tr></thead>
            <tbody>
              <tr><td><code>check_validity</code></td><td>does a supplied argument follow?</td></tr>
              <tr><td><code>check_consistency</code></td><td>is a supplied claim set jointly satisfiable?</td></tr>
              <tr><td><code>classify_formula</code></td><td>tautology / contradiction / contingent</td></tr>
              <tr><td><code>evaluate_sentence</code></td><td>Tier 1 — one claim → full LogicReport</td></tr>
              <tr><td><code>evaluate_argument</code></td><td>an IR argument → LogicReport</td></tr>
              <tr><td><code>evaluate_prompt</code></td><td>Tier 2 — recover the conclusion, then check</td></tr>
              <tr><td><code>evaluate_markdown</code></td><td>Tier 3 — within-doc consistency</td></tr>
              <tr><td><code>evaluate_repo</code></td><td>Tier 4 — cross-file consistency</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">The server is declared in the plugin's <code>plugin/.mcp.json</code>; it is a thin layer over the same core the CLI and this website use.</p>
      </section>

      <section id="tiers" className="doc-section">
        <div className="section-head"><span className="n">05</span><h2>The four tiers</h2></div>
        <p className="section-lede">
          Every tier feeds the <em>same</em> deterministic kernel; a tier differs only in how it chunks the
          input, whether it must recover an implicit conclusion, and the scope over which it checks
          consistency.
        </p>
        <div className="tiers">
          <div className="tier"><span className="lvl">1</span><p><b>Sentence.</b> One claim in, classified: tautology, contingent, contradiction — and vacuous "guarantees" (an unsatisfiable antecedent) flagged rather than laundered into truth.</p></div>
          <div className="tier"><span className="lvl">2</span><p><b>Prompt / argument.</b> Recover the conclusion from indicator words ("therefore", "thus"), fill enthymemes where honest, then check whether the argument follows.</p></div>
          <div className="tier"><span className="lvl">3</span><p><b>Markdown.</b> Extract claims from fenced blocks in one <code>.md</code>, check within-document consistency, and report findings back to <code>path:line</code>.</p></div>
          <div className="tier"><span className="lvl">4</span><p><b>Repo.</b> Select load-bearing docs across a tree, canonicalize predicates, and surface a minimal conflicting set whose claims span different files.</p></div>
        </div>
      </section>

      <section id="ir" className="doc-section">
        <div className="section-head"><span className="n">06</span><h2>IR &amp; the honesty contract</h2></div>
        <p className="section-lede">
          A pluggable translator (LLM-in-the-loop or rule-based) emits a typed <b>IR</b> carrying an
          auditable symbol dictionary; the deterministic core consumes <em>only the IR, never raw text</em>.
          The output is a <code>LogicReport</code> whose schema makes dishonesty unrepresentable.
        </p>
        <ul className="doc-list">
          <li><b>A symbol dictionary is required.</b> Every atom carries its exact English gloss. A report with no visible dictionary fails schema validation — it cannot ship.</li>
          <li><b>Certificate or nothing.</b> <code>verdictBadge</code> colors a report VALID only when a proof is attached, INVALID only when a counter-model is attached, and INCONSISTENT only when a minimal conflicting subset is present. A picture must never launder a guess into a guarantee.</li>
          <li><b>UNKNOWN is first-class.</b> Out-of-fragment input or a low-confidence translation degrades to <code>UNKNOWN</code>, never a guessed VALID/INVALID.</li>
          <li><b>Three fields, never collapsed.</b> validity ≠ truth ≠ faithful-formalization. Premise truth is out of scope by design; the formalization's faithfulness is the human's job, which is why it is always shown.</li>
        </ul>
        <Code>{`import { evaluateMarkdown, toMarkdown } from "@entailer/core";

const report = evaluateMarkdown({ markdown, uri: "spec.md" });
report.verdict;                                   // e.g. "INCONSISTENT"
report.consistency.minimalConflictingSubset;      // e.g. [0, 1, 2]
report.symbolDictionary;                          // [{ symbol, gloss }, ...] — always present
console.log(toMarkdown(report));                  // human-readable writeup`}</Code>
        <p className="hint">
          The full pipeline, IR schema, and tier model live in{" "}
          <a href="https://github.com/barmoshe/entailer/blob/main/DESIGN.md">DESIGN.md</a>.
        </p>
      </section>
    </main>
  );
}
