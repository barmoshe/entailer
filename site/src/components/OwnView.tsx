import { useMemo, useState } from "react";
import { ParseError, evaluateMarkdown, type LogicReport } from "@entailer/core";
import { verdictBadge } from "@entailer/viz";
import type { Badge } from "../data/scenarios.js";
import { VerdictBadge } from "./VerdictBadge.js";

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

/** The live Tier-3 sandbox — a real @entailer/core markdown evaluation. */
export function OwnView() {
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
