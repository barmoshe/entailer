/**
 * The domain-entailment output contract — a sibling of `LogicReport`, on an
 * orthogonal axis (concept faithfulness, not logical validity). Dishonesty is
 * *unrepresentable*: the same discipline `report.ts` uses (`.superRefine` + a
 * `build*` assembler that fills honest defaults, then `parse`s).
 *
 * The one load-bearing rule: **only rank-1 is a verdict.** A rank-1 finding is a
 * deterministic contradiction — a single identifier fusing two concepts the
 * cluster declares disjoint, or a self-contradictory declaration — and it must
 * carry a ≥2-member minimal conflicting subset. Ranks 2–3 are *reader hints*
 * (`readerAssisted`), can never be `blocker`, and can never render in the
 * certificate register. `noLeakFound` is the analogue of `noContradictionFound`:
 * "no deterministic leak surfaced", never "proven faithful".
 */
import { z } from "zod";
import { severitySchema } from "./report.js";
import { HONESTY_CONTRACT } from "./generated/taxonomy.js";

export const domainRankSchema = z.enum(["rank-1", "rank-2", "rank-3"]);
export type DomainRank = z.infer<typeof domainRankSchema>;

export const domainEvidenceSchema = z.enum([
  "CONTRADICTION", // rank-1: an identifier fuses two disjoint concepts
  "DECLARATION", // rank-1: the declaration contradicts itself (honest recursion)
  "SPLIT-PERSONALITY", // rank-2: disjoint concepts entangled across sites (hint)
  "PROSE-VS-PRACTICE", // rank-3: prose says one thing, code does another (hint, deferred)
]);
export type DomainEvidence = z.infer<typeof domainEvidenceSchema>;

/** `path:line` provenance; `note` names the concept-token the receipt witnesses. */
export const domainLocationSchema = z.object({
  uri: z.string().optional(),
  line: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
});
export type DomainLocation = z.infer<typeof domainLocationSchema>;

export const domainFindingSchema = z.object({
  rank: domainRankSchema,
  evidenceType: domainEvidenceSchema,
  name: z.string().min(1),
  severity: severitySchema,
  /** True for every rank-2/3 hint; false only for a rank-1 verdict. */
  readerAssisted: z.boolean().default(false),
  concepts: z.array(z.string()).default([]),
  receipts: z.array(domainLocationSchema).min(1),
  /** Indices into `receipts` forming the contradiction — required for rank-1, ≥2 members. */
  minimalConflictingSubset: z.array(z.number().int().nonnegative()).optional(),
  /** The asserted claim for a verdict; "" for a hint (a hint asserts nothing). */
  claim: z.string(),
  /** The single question the human answers to adjudicate this finding. */
  question: z.string().min(1),
});
export type DomainFinding = z.infer<typeof domainFindingSchema>;

const selectionEntrySchema = z.object({
  uri: z.string(),
  included: z.boolean(),
  role: z.string(),
  reason: z.string(),
});

export const domainReportSchema = z
  .object({
    cluster: z.string().min(1),
    mode: z.enum(["pr", "repo"]),
    findings: z.array(domainFindingSchema).default([]),
    symbolDictionary: z.array(z.object({ symbol: z.string(), gloss: z.string() })).default([]),
    selectionManifest: z.array(selectionEntrySchema).default([]),
    coverageCaveat: z.string().min(1),
    /** Set instead of any "proven faithful" wording when no rank-1 verdict surfaced. */
    noLeakFound: z.boolean().optional(),
    honestyContract: z.string().min(1, "the honesty contract is required"),
  })
  .superRefine((r, ctx) => {
    r.findings.forEach((f, i) => {
      const isVerdict = f.rank === "rank-1";
      if (isVerdict) {
        if (f.readerAssisted) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "rank-1 is a verdict and cannot be readerAssisted",
            path: ["findings", i, "readerAssisted"],
          });
        }
        if (!f.minimalConflictingSubset || f.minimalConflictingSubset.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "rank-1 requires a minimal conflicting subset of at least two receipts",
            path: ["findings", i, "minimalConflictingSubset"],
          });
        }
      } else {
        if (!f.readerAssisted) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "rank-2/3 is a reader hint and must set readerAssisted",
            path: ["findings", i, "readerAssisted"],
          });
        }
        if (f.severity === "blocker") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "a reader hint (rank-2/3) can never be a blocker",
            path: ["findings", i, "severity"],
          });
        }
        if (f.claim !== "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "a reader hint asserts nothing; its claim must be empty",
            path: ["findings", i, "claim"],
          });
        }
      }
    });
  });

export type DomainReport = z.infer<typeof domainReportSchema>;

export interface BuildDomainReportInput {
  cluster: string;
  mode: "pr" | "repo";
  findings?: z.input<typeof domainFindingSchema>[];
  symbolDictionary?: { symbol: string; gloss: string }[];
  selectionManifest?: z.input<typeof selectionEntrySchema>[];
  coverageCaveat: string;
  honestyContract?: string;
}

/**
 * Assemble + validate a {@link DomainReport}. Fills `noLeakFound` (true when no
 * rank-1 verdict surfaced) and the honesty contract, then runs the schema so any
 * dishonest report throws here rather than leaking to a caller.
 */
export function buildDomainReport(input: BuildDomainReportInput): DomainReport {
  const findings = input.findings ?? [];
  const hasVerdict = findings.some((f) => f.rank === "rank-1");
  return domainReportSchema.parse({
    cluster: input.cluster,
    mode: input.mode,
    findings,
    symbolDictionary: input.symbolDictionary ?? [],
    selectionManifest: input.selectionManifest ?? [],
    coverageCaveat: input.coverageCaveat,
    noLeakFound: hasVerdict ? undefined : true,
    honestyContract: input.honestyContract ?? HONESTY_CONTRACT,
  });
}

/** Domain-lens verdict summary: a deterministic leak, a clean pass, or hints only. */
export function domainVerdict(report: DomainReport): "LEAK" | "NO_LEAK_FOUND" | "HINTS_ONLY" {
  if (report.findings.some((f) => f.rank === "rank-1")) return "LEAK";
  if (report.findings.length > 0) return "HINTS_ONLY";
  return "NO_LEAK_FOUND";
}

function renderReceipt(loc: DomainLocation): string {
  const where = loc.line !== undefined ? `${loc.uri ? `${loc.uri}:` : "line "}${loc.line}` : loc.uri ?? "?";
  return loc.note ? `\`${where}\` (${loc.note})` : `\`${where}\``;
}

/**
 * Human-readable Markdown. Verdicts (rank-1) and reader hints (rank 2–3) render
 * in **separate registers** so a hint can never be mistaken for a certificate.
 */
export function domainToMarkdown(report: DomainReport): string {
  const lines: string[] = [];
  lines.push(`# Domain-entailment report — cluster \`${report.cluster}\` (${report.mode} mode)`);

  const verdicts = report.findings.filter((f) => f.rank === "rank-1");
  const hints = report.findings.filter((f) => f.rank !== "rank-1");

  lines.push("\n## Verdicts (rank-1 — deterministic contradictions)");
  if (verdicts.length === 0) {
    lines.push(
      report.noLeakFound
        ? "- ✅ `noLeakFound` — no deterministic concept leak surfaced (not a proof of faithfulness)."
        : "- _(none)_",
    );
  } else {
    for (const f of verdicts) {
      lines.push(`- ⛔ **${f.name}** [${f.evidenceType}] — ${f.claim}`);
      lines.push(`  - concepts: ${f.concepts.map((c) => `\`${c}\``).join(", ")}`);
      lines.push(`  - receipts: ${f.receipts.map(renderReceipt).join(", ")}`);
      lines.push(`  - ❓ ${f.question}`);
    }
  }

  lines.push("\n## Reader hints (rank 2–3 — not asserted, a human must read)");
  if (hints.length === 0) {
    lines.push("- _(none)_");
  } else {
    for (const f of hints) {
      lines.push(`- 🔎 _${f.name}_ [${f.evidenceType}, ${f.severity}] — reader-assisted hint`);
      lines.push(`  - concepts: ${f.concepts.map((c) => `\`${c}\``).join(", ")}`);
      lines.push(`  - where: ${f.receipts.map(renderReceipt).join(", ")}`);
      lines.push(`  - ❓ ${f.question}`);
    }
  }

  if (report.selectionManifest.length > 0) {
    lines.push("\n## Selection manifest");
    for (const m of report.selectionManifest) {
      lines.push(`- ${m.included ? "✓" : "✗"} \`${m.uri}\` (${m.role}) — ${m.reason}`);
    }
  }

  lines.push("\n## Coverage caveat");
  lines.push(`- ${report.coverageCaveat}`);

  lines.push("\n---");
  lines.push(`_${report.honestyContract}_`);
  return lines.join("\n");
}
