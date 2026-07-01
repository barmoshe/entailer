/**
 * @entailer/viz — deterministic visualizers (DESIGN §8).
 *
 * Engine output → typed **view-models** → dependency-free renderers (text, SVG,
 * Mermaid). No layout libraries, no Mermaid runtime: `toMermaid` returns a
 * string. Everything is a pure function of its input, so the same render is
 * reproducible.
 *
 * The hard invariant (DESIGN §8): a view colors something **VALID** only when a
 * proof/UNSAT certificate is present, **INVALID** only when a witnessed
 * counter-model is present; everything else is an explicit inconclusive state. A
 * picture must not launder a guess into a guarantee.
 */
import {
  allAssignments,
  atomsOf,
  evaluate,
  formulaToString,
  type Assignment,
  type DomainReport,
  type Formula,
  type LogicReport,
  type ProofTree,
  type Verdict,
} from "@entailer/core";

// ---- Verdict gating -------------------------------------------------------

export type VerdictBadge = "valid" | "invalid" | "inconsistent" | "inconclusive";

/**
 * The certificate-gated badge for a report. Returns `valid`/`invalid` only when
 * the certificate that licenses them is actually attached; otherwise
 * `inconclusive`. This is the renderer's single source of truth for color.
 */
export function verdictBadge(report: LogicReport): VerdictBadge {
  switch (report.verdict) {
    case "VALID":
      return report.validity.proof !== undefined ? "valid" : "inconclusive";
    case "INVALID":
      return report.validity.counterModel !== undefined ? "invalid" : "inconclusive";
    case "INCONSISTENT":
      return (report.consistency.minimalConflictingSubset?.length ?? 0) > 0
        ? "inconsistent"
        : "inconclusive";
    default:
      return "inconclusive"; // NO_ISSUE_FOUND, UNKNOWN, GAP
  }
}

// ---- TruthTableView -------------------------------------------------------

export interface TruthTableRow {
  readonly assignment: Assignment;
  readonly value: boolean;
}
export interface TruthTableView {
  readonly formula: string;
  readonly vars: string[];
  readonly rows: TruthTableRow[];
}

/** Build an exhaustive truth-table view-model for a propositional formula. */
export function truthTableView(f: Formula): TruthTableView {
  const vars = atomsOf(f);
  const rows: TruthTableRow[] = [];
  for (const assignment of allAssignments(vars)) {
    rows.push({ assignment: { ...assignment }, value: evaluate(f, assignment) });
  }
  return { formula: formulaToString(f), vars, rows };
}

const tf = (b: boolean): string => (b ? "T" : "F");

/** Render a truth table as a monospace text grid. */
export function truthTableToText(view: TruthTableView): string {
  const header = [...view.vars, view.formula];
  const widths = header.map((h) => h.length);
  const line = (cells: string[]) =>
    "| " + cells.map((c, i) => c.padEnd(widths[i]!)).join(" | ") + " |";
  const sep = "|" + widths.map((w) => "-".repeat(w + 2)).join("|") + "|";
  const out = [line(header), sep];
  for (const r of view.rows) {
    out.push(line([...view.vars.map((v) => tf(r.assignment[v] ?? false)), tf(r.value)]));
  }
  return out.join("\n");
}

/** Render a truth table as a self-contained SVG (no external fonts/layout). */
export function truthTableToSvg(view: TruthTableView): string {
  const cols = [...view.vars, view.formula];
  const cw = 14;
  const colW = cols.map((c) => Math.max(36, c.length * cw + 16));
  const rowH = 24;
  const x0 = (i: number) => colW.slice(0, i).reduce((a, b) => a + b, 0);
  const width = x0(cols.length);
  const height = rowH * (view.rows.length + 1);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const cells: string[] = [];
  cols.forEach((c, i) => {
    cells.push(
      `<rect x="${x0(i)}" y="0" width="${colW[i]}" height="${rowH}" fill="#1f2937"/>`,
      `<text x="${x0(i) + colW[i]! / 2}" y="16" fill="#fff" font-family="monospace" font-size="13" text-anchor="middle">${esc(c)}</text>`,
    );
  });
  view.rows.forEach((r, ri) => {
    const y = rowH * (ri + 1);
    const rowFill = r.value ? "#ffffff" : "#fee2e2"; // falsifying rows tinted
    cols.forEach((_, i) => {
      const text =
        i < view.vars.length ? tf(r.assignment[view.vars[i]!] ?? false) : tf(r.value);
      cells.push(
        `<rect x="${x0(i)}" y="${y}" width="${colW[i]}" height="${rowH}" fill="${rowFill}" stroke="#e5e7eb"/>`,
        `<text x="${x0(i) + colW[i]! / 2}" y="${y + 16}" font-family="monospace" font-size="13" text-anchor="middle">${text}</text>`,
      );
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${cells.join("")}</svg>`;
}

// ---- TableauTreeView ------------------------------------------------------

/** Render a closed tableau proof tree as a Mermaid graph string. */
export function tableauToMermaid(tree: ProofTree): string {
  const lines = ["graph TD"];
  for (const n of tree.nodes) {
    const label = n.closedBy !== undefined ? `${n.label} ✕` : n.label;
    const safe = label.replace(/"/g, "'");
    lines.push(`  n${n.id}["${safe}"]`);
  }
  for (const e of tree.edges) lines.push(`  n${e.from} --> n${e.to}`);
  // mark closed leaves
  for (const n of tree.nodes) {
    if (n.closedBy !== undefined) lines.push(`  class n${n.id} closed;`);
  }
  lines.push("  classDef closed fill:#fee2e2,stroke:#dc2626;");
  return lines.join("\n");
}

/** Render a tableau proof tree as an indented text outline. */
export function tableauToText(tree: ProofTree): string {
  const children = new Map<number, number[]>();
  for (const e of tree.edges) {
    const arr = children.get(e.from) ?? [];
    arr.push(e.to);
    children.set(e.from, arr);
  }
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  const walk = (id: number, depth: number): void => {
    const n = byId.get(id);
    if (!n) return;
    const mark = n.closedBy !== undefined ? "  ✕ closed" : "";
    out.push(`${"  ".repeat(depth)}${n.label}${mark}`);
    for (const c of children.get(id) ?? []) walk(c, depth + 1);
  };
  walk(tree.rootId, 0);
  return out.join("\n");
}

// ---- CounterModelView -----------------------------------------------------

/** Render a counter-model assignment as `a=T, b=F`. */
export function counterModelToText(model: Assignment): string {
  return Object.entries(model)
    .map(([k, v]) => `${k}=${tf(v)}`)
    .join(", ");
}

// ---- ClaimGraphView (Tier 3/4) --------------------------------------------

export interface ClaimGraphNode {
  readonly id: string;
  readonly label: string;
  readonly uri?: string;
  readonly line?: number;
  readonly inConflict: boolean;
}
export interface ClaimGraphView {
  readonly verdict: Verdict;
  readonly nodes: ClaimGraphNode[];
}

/**
 * A claim graph from a Tier-3/4 report: one node per formalized claim, with the
 * minimal-conflicting-subset members flagged. The conflict "heatmap" is just
 * node fill by conflict participation.
 */
export function claimGraphView(report: LogicReport): ClaimGraphView {
  const conflict = new Set(report.consistency.minimalConflictingSubset ?? []);
  const nodes = report.formalization.map((f, i) => {
    const n: ClaimGraphNode = {
      id: f.id,
      label: f.formal,
      ...(f.source?.uri !== undefined ? { uri: f.source.uri } : {}),
      ...(f.source?.line !== undefined ? { line: f.source.line } : {}),
      inConflict: conflict.has(i),
    };
    return n;
  });
  return { verdict: report.verdict, nodes };
}

/** Render a claim graph as Mermaid; conflicting claims are highlighted. */
export function claimGraphToMermaid(view: ClaimGraphView): string {
  const lines = ["graph LR"];
  for (const n of view.nodes) {
    const loc = n.uri ? `<br/>${n.uri}${n.line !== undefined ? `:${n.line}` : ""}` : "";
    const safe = `${n.label}${loc}`.replace(/"/g, "'");
    lines.push(`  ${n.id}["${safe}"]`);
    if (n.inConflict) lines.push(`  class ${n.id} conflict;`);
  }
  lines.push("  classDef conflict fill:#fee2e2,stroke:#dc2626;");
  return lines.join("\n");
}

// ---- DomainMapView (concept-faithfulness lens) ----------------------------

/**
 * The lens badge, certificate-gated like {@link verdictBadge}: `leak` only for a
 * deterministic rank-1 verdict, `clean` only when nothing surfaced, and
 * `inconclusive` when only reader hints exist — a hint can never light up as
 * clean *or* leak.
 */
export type DomainBadge = "leak" | "clean" | "inconclusive";

export function domainBadge(report: DomainReport): DomainBadge {
  if (report.findings.some((f) => f.rank === "rank-1")) return "leak";
  if (report.findings.length > 0) return "inconclusive"; // hints only — a human must read
  return report.noLeakFound ? "clean" : "inconclusive";
}

export interface DomainMapNode {
  readonly id: string;
  readonly label: string;
  readonly uri?: string;
  readonly line?: number;
  readonly rank: "rank-1" | "rank-2" | "rank-3";
}
export interface DomainMapView {
  readonly cluster: string;
  readonly badge: DomainBadge;
  readonly nodes: DomainMapNode[];
}

/** One node per finding; rank-1 verdicts flagged apart from rank-2/3 hints. */
export function domainMapView(report: DomainReport): DomainMapView {
  const nodes = report.findings.map((f, i) => {
    const first = f.receipts[0];
    const node: DomainMapNode = {
      id: `f${i}`,
      label: `${f.name} [${f.concepts.join("×")}]`,
      ...(first?.uri !== undefined ? { uri: first.uri } : {}),
      ...(first?.line !== undefined ? { line: first.line } : {}),
      rank: f.rank,
    };
    return node;
  });
  return { cluster: report.cluster, badge: domainBadge(report), nodes };
}

/**
 * Render the map as Mermaid. Rank-1 verdicts reuse the solid red `conflict`
 * class; hints get a distinct dashed `hint` class so a picture never launders a
 * hint into a verdict.
 */
export function domainMapToMermaid(view: DomainMapView): string {
  const lines = ["graph LR"];
  for (const n of view.nodes) {
    const loc = n.uri ? `<br/>${n.uri}${n.line !== undefined ? `:${n.line}` : ""}` : "";
    const safe = `${n.label}${loc}`.replace(/"/g, "'");
    lines.push(`  ${n.id}["${safe}"]`);
    lines.push(`  class ${n.id} ${n.rank === "rank-1" ? "conflict" : "hint"};`);
  }
  lines.push("  classDef conflict fill:#fee2e2,stroke:#dc2626;");
  lines.push("  classDef hint fill:#fef9c3,stroke:#ca8a04,stroke-dasharray: 4 2;");
  return lines.join("\n");
}
