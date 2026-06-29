/**
 * One-way vendor of the `formalize` skill: workshop → this public repo.
 *
 * Source of truth is the bar_builds workshop's `.claude/skills/formalize/`. This
 * script copies it into `plugin/skills/formalize/` so the open-source repo ships a
 * self-contained prose/judgment layer. The copy is **one-way** — never edit the
 * vendored files expecting changes to flow back upstream.
 *
 * The machine-consumable taxonomy is generated from fenced `entailer-data` blocks
 * in the vendored references by `scripts/gen-taxonomy.mjs` (drift-gated in CI).
 * Those blocks must be upstreamed into the workshop references before a re-vendor,
 * or this copy will strip them; the script warns when it would do so.
 *
 * Usage: node scripts/vendor-skill.mjs [--source <path-to-.claude/skills/formalize>]
 * Default source: ../bar_builds/.claude/skills/formalize (sibling layout).
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argSource = process.argv.includes("--source")
  ? process.argv[process.argv.indexOf("--source") + 1]
  : undefined;
const source = resolve(
  repoRoot,
  argSource ?? "../bar_builds/.claude/skills/formalize",
);
const dest = resolve(repoRoot, "plugin", "skills", "formalize");

if (!existsSync(source)) {
  console.error(`vendor-skill: source not found: ${source}`);
  console.error("Pass --source <path-to-.claude/skills/formalize> if the workshop lives elsewhere.");
  process.exit(1);
}

// Warn if the existing vendored copy carries entailer-data blocks the source lacks.
const DATA_MARKER = "<!-- entailer-data:";
function dataFiles(dir) {
  const refs = resolve(dir, "references");
  if (!existsSync(refs)) return [];
  return readdirSync(refs)
    .filter((f) => f.endsWith(".md"))
    .filter((f) => readFileSync(resolve(refs, f), "utf8").includes(DATA_MARKER));
}
const vendoredData = existsSync(dest) ? dataFiles(dest) : [];
const sourceData = dataFiles(source);
const wouldStrip = vendoredData.filter((f) => !sourceData.includes(f));
if (wouldStrip.length > 0) {
  console.error(
    `vendor-skill: REFUSING to vendor — these vendored references carry entailer-data\n` +
      `blocks the upstream source lacks (re-vendoring would strip them):\n` +
      wouldStrip.map((f) => `  - references/${f}`).join("\n") +
      `\nUpstream those fenced blocks into the workshop references first.`,
  );
  process.exit(2);
}

if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
cpSync(source, dest, { recursive: true });
console.log(`vendored ${source} -> ${dest}`);
