import { useState } from "react";
import { ParseError } from "@entailer/core";
import type { Analysis, Scenario } from "../data/scenarios.js";
import { analyze } from "../lib/analyze.js";
import { Artifact } from "./Artifact.js";
import { Certificate } from "./Certificate.js";
import { Reads } from "./Reads.js";
import { VerdictBadge } from "./VerdictBadge.js";

/** The open exhibit sheet: the artifact (English) on the left, the live verdict
 * + certificate on the right, with the formalization tucked behind a disclosure. */
export function ScenarioView({ scenario }: { scenario: Scenario }) {
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
