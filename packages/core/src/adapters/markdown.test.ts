import { describe, expect, it } from "vitest";
import { evaluateMarkdown, extractDoc } from "./markdown.js";

const consistentDoc = `# Service spec

Some prose that should be ignored.

\`\`\`entailer
let req = a call is a request
let logged = the call is logged
req -> logged
\`\`\`

\`\`\`js
// this code fence must be ignored
const x = req && logged;
\`\`\`
`;

const inconsistentDoc = `# Logging policy

\`\`\`entailer
let req = a call is a request
let logged = the call is logged
let health = the call is a health-check
req -> logged
\`\`\`

Later in the doc, a contradicting rule:

\`\`\`entailer
health -> ~logged
health & req
\`\`\`
`;

describe("extractDoc", () => {
  it("pulls claims from entailer blocks with line numbers and ignores other fences", () => {
    const { claims, symbols } = extractDoc(consistentDoc);
    expect(claims.map((c) => c.dsl)).toEqual(["req -> logged"]);
    expect(claims[0]!.line).toBeGreaterThan(0);
    expect(symbols).toContainEqual({ symbol: "req", gloss: "a call is a request" });
    // the js fence's atoms must NOT appear
    expect(symbols.find((s) => s.symbol === "x")).toBeUndefined();
  });
});

describe("evaluateMarkdown", () => {
  it("reports a consistent doc as NO_ISSUE_FOUND", () => {
    const r = evaluateMarkdown({ markdown: consistentDoc, uri: "spec.md" });
    expect(r.target.tier).toBe(3);
    expect(r.verdict).toBe("NO_ISSUE_FOUND");
    expect(r.consistency.noContradictionFound).toBe(true);
  });

  it("catches a cross-block inconsistency with path:line findings", () => {
    const r = evaluateMarkdown({ markdown: inconsistentDoc, uri: "policy.md" });
    expect(r.verdict).toBe("INCONSISTENT");
    expect(r.consistency.status).toBe("UNSAT");
    expect(r.consistency.minimalConflictingSubset?.length).toBe(3);
    // findings carry the source location
    for (const f of r.findings) {
      expect(f.location?.uri).toBe("policy.md");
      expect(f.location?.line).toBeGreaterThan(0);
    }
  });

  it("handles a doc with no entailer blocks honestly", () => {
    const r = evaluateMarkdown({ markdown: "# Just prose\n\nNothing here.", uri: "readme.md" });
    expect(r.verdict).toBe("NO_ISSUE_FOUND");
    expect(r.soundnessRisk.some((s) => /No fenced/i.test(s.note))).toBe(true);
  });
});
