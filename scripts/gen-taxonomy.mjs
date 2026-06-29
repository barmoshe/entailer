/**
 * Generate `packages/core/src/generated/taxonomy.ts` from the fenced
 * `entailer-data` JSON blocks in the vendored `formalize` references.
 *
 * Each block is an HTML-comment marker `<!-- entailer-data: KEY -->` immediately
 * followed by a fenced ```json block. The generator merges blocks by key and
 * emits a typed, frozen TS module. The drift gate (`pnpm gen` then
 * `git diff --exit-code`) guarantees the TS enums never silently diverge from the
 * prose source of truth (DESIGN §4.2).
 *
 * Usage: node scripts/gen-taxonomy.mjs
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const refsDir = resolve(repoRoot, "plugin", "skills", "formalize", "references");
const outFile = resolve(repoRoot, "packages", "core", "src", "generated", "taxonomy.ts");

const BLOCK_RE = /<!--\s*entailer-data:\s*([\w-]+)\s*-->\s*```json\s*([\s\S]*?)```/g;

function extractBlocks() {
  const data = {};
  const files = readdirSync(refsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  for (const file of files) {
    const text = readFileSync(resolve(refsDir, file), "utf8");
    for (const m of text.matchAll(BLOCK_RE)) {
      const key = m[1];
      let parsed;
      try {
        parsed = JSON.parse(m[2]);
      } catch (e) {
        throw new Error(`gen-taxonomy: invalid JSON in ${file} block '${key}': ${e.message}`);
      }
      data[key] = { ...(data[key] ?? {}), ...parsed, __file: file };
    }
  }
  return data;
}

function lit(value) {
  return JSON.stringify(value);
}

function main() {
  const data = extractBlocks();
  const fallacies = data.fallacies?.fallacies ?? [];
  const verdicts = data.verdicts?.verdicts ?? [];
  const severities = data.severities?.severities ?? [];
  const honestyContract = data.honesty?.honestyContract ?? "";

  if (fallacies.length === 0 || verdicts.length === 0 || severities.length === 0 || !honestyContract) {
    throw new Error("gen-taxonomy: missing one of fallacies / verdicts / severities / honesty");
  }

  const fallacyIds = fallacies.map((f) => f.id);
  const severityIds = severities.map((s) => s.id);

  const out = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by \`scripts/gen-taxonomy.mjs\` from the fenced \`entailer-data\` blocks in
 * the vendored \`formalize\` references (plugin/skills/formalize/references/). Run
 * \`pnpm gen\` to regenerate; the CI drift gate (\`pnpm gen && git diff --exit-code\`)
 * fails if this file and the prose source disagree.
 *
 * Sources: fallacies ← ${data.fallacies?.__file ?? "?"}; verdicts/severities ← ${data.verdicts?.__file ?? "?"}; honesty ← ${data.honesty?.__file ?? "?"}.
 */

export interface FallacyEntry {
  readonly id: string;
  readonly name: string;
  readonly signature: string;
  readonly severity: string;
  readonly kind: string;
}

export const FALLACIES: readonly FallacyEntry[] = ${lit(fallacies)} as const;

export type FallacyId =
${fallacyIds.map((id) => `  | ${lit(id)}`).join("\n")};

export const VERDICTS = ${lit(verdicts)} as const;
export type GeneratedVerdict = (typeof VERDICTS)[number];

export interface SeverityEntry {
  readonly id: string;
  readonly rank: number;
  readonly gloss: string;
}

export const SEVERITIES: readonly SeverityEntry[] = ${lit(severities)} as const;

export type SeverityId =
${severityIds.map((id) => `  | ${lit(id)}`).join("\n")};

/** The ref-99 disclosure attached to every LogicReport. */
export const HONESTY_CONTRACT = ${lit(honestyContract)};

export const fallacyById: Readonly<Record<string, FallacyEntry>> = Object.freeze(
  Object.fromEntries(FALLACIES.map((f) => [f.id, f])),
);
`;

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, out);
  console.log(`wrote ${outFile} (${fallacies.length} fallacies, ${severities.length} severities)`);
}

main();
