import type { Stmt } from "../data/scenarios.js";

export function Artifact({ statements, highlight }: { statements: Stmt[]; highlight: Set<number> }) {
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
