// Programmatic use of @entailer/core.
// From a clone: `pnpm -r build` then `node examples/programmatic.mjs`.
// Installed: replace the relative import with `import { ... } from "@entailer/core"`.
import {
  evaluateSentence,
  evaluateMarkdown,
  evaluateRepo,
} from "../packages/core/dist/index.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const show = (label, r) =>
  console.log(
    `${label}: ${r.verdict}` +
      (r.validity.counterModel
        ? ` (counter-model ${Object.entries(r.validity.counterModel).map(([k, v]) => `${k}=${v ? "T" : "F"}`).join(", ")})`
        : "") +
      (r.consistency.minimalConflictingSubset
        ? ` (conflict subset [${r.consistency.minimalConflictingSubset.join(", ")}])`
        : ""),
  );

// Tier 1 — classification
show("a ∨ ¬a", evaluateSentence("a | ~a")); // VALID (tautology)
show("a ∧ ¬a", evaluateSentence("a & ~a")); // INCONSISTENT
show("a → b ", evaluateSentence("a -> b")); // NO_ISSUE_FOUND (contingent)

// Tier 3 — within-doc consistency
show(
  "spec.md ",
  evaluateMarkdown({
    markdown: readFileSync(join(here, "inconsistent-spec.md"), "utf8"),
    uri: "inconsistent-spec.md",
  }),
);

// Tier 4 — cross-file consistency
show(
  "repo    ",
  evaluateRepo({
    files: [
      { uri: "README.md", content: readFileSync(join(here, "repo-demo/README.md"), "utf8") },
      { uri: "SPEC.md", content: readFileSync(join(here, "repo-demo/SPEC.md"), "utf8") },
    ],
  }),
);
