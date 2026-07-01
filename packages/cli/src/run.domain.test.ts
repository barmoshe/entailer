import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "./run.js";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "entailer-domain-"));
}

const LENS = [
  "cluster: access",
  "boundary:",
  '  - "src/**"',
  "concepts:",
  "  - concept: member",
  "    vocabulary: [member, subscriber]",
  "  - concept: guest",
  "    vocabulary: [guest, anonymous]",
  "relationships:",
  "  - member is-not guest",
  "",
].join("\n");

describe("domain command (concept-faithfulness lens)", () => {
  it("flags a concept-fusion leak with exit 1", () => {
    const dir = tmp();
    writeFileSync(join(dir, "access.yaml"), LENS);
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "a.ts"), "export function grantMemberGuest(id) { return id; }\n");
    const r = run(["domain", "--lens", join(dir, "access.yaml"), "--repo", dir, "--json"]);
    expect(r.code).toBe(1);
    const report = JSON.parse(r.stdout);
    const verdicts = report.findings.filter((f: { rank: string }) => f.rank === "rank-1");
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0].name).toBe("concept-fusion");
  });

  it("passes clean (exit 0, noLeakFound) when concepts stay separate", () => {
    const dir = tmp();
    writeFileSync(join(dir, "access.yaml"), LENS);
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "src", "a.ts"), "export const member = 1;\nexport const guest = 2;\n");
    const r = run(["domain", "--lens", join(dir, "access.yaml"), "--repo", dir, "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).noLeakFound).toBe(true);
  });

  it("rejects a missing --lens with exit 2", () => {
    const r = run(["domain", "--repo", "."]);
    expect(r.code).toBe(2);
  });

  it("rejects a malformed declaration with exit 2", () => {
    const dir = tmp();
    writeFileSync(join(dir, "bad.yaml"), "cluster: x\nboundary: [a]\nconcepts:\n  - concept: only-one\n");
    const r = run(["domain", "--lens", join(dir, "bad.yaml"), "--repo", dir]);
    expect(r.code).toBe(2);
  });
});
