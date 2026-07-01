import { describe, expect, it } from "vitest";
import { evaluatePr, type PrFile } from "./pr.js";

// A consistent base spec: auth-required implies not-public.
const specSat = `# SPEC

\`\`\`entailer
let a = auth is required
let pub = the endpoint is public
a -> ~pub
\`\`\`
`;

// An already-inconsistent base spec (a & pub & a->~pub is UNSAT).
const specUnsat = `# SPEC

\`\`\`entailer
let a = auth is required
let pub = the endpoint is public
a
pub
a -> ~pub
\`\`\`
`;

// A head doc that contradicts specSat by asserting both a and pub.
const featureConflict = `# Feature

\`\`\`entailer
a
pub
\`\`\`
`;

// A head doc that only asserts a (consistent with specSat).
const featureAuth = `# Feature

\`\`\`entailer
a
\`\`\`
`;

const unrelated = `# Notes

\`\`\`entailer
let x = feature x ships
x
\`\`\`
`;

describe("evaluatePr — base→head delta", () => {
  it("flags a contradiction the PR introduces (both gates)", () => {
    const base: PrFile[] = [{ uri: "SPEC.md", content: specSat }];
    const head: PrFile[] = [
      { uri: "SPEC.md", content: specSat },
      { uri: "FEATURE.md", content: featureConflict },
    ];
    for (const gate of ["head", "introduced"] as const) {
      const r = evaluatePr({ base, head, gate });
      expect(r.target.tier).toBe(5);
      expect(r.verdict).toBe("INCONSISTENT");
      expect(r.consistency.status).toBe("UNSAT");
      expect(r.delta?.base).toBe("SAT");
      expect(r.delta?.head).toBe("UNSAT");
      expect(r.delta?.introduced).toBeGreaterThan(0);
      expect(r.delta?.gate).toBe(gate);
      expect(r.findings.some((f) => f.name === "introduced-inconsistency")).toBe(true);
    }
  });

  it("does NOT block a pre-existing contradiction under gate=introduced, but DOES under gate=head", () => {
    const base: PrFile[] = [{ uri: "SPEC.md", content: specUnsat }];
    const head: PrFile[] = [
      { uri: "SPEC.md", content: specUnsat }, // unchanged
      { uri: "NOTES.md", content: unrelated }, // new, but consistent
    ];

    const introduced = evaluatePr({ base, head, gate: "introduced" });
    expect(introduced.verdict).toBe("NO_ISSUE_FOUND");
    expect(introduced.consistency.status).toBe("UNSAT"); // head is still dirty…
    expect(introduced.delta?.introduced).toBe(0); // …but the PR introduced nothing
    expect(introduced.delta?.preExisting).toBeGreaterThan(0);
    expect(introduced.findings.some((f) => f.name === "head-still-inconsistent")).toBe(true);

    const headGate = evaluatePr({ base, head, gate: "head" });
    expect(headGate.verdict).toBe("INCONSISTENT");
  });

  it("reports a fix when the PR resolves a base contradiction", () => {
    const base: PrFile[] = [{ uri: "SPEC.md", content: specUnsat }];
    const head: PrFile[] = [{ uri: "SPEC.md", content: specSat }]; // dropped a & pub
    const r = evaluatePr({ base, head });
    expect(r.verdict).toBe("NO_ISSUE_FOUND");
    expect(r.consistency.noContradictionFound).toBe(true);
    expect(r.delta?.fixed).toBe(1);
    expect(r.findings.some((f) => f.name === "pr-resolves-inconsistency")).toBe(true);
  });

  it("a clean PR over a clean base is NO_ISSUE_FOUND", () => {
    const base: PrFile[] = [{ uri: "SPEC.md", content: specSat }];
    const head: PrFile[] = [
      { uri: "SPEC.md", content: specSat },
      { uri: "FEATURE.md", content: featureAuth },
    ];
    const r = evaluatePr({ base, head });
    expect(r.verdict).toBe("NO_ISSUE_FOUND");
    expect(r.delta?.introduced).toBe(0);
  });

  it("reports a selection manifest, a coverage caveat and a delta block", () => {
    const r = evaluatePr({
      base: [{ uri: "SPEC.md", content: specSat }],
      head: [
        { uri: "SPEC.md", content: specSat },
        { uri: "src/index.ts", content: "export const x = 1;" }, // non-prose
      ],
    });
    expect(r.selectionManifest).toBeDefined();
    expect(r.selectionManifest!.find((m) => m.uri === "src/index.ts")?.included).toBe(false);
    expect(r.coverageCaveat).toMatch(/gate=/);
    expect(r.delta).toBeDefined();
  });
});

describe("evaluatePr — PR description fold", () => {
  const base: PrFile[] = [{ uri: "SPEC.md", content: specSat }];
  const head: PrFile[] = [
    { uri: "SPEC.md", content: specSat },
    { uri: "FEATURE.md", content: featureAuth }, // head code alone is consistent
  ];
  const body = "```entailer\npub\n```"; // description claims the endpoint is public

  it("blocks a description-vs-code contradiction by default (fail)", () => {
    const r = evaluatePr({ base, head, metadata: { number: 7, body } });
    expect(r.verdict).toBe("INCONSISTENT");
    expect(r.findings.some((f) => f.name === "pr-description-vs-code" && f.severity === "blocker")).toBe(true);
    expect(r.selectionManifest!.some((m) => m.role === "pr-description")).toBe(true);
  });

  it("downgrades a description-induced contradiction to a non-blocking warn", () => {
    const r = evaluatePr({ base, head, metadata: { number: 7, body }, descriptionSeverity: "warn" });
    expect(r.verdict).toBe("NO_ISSUE_FOUND");
    expect(r.findings.some((f) => f.name === "pr-description-vs-code" && f.severity === "major")).toBe(true);
    expect(r.findings.some((f) => f.name === "head-still-inconsistent")).toBe(true);
  });

  it("ignores the description entirely under off", () => {
    const r = evaluatePr({ base, head, metadata: { number: 7, body }, descriptionSeverity: "off" });
    expect(r.verdict).toBe("NO_ISSUE_FOUND");
    expect(r.findings.some((f) => f.name === "pr-description-vs-code")).toBe(false);
  });
});
