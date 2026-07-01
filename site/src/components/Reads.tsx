import { formulaToString, parse } from "@entailer/core";
import type { Analysis } from "../data/scenarios.js";

/** "How entailer reads it" — the symbol dictionary + the formalization it judged. */
export function Reads({ a }: { a: Analysis }) {
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
