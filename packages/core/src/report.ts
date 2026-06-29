/**
 * The output contract where dishonesty is *unrepresentable* (DESIGN §9).
 *
 * `validity ≠ truth ≠ faithful-formalization` are three independent fields. The
 * honesty invariants are encoded as Zod refinements, not as convention: a report
 * that asserts VALID/INVALID with no visible formalization, or INVALID with no
 * counter-model, or INCONSISTENT with no minimal conflicting subset, **fails
 * `parse`**. Clean consistency serializes as `noContradictionFound`, never as a
 * claim that the spec was "proven consistent".
 */
import { z } from "zod";

export const verdictSchema = z.enum([
  "VALID",
  "INVALID",
  "INCONSISTENT",
  "GAP",
  "UNKNOWN",
  "NO_ISSUE_FOUND",
]);
export type Verdict = z.infer<typeof verdictSchema>;

export const severitySchema = z.enum(["blocker", "major", "minor", "note"]);
export type Severity = z.infer<typeof severitySchema>;

/** The ref-99 disclosure, attached to every report. */
export const HONESTY_CONTRACT =
  "This report certifies the logical validity and consistency of the displayed " +
  "formalization only. Validity is not truth: a valid argument can rest on false " +
  "premises, and premise truth is out of scope. The formalization is a translation " +
  "of the prose and may be unfaithful; audit the symbol dictionary. The absence of " +
  "a found contradiction is not a proof of consistency.";

const assignmentSchema = z.record(z.string(), z.boolean());

const symbolEntrySchema = z.object({ symbol: z.string(), gloss: z.string() });

const formalizationEntrySchema = z.object({
  id: z.string(),
  english: z.string(),
  formal: z.string(),
  role: z.enum(["premise", "premise-supplied", "conclusion"]),
  logicSystem: z.string(),
  translationConfidence: z
    .object({ band: z.enum(["low", "med", "high"]), score: z.number().min(0).max(1) })
    .optional(),
});

const validitySchema = z.object({
  status: verdictSchema,
  method: z.string(),
  proof: z.unknown().optional(),
  counterModel: assignmentSchema.optional(),
  vacuous: z.boolean().optional(),
});

const consistencySchema = z.object({
  status: z.enum(["SAT", "UNSAT", "UNKNOWN"]),
  model: assignmentSchema.optional(),
  minimalConflictingSubset: z.array(z.number().int()).optional(),
  /** Set instead of any "proven consistent" wording when the set is clean. */
  noContradictionFound: z.boolean().optional(),
});

const flattenedSchema = z.object({
  text: z.string(),
  kind: z.enum([
    "modal",
    "deontic",
    "temporal",
    "probabilistic",
    "causal",
    "vague",
    "higher-order",
    "generalized-quantifier",
    "ambiguous-reading",
  ]),
});

const findingSchema = z.object({
  severity: severitySchema,
  name: z.string(),
  signature: z.string(),
  why: z.string(),
});

export const logicReportSchema = z
  .object({
    target: z.object({ tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), uri: z.string().optional() }),
    verdict: verdictSchema,
    validity: validitySchema,
    consistency: consistencySchema,
    soundnessRisk: z.array(z.object({ note: z.string() })).default([]),
    symbolDictionary: z.array(symbolEntrySchema),
    formalization: z.array(formalizationEntrySchema),
    flattened: z.array(flattenedSchema).default([]),
    verdictConfidence: z.object({ band: z.enum(["high", "low"]), reason: z.string() }),
    findings: z.array(findingSchema).default([]),
    translationConfidence: z
      .object({ band: z.enum(["low", "med", "high"]), score: z.number().min(0).max(1) })
      .optional(),
    honestyContract: z.string().min(1, "the honesty contract is required"),
  })
  .superRefine((r, ctx) => {
    const decisive = r.verdict === "VALID" || r.verdict === "INVALID";
    if (decisive && r.symbolDictionary.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${r.verdict} requires a non-empty symbol dictionary`,
        path: ["symbolDictionary"],
      });
    }
    if (decisive && r.formalization.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${r.verdict} requires a visible formalization`,
        path: ["formalization"],
      });
    }
    if (r.verdict === "INVALID" && r.validity.counterModel === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "INVALID requires a counter-model",
        path: ["validity", "counterModel"],
      });
    }
    if (
      r.verdict === "INCONSISTENT" &&
      (r.consistency.minimalConflictingSubset === undefined ||
        r.consistency.minimalConflictingSubset.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "INCONSISTENT requires a minimal conflicting subset",
        path: ["consistency", "minimalConflictingSubset"],
      });
    }
    if (r.translationConfidence?.band === "low" && r.verdict !== "UNKNOWN") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "low translation confidence forces verdict UNKNOWN",
        path: ["verdict"],
      });
    }
  });

export type LogicReport = z.infer<typeof logicReportSchema>;

// ---- Assembly -------------------------------------------------------------

export interface BuildReportInput {
  target: { tier: 1 | 2 | 3 | 4; uri?: string };
  verdict: Verdict;
  validity: z.input<typeof validitySchema>;
  consistency: z.input<typeof consistencySchema>;
  symbolDictionary: { symbol: string; gloss: string }[];
  formalization: z.input<typeof formalizationEntrySchema>[];
  soundnessRisk?: { note: string }[];
  flattened?: z.input<typeof flattenedSchema>[];
  findings?: z.input<typeof findingSchema>[];
  translationConfidence?: { band: "low" | "med" | "high"; score: number };
  verdictConfidence?: { band: "high" | "low"; reason: string };
  honestyContract?: string;
}

/**
 * Assemble + validate a LogicReport. Fills the honest defaults
 * (`noContradictionFound` for a clean SAT; verdict confidence from whether a
 * proof/counter-model exists) and then runs the schema so any honesty violation
 * throws here rather than leaking to a caller.
 */
export function buildReport(input: BuildReportInput): LogicReport {
  const consistency = { ...input.consistency };
  if (consistency.status === "SAT" && consistency.noContradictionFound === undefined) {
    consistency.noContradictionFound = true;
  }

  const hasCertificate =
    input.validity.proof !== undefined || input.validity.counterModel !== undefined;
  const verdictConfidence =
    input.verdictConfidence ??
    (hasCertificate
      ? { band: "high" as const, reason: "a proof or counter-model is attached" }
      : { band: "low" as const, reason: "no proof or counter-model certificate" });

  return logicReportSchema.parse({
    target: input.target,
    verdict: input.verdict,
    validity: input.validity,
    consistency,
    soundnessRisk: input.soundnessRisk ?? [],
    symbolDictionary: input.symbolDictionary,
    formalization: input.formalization,
    flattened: input.flattened ?? [],
    verdictConfidence,
    findings: input.findings ?? [],
    translationConfidence: input.translationConfidence,
    honestyContract: input.honestyContract ?? HONESTY_CONTRACT,
  });
}

// ---- Rendering ------------------------------------------------------------

/** A human-readable Markdown rendering of a report. */
export function toMarkdown(report: LogicReport): string {
  const lines: string[] = [];
  const tierLabel = `Tier ${report.target.tier}`;
  lines.push(`# Entailer report (${tierLabel})`);
  if (report.target.uri) lines.push(`\n_${report.target.uri}_`);
  lines.push(`\n**Verdict: ${report.verdict}**`);
  lines.push(
    `Verdict confidence: ${report.verdictConfidence.band} (${report.verdictConfidence.reason})`,
  );

  lines.push("\n## Symbol dictionary");
  if (report.symbolDictionary.length === 0) {
    lines.push("_(none)_");
  } else {
    lines.push("| symbol | gloss |", "|---|---|");
    for (const s of report.symbolDictionary) lines.push(`| \`${s.symbol}\` | ${s.gloss} |`);
  }

  lines.push("\n## Formalization");
  if (report.formalization.length === 0) {
    lines.push("_(none)_");
  } else {
    for (const f of report.formalization) {
      const conf = f.translationConfidence
        ? ` _(confidence: ${f.translationConfidence.band})_`
        : "";
      lines.push(`- **${f.role}** [${f.logicSystem}]: \`${f.formal}\`${conf}`);
      lines.push(`  - English: ${f.english}`);
    }
  }

  // The three independent fields, never merged.
  lines.push("\n## Validity (≠ truth)");
  lines.push(`- status: **${report.validity.status}** via ${report.validity.method}`);
  if (report.validity.vacuous) {
    lines.push("- ⚠️ vacuously valid: the premises are mutually inconsistent.");
  }
  if (report.validity.counterModel) {
    const cm = Object.entries(report.validity.counterModel)
      .map(([k, v]) => `${k}=${v ? "T" : "F"}`)
      .join(", ");
    lines.push(`- counter-model: \`${cm}\``);
  }

  lines.push("\n## Consistency");
  if (report.consistency.status === "UNSAT") {
    const subset = report.consistency.minimalConflictingSubset ?? [];
    lines.push(`- status: **UNSAT** — minimal conflicting subset: claims [${subset.join(", ")}]`);
  } else if (report.consistency.status === "SAT") {
    lines.push("- status: **SAT** — `noContradictionFound` (not a proof of consistency)");
  } else {
    lines.push("- status: **UNKNOWN**");
  }

  if (report.soundnessRisk.length > 0) {
    lines.push("\n## Soundness risk (premise truth is out of scope)");
    for (const s of report.soundnessRisk) lines.push(`- ${s.note}`);
  }

  if (report.flattened.length > 0) {
    lines.push("\n## Flattened / out-of-scope content");
    for (const f of report.flattened) lines.push(`- _${f.kind}_: ${f.text}`);
  }

  if (report.findings.length > 0) {
    lines.push("\n## Findings");
    for (const f of report.findings) {
      lines.push(`- **${f.severity}** ${f.name} — ${f.why} (${f.signature})`);
    }
  }

  lines.push("\n---");
  lines.push(`_${report.honestyContract}_`);
  return lines.join("\n");
}
