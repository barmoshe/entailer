import { useMemo, useState } from "react";
import { ParseError, atomsOf, isPropositional, parse } from "@entailer/core";
import { truthTableToSvg, truthTableView } from "@entailer/viz";
import { recolorTruthTable } from "../lib/recolor.js";

/** An editable formula → live truth table, rendered by the real @entailer/viz
 * oracle and recolored to the watercolor palette. Guards the same way the
 * sentence exhibit does: propositional only, at most 4 atoms (16 rows). */
export function TruthTableCard({ initial = "p -> q" }: { initial?: string }) {
  const [src, setSrc] = useState(initial);
  const out = useMemo(() => {
    if (!src.trim()) return { error: null as string | null, svg: null as string | null };
    try {
      const f = parse(src);
      if (!isPropositional(f)) {
        return { error: "Not propositional — truth tables cover the decidable propositional fragment.", svg: null };
      }
      if (atomsOf(f).length > 4) {
        return { error: "Too many atoms to draw (≤ 4 keeps the table to 16 rows).", svg: null };
      }
      return { error: null, svg: recolorTruthTable(truthTableToSvg(truthTableView(f))) };
    } catch (e) {
      return { error: e instanceof ParseError ? e.message : String(e), svg: null };
    }
  }, [src]);

  return (
    <div className="widget">
      <label className="widget-label">
        formula
        <input className="widget-input" value={src} onChange={(e) => setSrc(e.target.value)} spellCheck={false} />
      </label>
      {out.error && <p className="err">{out.error}</p>}
      {out.svg && <div className="svgwrap" dangerouslySetInnerHTML={{ __html: out.svg }} />}
      <p className="hint">
        A row where the whole formula is <b>false</b> is a countermodel; if there are none, the formula is a
        tautology. Try <code>p | ~p</code>, <code>(p -&gt; q) &amp; p -&gt; q</code>, or <code>p &amp; ~p</code>.
      </p>
    </div>
  );
}
