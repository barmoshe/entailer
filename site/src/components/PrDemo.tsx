/* ---- Tier-5 PR demo: a LIVE base→head delta, computed in-browser ---- *
 * Unlike the Tier-4 map (a representative mockup), this runs the real
 * @entailer/core `evaluatePr` on every toggle. Flip the gate on the
 * "pre-existing" scenario to see the honest pass: an inconsistent head that
 * the PR did not regress is a legitimate green.
 * ------------------------------------------------------------------ */
import { useMemo, useState } from "react";
import { evaluatePr, type PrGate } from "@entailer/core";
import type { Badge } from "../data/scenarios.js";
import { VerdictBadge } from "./VerdictBadge.js";

interface Doc {
  uri: string;
  content: string;
}
interface Scn {
  id: string;
  tab: string;
  blurb: string;
  base: Doc[];
  head: Doc[];
  changed: string[]; // head uris that are new/changed vs base
}

const fence = (body: string): string => "```entailer\n" + body + "\n```\n";

// A consistent base spec: auth-required implies not-public.
const AUTH_OK = fence(`let auth = the request requires auth
let public = the route is public
auth -> ~public`);

// The same spec, already self-contradictory (asserts auth & public too).
const AUTH_DIRTY = fence(`let auth = the request requires auth
let public = the route is public
auth -> ~public
auth
public`);

const SCENARIOS: Scn[] = [
  {
    id: "introduces",
    tab: "PR introduces a bug",
    blurb: "A new doc asserts a public, authed route — contradicting the base spec. The PR is on the hook for it.",
    base: [{ uri: "spec/auth.md", content: AUTH_OK }],
    head: [
      { uri: "spec/auth.md", content: AUTH_OK },
      { uri: "feat/guest-read.md", content: fence("auth\npublic") },
    ],
    changed: ["feat/guest-read.md"],
  },
  {
    id: "preexisting",
    tab: "Pre-existing mess",
    blurb: "The base spec was already inconsistent. This PR only edits an unrelated doc — it introduced nothing. Flip the gate.",
    base: [{ uri: "spec/auth.md", content: AUTH_DIRTY }],
    head: [
      { uri: "spec/auth.md", content: AUTH_DIRTY },
      { uri: "docs/readme.md", content: fence("let ships = the feature ships this week\nships") },
    ],
    changed: ["docs/readme.md"],
  },
  {
    id: "fixes",
    tab: "PR fixes a bug",
    blurb: "The base spec was inconsistent; this PR drops the offending claims. The head is clean again.",
    base: [{ uri: "spec/auth.md", content: AUTH_DIRTY }],
    head: [{ uri: "spec/auth.md", content: AUTH_OK }],
    changed: ["spec/auth.md"],
  },
];

const badgeFor = (verdict: string): Badge =>
  verdict === "INCONSISTENT" ? "inconsistent" : verdict === "NO_ISSUE_FOUND" ? "valid" : "inconclusive";

/** Strip the fenced-block wrapper to show just the claim lines. */
const claimLines = (content: string): string[] =>
  content
    .replace(/```entailer\n?/g, "")
    .replace(/```/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export function PrDemo() {
  const [active, setActive] = useState(SCENARIOS[0]!.id);
  const [gate, setGate] = useState<PrGate>("head");
  const scn = SCENARIOS.find((s) => s.id === active)!;

  const report = useMemo(
    () => evaluatePr({ base: scn.base, head: scn.head, gate, metadata: { number: 128 } }),
    [scn, gate],
  );
  const delta = report.delta!;
  const exit = report.verdict === "INCONSISTENT" ? 1 : 0;

  const story = (() => {
    if (delta.head === "SAT" && delta.fixed > 0) return "This PR resolves a contradiction that existed in the base — the head is satisfiable again.";
    if (delta.head === "SAT") return "Clean: the base was consistent and this PR keeps it that way.";
    if (delta.introduced > 0) return `This PR introduces ${delta.introduced} new contradiction(s) — blocked under either gate.`;
    // head UNSAT, introduced 0
    return gate === "head"
      ? `The head is inconsistent, but from ${delta.preExisting} pre-existing contradiction(s) — not this PR. gate=head blocks it; switch to gate=introduced.`
      : `Honest pass: the head still carries ${delta.preExisting} pre-existing contradiction(s), but this PR introduced none, so the regression gate is green.`;
  })();

  return (
    <div className="prd">
      <div className="prd-tabs">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className={`prd-tab ${s.id === active ? "on" : ""}`}
            onClick={() => setActive(s.id)}
          >
            {s.tab}
          </button>
        ))}
      </div>
      <p className="prd-blurb">{scn.blurb}</p>

      <div className="prd-diff">
        <div className="prd-col">
          <div className="prd-col-head">base <span>main</span></div>
          {scn.base.map((d) => (
            <DocCard key={d.uri} doc={d} />
          ))}
        </div>
        <div className="prd-arrow" aria-hidden="true">→</div>
        <div className="prd-col">
          <div className="prd-col-head">head <span>PR #128</span></div>
          {scn.head.map((d) => (
            <DocCard key={d.uri} doc={d} changed={scn.changed.includes(d.uri)} />
          ))}
        </div>
      </div>

      <div className="prd-controls">
        <div className="prd-gate">
          <span className="prd-gate-lbl">gate</span>
          {(["head", "introduced"] as PrGate[]).map((g) => (
            <button key={g} className={`prd-gbtn ${gate === g ? "on" : ""}`} onClick={() => setGate(g)}>
              {g}
            </button>
          ))}
        </div>
        <div className={`prd-exit ${exit === 0 ? "ok" : "bad"}`}>
          <code>entailer pr 128 --gate {gate}</code>
          <span>exit {exit}</span>
        </div>
      </div>

      <div className="prd-result">
        <div className="prd-verdict">
          <VerdictBadge badge={badgeFor(report.verdict)} label={report.verdict.replace(/_/g, " ")} />
        </div>
        <div className="prd-delta">
          <div className="prd-chip"><span>base</span><b>{delta.base}</b></div>
          <div className="prd-chip"><span>head</span><b>{delta.head}</b></div>
          <div className="prd-chip bad"><span>introduced</span><b>{delta.introduced}</b></div>
          <div className="prd-chip ok"><span>fixed</span><b>{delta.fixed}</b></div>
          <div className="prd-chip warn"><span>pre-existing</span><b>{delta.preExisting}</b></div>
        </div>
      </div>

      <p className="prd-story">{story}</p>

      {report.findings.length > 0 && (
        <div className="prd-findings">
          {report.findings.map((f, i) => (
            <div className={`prd-frow sev-${f.severity}`} key={i}>
              <span className="prd-fname">{f.name}</span>
              {f.location?.uri && <span className="prd-floc">{f.location.uri}:{f.location.line}</span>}
              <span className="prd-fwhy">{f.why}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocCard({ doc, changed }: { doc: Doc; changed?: boolean }) {
  return (
    <div className={`prd-doc ${changed ? "changed" : ""}`}>
      <div className="prd-doc-name">
        {doc.uri}
        {changed && <span className="prd-doc-tag">changed</span>}
      </div>
      <pre className="prd-doc-body">{claimLines(doc.content).join("\n")}</pre>
    </div>
  );
}
