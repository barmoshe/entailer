import { describe, it, expect } from "vitest";
import {
  parseDomainSpec,
  compileRelations,
  DomainSpecError,
  type DomainSpec,
} from "../domain-spec.js";
import {
  evaluateDomain,
  honestRecursionPrecheck,
  splitIdentifier,
  siteSignature,
} from "./domain.js";
import { domainReportSchema, domainVerdict } from "../domain-report.js";
import type { RepoFile } from "./repo.js";

function spec(partial: Partial<DomainSpec> & Pick<DomainSpec, "concepts">): DomainSpec {
  return parseDomainSpec({
    cluster: "test",
    boundary: ["src/**"],
    relationships: [],
    ...partial,
  });
}

describe("domain-spec", () => {
  it("requires at least two concepts and a boundary", () => {
    expect(() => parseDomainSpec({ cluster: "c", concepts: [{ concept: "a" }], boundary: ["x"] })).toThrow();
    expect(() =>
      parseDomainSpec({ cluster: "c", concepts: [{ concept: "a" }, { concept: "b" }], boundary: [] }),
    ).toThrow();
  });

  it("compiles is-a to sub and is-not to disjoint", () => {
    const rels = compileRelations(
      spec({
        concepts: [{ concept: "member" }, { concept: "user" }, { concept: "guest" }],
        relationships: ["member is-a user", "member is-not guest"],
      }),
    );
    expect(rels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "sub", a: "member", b: "user" }),
        expect.objectContaining({ kind: "disjoint", a: "member", b: "guest" }),
      ]),
    );
  });

  it("reads a subject-less per-concept relationship with the owning concept", () => {
    const rels = compileRelations(
      spec({ concepts: [{ concept: "member", relationships: ["is-not guest"] }, { concept: "guest" }] }),
    );
    expect(rels[0]).toMatchObject({ kind: "disjoint", a: "member", b: "guest" });
  });

  it("throws on an unknown concept or an unparseable verb", () => {
    expect(() =>
      compileRelations(spec({ concepts: [{ concept: "a" }, { concept: "b" }], relationships: ["a is-a c"] })),
    ).toThrow(DomainSpecError);
    expect(() =>
      compileRelations(spec({ concepts: [{ concept: "a" }, { concept: "b" }], relationships: ["a equals b"] })),
    ).toThrow(DomainSpecError);
  });

  it("splits identifiers across camelCase and snake_case", () => {
    expect(splitIdentifier("grantGuestAccess")).toEqual(["grant", "guest", "access"]);
    expect(splitIdentifier("member_user_id")).toEqual(["member", "user", "id"]);
    expect(splitIdentifier("HTTPServer")).toEqual(["http", "server"]);
  });
});

describe("honest-recursion pre-check", () => {
  it("flags a pair declared both is-a and is-not (subclass forced empty)", () => {
    const s = spec({
      concepts: [{ concept: "member" }, { concept: "guest" }],
      relationships: ["member is-a guest", "member is-not guest"],
    });
    const findings = honestRecursionPrecheck(s, compileRelations(s));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ rank: "rank-1", evidenceType: "DECLARATION", name: "self-contradictory-declaration" });
  });

  it("flags an identifier listed as both a positive and a negative example", () => {
    const s = spec({
      concepts: [
        { concept: "member", examples: { positive: ["alice"], negative: ["alice"] } },
        { concept: "guest" },
      ],
    });
    const findings = honestRecursionPrecheck(s, compileRelations(s));
    expect(findings[0]).toMatchObject({ name: "contradictory-examples", rank: "rank-1" });
  });
});

describe("evaluateDomain — detection", () => {
  const files = (content: string): RepoFile[] => [{ uri: "src/a.ts", content }];

  it("fires a rank-1 CONTRADICTION when one identifier fuses two disjoint concepts", () => {
    const report = evaluateDomain({
      spec: spec({
        concepts: [{ concept: "member" }, { concept: "guest" }],
        relationships: ["member is-not guest"],
      }),
      files: files("function deleteMemberGuest(id) { return id; }"),
    });
    const verdicts = report.findings.filter((f) => f.rank === "rank-1");
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]).toMatchObject({ evidenceType: "CONTRADICTION", name: "concept-fusion" });
    expect(verdicts[0]!.receipts).toHaveLength(2);
    expect(domainVerdict(report)).toBe("LEAK");
  });

  it("stays silent when a member IS a user co-occur (is-a is satisfiable by construction)", () => {
    const report = evaluateDomain({
      spec: spec({
        concepts: [{ concept: "member" }, { concept: "user" }],
        relationships: ["member is-a user"],
      }),
      files: files(
        ["const member = user;", "member.user = user;", "return user && member;", "grantMemberToUser(member, user);"].join("\n"),
      ),
    });
    expect(report.findings.filter((f) => f.rank !== "rank-3")).toHaveLength(0);
    expect(report.noLeakFound).toBe(true);
  });

  it("raises a rank-2 reader hint when disjoint concepts co-occur across sites without fusing", () => {
    const report = evaluateDomain({
      spec: spec({
        concepts: [{ concept: "member" }, { concept: "guest" }],
        relationships: ["member is-not guest"],
      }),
      files: files(["if (member && guest) {}", "log(member, guest);", "return member || guest;"].join("\n")),
    });
    const hints = report.findings.filter((f) => f.rank === "rank-2");
    expect(hints).toHaveLength(1);
    expect(hints[0]).toMatchObject({ evidenceType: "SPLIT-PERSONALITY", readerAssisted: true, claim: "" });
    expect(hints[0]!.severity).not.toBe("blocker");
  });

  it("suppresses a rank-1 whose site is not in the introduced set (gate=introduced)", () => {
    const s = spec({
      concepts: [{ concept: "member" }, { concept: "guest" }],
      relationships: ["member is-not guest"],
    });
    const sig = siteSignature("test", ["member", "guest"], "src/a.ts", "memberGuest");
    const gated = evaluateDomain({ spec: s, files: files("x.memberGuest = 1;"), introduced: new Set([sig]) });
    expect(gated.findings.filter((f) => f.rank === "rank-1")).toHaveLength(1);
    const suppressed = evaluateDomain({ spec: s, files: files("x.memberGuest = 1;"), introduced: new Set() });
    expect(suppressed.findings.filter((f) => f.rank === "rank-1")).toHaveLength(0);
  });
});

describe("evaluateDomain — entailer-self calibration (validity != truth != faithful-formalization)", () => {
  it("emits zero false conflation over a three-independent-fields snippet", () => {
    const calibration = spec({
      cluster: "entailer-invariant",
      concepts: [
        { concept: "validity", vocabulary: ["valid", "invalid", "validity"] },
        { concept: "truth", vocabulary: ["truth", "sound", "soundness"] },
        { concept: "faithfulness", vocabulary: ["faithful", "formalization", "gloss"] },
      ],
      relationships: ["validity is-not truth", "truth is-not faithfulness", "validity is-not faithfulness"],
    });
    // The three concerns kept on separate lines — exactly how report.ts keeps them as three fields.
    const source = [
      "const validitySchema = z.object({ status });",
      "const soundnessRisk = [];",
      "const symbolDictionary = formalization.map(glossOf);",
    ].join("\n");
    const report = evaluateDomain({ spec: calibration, files: [{ uri: "report.ts", content: source }] });
    expect(report.findings.filter((f) => f.rank === "rank-1")).toHaveLength(0);
    expect(report.noLeakFound).toBe(true);
  });
});

describe("DomainReport — schema-enforced honesty", () => {
  const base = {
    cluster: "c",
    mode: "repo" as const,
    coverageCaveat: "x",
    honestyContract: "y",
    symbolDictionary: [],
    selectionManifest: [],
  };

  it("rejects a rank-1 verdict without a >=2-member minimal conflicting subset", () => {
    expect(() =>
      domainReportSchema.parse({
        ...base,
        findings: [
          {
            rank: "rank-1",
            evidenceType: "CONTRADICTION",
            name: "x",
            severity: "blocker",
            readerAssisted: false,
            concepts: ["a", "b"],
            receipts: [{ uri: "f", line: 1 }],
            claim: "c",
            question: "q",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects a reader hint marked blocker, or asserting a claim, or not readerAssisted", () => {
    const hint = (over: Record<string, unknown>) => ({
      rank: "rank-2",
      evidenceType: "SPLIT-PERSONALITY",
      name: "x",
      severity: "minor",
      readerAssisted: true,
      concepts: ["a", "b"],
      receipts: [{ uri: "f", line: 1 }],
      claim: "",
      question: "q",
      ...over,
    });
    expect(() => domainReportSchema.parse({ ...base, findings: [hint({ severity: "blocker" })] })).toThrow();
    expect(() => domainReportSchema.parse({ ...base, findings: [hint({ claim: "asserts!" })] })).toThrow();
    expect(() => domainReportSchema.parse({ ...base, findings: [hint({ readerAssisted: false })] })).toThrow();
  });
});
