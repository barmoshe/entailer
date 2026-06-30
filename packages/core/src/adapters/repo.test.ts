import { describe, expect, it } from "vitest";
import { evaluateRepo, type RepoFile } from "./repo.js";

const readme = `# Service

\`\`\`entailer
let req = a call is a request
let logged = the call is logged
req -> logged
\`\`\`
`;

const spec = `# SPEC

\`\`\`entailer
let health = the call is a health-check
health -> ~logged
health & req
\`\`\`
`;

describe("evaluateRepo — cross-file consistency", () => {
  it("catches a contradiction spanning README and SPEC", () => {
    const files: RepoFile[] = [
      { uri: "README.md", content: readme },
      { uri: "SPEC.md", content: spec },
      { uri: "src/index.ts", content: "export const x = 1;" }, // non-prose, skipped
    ];
    const r = evaluateRepo({ files });
    expect(r.target.tier).toBe(4);
    expect(r.verdict).toBe("INCONSISTENT");
    expect(r.consistency.status).toBe("UNSAT");
    // the conflict spans more than one file
    const files2 = new Set(r.findings.map((f) => f.location?.uri));
    expect(files2.size).toBeGreaterThan(1);
    expect(r.findings.some((f) => f.name === "cross-file-inconsistency")).toBe(true);
  });

  it("reports a selection manifest and a coverage caveat", () => {
    const r = evaluateRepo({
      files: [
        { uri: "README.md", content: readme },
        { uri: "src/index.ts", content: "code" },
      ],
    });
    expect(r.selectionManifest).toBeDefined();
    expect(r.selectionManifest!.find((m) => m.uri === "README.md")?.included).toBe(true);
    expect(r.selectionManifest!.find((m) => m.uri === "src/index.ts")?.included).toBe(false);
    expect(r.coverageCaveat).toMatch(/heuristic/i);
  });

  it("a consistent repo is NO_ISSUE_FOUND", () => {
    const r = evaluateRepo({ files: [{ uri: "README.md", content: readme }] });
    expect(r.verdict).toBe("NO_ISSUE_FOUND");
    expect(r.consistency.noContradictionFound).toBe(true);
  });

  it("merges symbol glosses across files", () => {
    const r = evaluateRepo({
      files: [
        { uri: "README.md", content: readme },
        { uri: "SPEC.md", content: spec },
      ],
    });
    expect(r.symbolDictionary).toContainEqual({ symbol: "req", gloss: "a call is a request" });
    expect(r.symbolDictionary).toContainEqual({
      symbol: "health",
      gloss: "the call is a health-check",
    });
  });
});
