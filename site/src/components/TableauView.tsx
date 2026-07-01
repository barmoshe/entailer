import { useMemo } from "react";
import {
  ParseError,
  checkValidity,
  formulaToString,
  not,
  parse,
} from "@entailer/core";
import { tableauToText } from "@entailer/viz";
import type { Gloss } from "../data/scenarios.js";
import { glossFor } from "../lib/analyze.js";
import { VerdictBadge } from "./VerdictBadge.js";

/** Refutation walkthrough: assume every premise and the *negated* conclusion,
 * then run the tableau. Closed ⇒ VALID (show the proof tree); open ⇒ INVALID
 * (show the witnessed counter-model). Driven entirely by @entailer/core. */
export function TableauView({
  premises,
  conclusion,
  glosses = [],
}: {
  premises: string[];
  conclusion: string;
  glosses?: Gloss[];
}) {
  const out = useMemo(() => {
    try {
      const prem = premises.map(parse);
      const conc = parse(conclusion);
      const result = checkValidity(prem, conc);
      const assumed = [
        ...prem.map(formulaToString),
        `¬(${formulaToString(conc)})`,
      ];
      return { result, assumed, negated: formulaToString(not(conc)), error: null as string | null };
    } catch (e) {
      return { result: null, assumed: [], negated: "", error: e instanceof ParseError ? e.message : String(e) };
    }
  }, [premises, conclusion]);

  if (out.error || !out.result) return <p className="err">{out.error}</p>;
  const { result } = out;

  return (
    <div className="tableau">
      <div className="tableau-setup">
        <div className="col-head">The refutation attempt</div>
        <p className="hint" style={{ marginTop: 0 }}>
          To test whether the conclusion follows, entailer assumes every premise <em>and the negation of the
          conclusion</em>, then looks for any consistent case:
        </p>
        <ul className="assume-list">
          {out.assumed.map((f, i) => (
            <li key={i}><code>{f}</code></li>
          ))}
        </ul>
      </div>

      {result.verdict === "VALID" && result.proof && (
        <div className="tableau-result">
          <VerdictBadge badge={result.vacuous ? "unknown" : "valid"} label={result.vacuous ? "VACUOUSLY VALID" : "VALID"} />
          <p className="summary">
            Every branch of the tableau closes (marked <code>✕</code>) — the assumption is contradictory, so no
            counterexample exists. The conclusion follows.
          </p>
          <pre className="prooftree">{tableauToText(result.proof)}</pre>
        </div>
      )}

      {result.verdict === "INVALID" && (
        <div className="tableau-result">
          <VerdictBadge badge="invalid" label="INVALID" />
          <p className="summary">
            A branch stays open — that open branch is a real case where every premise holds but the conclusion
            fails. The conclusion does not follow.
          </p>
          <div className="cert invalid">
            <div className="cert-head">Counterexample</div>
            <div className="model">
              {Object.entries(result.counterModel ?? {}).map(([sym, v]) => (
                <div className="mrow" key={sym}>
                  <span className={`tf ${v ? "t" : "f"}`}>{v ? "TRUE" : "FALSE"}</span>
                  <span>{glosses.length ? glossFor(glosses, sym) : sym}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {result.verdict === "UNKNOWN" && (
        <div className="tableau-result">
          <VerdictBadge badge="unknown" label="UNKNOWN" />
          <p className="summary">{result.reason ?? "Outside the decidable fragment — entailer refuses to guess."}</p>
        </div>
      )}
    </div>
  );
}
