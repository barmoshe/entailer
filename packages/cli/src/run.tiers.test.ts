import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "./run.js";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "entailer-cli-"));
}

describe("prompt command (Tier 2)", () => {
  it("evaluates a PromptInput JSON file", () => {
    const dir = tmp();
    const file = join(dir, "prompt.json");
    writeFileSync(
      file,
      JSON.stringify({
        claims: [
          { dsl: "p", text: "the deploy succeeded" },
          { dsl: "p -> q", text: "if it succeeded it's live" },
          { dsl: "q", text: "therefore it's live" },
        ],
        symbols: [
          { symbol: "p", gloss: "deploy ok" },
          { symbol: "q", gloss: "live" },
        ],
      }),
    );
    const r = run(["prompt", "--file", file, "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).verdict).toBe("VALID");
  });
});

describe("markdown command (Tier 3)", () => {
  it("flags a within-doc inconsistency, exit 1", () => {
    const dir = tmp();
    const file = join(dir, "policy.md");
    writeFileSync(
      file,
      "# Policy\n\n```entailer\nlet req = a request\nlet logged = logged\nlet health = health-check\nreq -> logged\nhealth -> ~logged\nhealth & req\n```\n",
    );
    const r = run(["markdown", file, "--json"]);
    expect(r.code).toBe(1);
    const report = JSON.parse(r.stdout);
    expect(report.verdict).toBe("INCONSISTENT");
    expect(report.findings.every((f: { location?: { uri?: string } }) => f.location?.uri === file)).toBe(true);
  });
});

describe("repo command (Tier 4)", () => {
  it("catches a cross-file contradiction over a directory of markdown", () => {
    const dir = tmp();
    mkdirSync(join(dir, "docs"), { recursive: true });
    writeFileSync(
      join(dir, "README.md"),
      "# Service\n\n```entailer\nlet req = a request\nlet logged = logged\nreq -> logged\n```\n",
    );
    writeFileSync(
      join(dir, "docs", "SPEC.md"),
      "# Spec\n\n```entailer\nlet health = health-check\nhealth -> ~logged\nhealth & req\n```\n",
    );
    writeFileSync(join(dir, "ignore.ts"), "export const x = 1;"); // non-markdown skipped
    const r = run(["repo", dir, "--json"]);
    expect(r.code).toBe(1);
    const report = JSON.parse(r.stdout);
    expect(report.verdict).toBe("INCONSISTENT");
    const files = new Set(report.findings.map((f: { location?: { uri?: string } }) => f.location?.uri));
    expect(files.size).toBeGreaterThan(1);
  });
});
