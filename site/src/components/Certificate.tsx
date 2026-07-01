import type { Analysis } from "../data/scenarios.js";

/** The verdict certificate — a counter-model, a minimal conflicting set, or a
 * proof/classification note. Never rendered without the witness it describes. */
export function Certificate({ a }: { a: Analysis }) {
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
