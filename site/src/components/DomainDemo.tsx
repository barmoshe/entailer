/* ---- Domain lens demo: LIVE concept-faithfulness, computed in-browser ---- *
 * Runs the real @entailer/core `evaluateDomain` on every tab. A concept
 * cluster is declared (the four-sided language); the lens flags where code
 * fuses two concepts the cluster declares disjoint. Only rank-1 is a verdict;
 * an `is-a` overlap (a member that IS a user) stays silent by construction.
 * ------------------------------------------------------------------------- */
import { useMemo, useState } from "react";
import { evaluateDomain, parseDomainSpec, domainVerdict } from "@entailer/core";
import type { Badge } from "../data/scenarios.js";
import { VerdictBadge } from "./VerdictBadge.js";

interface Scn {
  id: string;
  tab: string;
  blurb: string;
  spec: Record<string, unknown>;
  uri: string;
  code: string;
  cmd: string;
}

const SCENARIOS: Scn[] = [
  {
    id: "leak",
    tab: "A concept leak",
    blurb:
      "The cluster declares member and guest mutually exclusive (member is-not guest). One identifier names both — a deterministic contradiction.",
    spec: {
      cluster: "access",
      boundary: ["src/**"],
      concepts: [
        { concept: "member", vocabulary: ["member", "subscriber"] },
        { concept: "guest", vocabulary: ["guest", "anonymous"] },
      ],
      relationships: ["member is-not guest"],
    },
    uri: "src/access.ts",
    code: "export function grantMemberGuest(id: string) {\n  return db.members.find(id);\n}",
    cmd: "entailer domain --lens access.yaml --repo .",
  },
  {
    id: "overlap",
    tab: "A legitimate overlap",
    blurb:
      "Here member IS a user (member is-a user). They co-occur everywhere by design — subsumption is satisfiable by construction, so the lens stays silent. No false positive.",
    spec: {
      cluster: "accounts",
      boundary: ["src/**"],
      concepts: [
        { concept: "member", vocabulary: ["member"] },
        { concept: "user", vocabulary: ["user", "account"] },
      ],
      relationships: ["member is-a user"],
    },
    uri: "src/accounts.ts",
    code: "export function memberFromUser(user: User): Member {\n  return { ...user, tier: \"member\" };\n}",
    cmd: "entailer domain --lens accounts.yaml --repo .",
  },
  {
    id: "calibration",
    tab: "Entailer's own invariant",
    blurb:
      "The lens turned on entailer itself: validity, truth, and faithful-formalization are declared three separate things. report.ts keeps them as three fields — so the lens finds no leak. Its own calibration case.",
    spec: {
      cluster: "entailer-invariant",
      boundary: ["src/**"],
      concepts: [
        { concept: "validity", vocabulary: ["valid", "invalid", "validity"] },
        { concept: "truth", vocabulary: ["truth", "sound", "soundness"] },
        { concept: "faithfulness", vocabulary: ["faithful", "formalization", "gloss"] },
      ],
      relationships: ["validity is-not truth", "truth is-not faithfulness", "validity is-not faithfulness"],
    },
    uri: "report.ts",
    code: "const validitySchema = z.object({ status });\nconst soundnessRisk = [];\nconst symbolDictionary = formalization.map(glossOf);",
    cmd: "entailer domain --lens invariant.yaml --repo .",
  },
];

const badgeFor = (v: "LEAK" | "NO_LEAK_FOUND" | "HINTS_ONLY"): Badge =>
  v === "LEAK" ? "inconsistent" : v === "NO_LEAK_FOUND" ? "valid" : "inconclusive";

const label = (v: "LEAK" | "NO_LEAK_FOUND" | "HINTS_ONLY"): string =>
  v === "LEAK" ? "LEAK" : v === "NO_LEAK_FOUND" ? "NO LEAK FOUND" : "HINTS ONLY";

export function DomainDemo() {
  const [active, setActive] = useState(SCENARIOS[0]!.id);
  const scn = SCENARIOS.find((s) => s.id === active)!;

  const report = useMemo(
    () => evaluateDomain({ spec: parseDomainSpec(scn.spec), files: [{ uri: scn.uri, content: scn.code }] }),
    [scn],
  );
  const verdict = domainVerdict(report);
  const exit = verdict === "LEAK" ? 1 : 0;
  const verdicts = report.findings.filter((f) => f.rank === "rank-1");
  const hints = report.findings.filter((f) => f.rank !== "rank-1");
  const concepts = (scn.spec.concepts as { concept: string }[]).map((c) => c.concept);
  const rels = (scn.spec.relationships as string[]) ?? [];

  return (
    <div className="prd">
      <div className="prd-tabs">
        {SCENARIOS.map((s) => (
          <button key={s.id} className={`prd-tab ${s.id === active ? "on" : ""}`} onClick={() => setActive(s.id)}>
            {s.tab}
          </button>
        ))}
      </div>
      <p className="prd-blurb">{scn.blurb}</p>

      <div className="prd-diff">
        <div className="prd-col">
          <div className="prd-col-head">declaration <span>{String(scn.spec.cluster)}</span></div>
          <div className="prd-doc">
            <div className="prd-doc-name">concepts</div>
            <pre className="prd-doc-body">{concepts.join(" · ")}{"\n"}{rels.join("\n")}</pre>
          </div>
        </div>
        <div className="prd-arrow" aria-hidden="true">→</div>
        <div className="prd-col">
          <div className="prd-col-head">code <span>{scn.uri}</span></div>
          <div className="prd-doc">
            <div className="prd-doc-name">{scn.uri}</div>
            <pre className="prd-doc-body">{scn.code}</pre>
          </div>
        </div>
      </div>

      <div className="prd-controls">
        <div className={`prd-exit ${exit === 0 ? "ok" : "bad"}`}>
          <code>{scn.cmd}</code>
          <span>exit {exit}</span>
        </div>
      </div>

      <div className="prd-result">
        <div className="prd-verdict">
          <VerdictBadge badge={badgeFor(verdict)} label={label(verdict)} />
        </div>
      </div>

      {verdicts.length > 0 && (
        <div className="prd-findings">
          {verdicts.map((f, i) => (
            <div className="prd-frow sev-blocker" key={i}>
              <span className="prd-fname">⛔ {f.name}</span>
              {f.receipts[0]?.uri && (
                <span className="prd-floc">
                  {f.receipts[0].uri}
                  {f.receipts[0].line !== undefined ? `:${f.receipts[0].line}` : ""}
                </span>
              )}
              <span className="prd-fwhy">{f.claim}</span>
            </div>
          ))}
        </div>
      )}

      {hints.length > 0 && (
        <div className="prd-findings dl-hints">
          {hints.map((f, i) => (
            <div className="prd-frow dl-hint" key={i}>
              <span className="prd-fname">🔎 reader hint</span>
              <span className="prd-fwhy">{f.question}</span>
            </div>
          ))}
        </div>
      )}

      {verdicts.length === 0 && report.noLeakFound && (
        <p className="prd-story">
          <code>noLeakFound</code> — no deterministic concept leak surfaced. Heuristic, not a proof of
          faithfulness; only a human, and the coverage caveat, close that gap.
        </p>
      )}
    </div>
  );
}
