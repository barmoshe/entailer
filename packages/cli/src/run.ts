/**
 * The CLI core, factored out of the bin so it is unit-testable without spawning
 * a process. `run` is pure: it returns the exit code + the text to print, and
 * never calls `process.exit` itself.
 */
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";
import {
  ParseError,
  evaluateArgument,
  evaluateMarkdown,
  evaluatePr,
  evaluatePrompt,
  evaluateRepo,
  evaluateSentence,
  parseFormalizedArgument,
  toMarkdown,
  type DescriptionSeverity,
  type LogicReport,
  type PrFile,
  type PrGate,
  type PrMetadata,
  type PromptInput,
  type RepoFile,
  type Verdict,
} from "@entailer/core";

export interface CliResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr?: string;
}

const USAGE = `entailer — a logician's-pass linter for software artifacts

Usage:
  entailer sentence "<dsl>"        classify a single claim (tautology/contingent/contradiction)
  entailer sentence --ir <file>    classify the claim in a supplied IR JSON file
  entailer check --ir <file>       check validity + consistency of a supplied argument IR
  entailer prompt --file <file>    Tier 2: evaluate a PromptInput JSON (claims + symbols)
  entailer markdown <file.md>      Tier 3: check a markdown doc's fenced \`entailer\` claims
  entailer repo <dir>              Tier 4: cross-file consistency over a repo's markdown docs
  entailer pr <number|url>         Tier 5: base→head delta over a GitHub PR (needs gh + git)
  entailer pr --base <ref> [dir]   Tier 5: delta of the working tree vs a local git ref
  entailer pr --base-dir <d> --head-dir <d>   Tier 5: delta over two pre-fetched dirs

Options:
  --json                           print the LogicReport as JSON
  --sarif                          (accepted) note SARIF gating for location-less tiers
  --gate head|introduced           PR gate policy (default: head)
  --description fail|warn|off       how to treat the PR description's claims (default: fail)
  -h, --help                       show this help

Exit codes: 0 no issue / valid · 1 invalid or inconsistent · 2 malformed input · 3 UNKNOWN-blocked`;

/** Map a verdict to a shell exit code. */
export function exitCodeFor(verdict: Verdict): number {
  switch (verdict) {
    case "VALID":
    case "NO_ISSUE_FOUND":
      return 0;
    case "INVALID":
    case "INCONSISTENT":
    case "GAP":
      return 1;
    case "UNKNOWN":
      return 3;
  }
}

function flagValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}

function render(report: LogicReport, argv: string[]): string {
  if (argv.includes("--json")) return JSON.stringify(report, null, 2);
  if (argv.includes("--sarif")) {
    return (
      `# SARIF note\nTier-${report.target.tier} reports have no file locations, so SARIF ` +
      `code-scanning output is gated per-tier (see DESIGN §9). Use --json for the full report.\n\n` +
      toMarkdown(report)
    );
  }
  return toMarkdown(report);
}

function loadIR(path: string): ReturnType<typeof parseFormalizedArgument> {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return parseFormalizedArgument(raw);
}

const MARKDOWN_RE = /\.(md|markdown)$/i;

/** Recursively collect markdown files under a directory (skips dot/node_modules dirs). */
function collectMarkdown(root: string): RepoFile[] {
  const out: RepoFile[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(full);
      } else if (MARKDOWN_RE.test(entry.name)) {
        out.push({ uri: relative(root, full), content: readFileSync(full, "utf8") });
      }
    }
  };
  walk(root);
  return out;
}

/** Read a validated PR gate flag. */
function parseGate(rest: string[]): PrGate {
  const v = flagValue(rest, "--gate");
  if (v === undefined || v === "head" || v === "introduced") return (v ?? "head") as PrGate;
  throw new Error(`--gate must be 'head' or 'introduced', got '${v}'`);
}

/** Read a validated description-severity flag. */
function parseDescription(rest: string[]): DescriptionSeverity {
  const v = flagValue(rest, "--description");
  if (v === undefined || v === "fail" || v === "warn" || v === "off") return (v ?? "fail") as DescriptionSeverity;
  throw new Error(`--description must be 'fail', 'warn' or 'off', got '${v}'`);
}

/** The first non-flag arg that is not consumed as a flag value. */
function firstPositional(rest: string[]): string | undefined {
  const valueFlags = new Set(["--base", "--base-dir", "--head-dir", "--gate", "--description"]);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a.startsWith("-")) continue;
    const prev = rest[i - 1];
    if (prev !== undefined && valueFlags.has(prev)) continue;
    return a;
  }
  return undefined;
}

/** `git show <ref>:<path>` for each uri; silently drops paths absent at the ref. */
function gitShowFiles(repoDir: string, ref: string, uris: string[]): PrFile[] {
  const out: PrFile[] = [];
  for (const uri of uris) {
    try {
      const content = execFileSync("git", ["-C", repoDir, "show", `${ref}:${uri}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      out.push({ uri, content });
    } catch {
      // path did not exist at the base ref (newly added) — not a base file.
    }
  }
  return out;
}

/** Resolve base + head file sets and metadata for the three `pr` input modes. */
function resolvePrInput(rest: string[]): {
  base: PrFile[];
  head: PrFile[];
  metadata: PrMetadata;
} {
  const baseDir = flagValue(rest, "--base-dir");
  const headDir = flagValue(rest, "--head-dir");
  if (baseDir && headDir) {
    // Mode 1: two pre-fetched directories (fully offline, deterministic).
    return { base: collectMarkdown(baseDir), head: collectMarkdown(headDir), metadata: {} };
  }

  const baseRef = flagValue(rest, "--base");
  if (baseRef) {
    // Mode 2: local git — head = working tree, base = the same paths at <ref>.
    const dir = firstPositional(rest) ?? process.cwd();
    const head = collectMarkdown(dir);
    const base = gitShowFiles(dir, baseRef, head.map((f) => f.uri));
    return { base, head, metadata: { baseRef } };
  }

  // Mode 3: GitHub PR by number/url via `gh` + local git.
  const pr = firstPositional(rest);
  if (!pr) throw new Error("pr: give a PR <number|url>, or use --base <ref> / --base-dir + --head-dir");
  const raw = execFileSync(
    "gh",
    ["pr", "view", pr, "--json", "number,title,body,baseRefName,headRefName,headRefOid"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const meta = JSON.parse(raw) as {
    number: number;
    title: string;
    body: string;
    baseRefName: string;
    headRefName: string;
    headRefOid: string;
  };
  const dir = process.cwd();
  const head = gitShowFiles(dir, meta.headRefOid, collectMarkdown(dir).map((f) => f.uri));
  const base = gitShowFiles(dir, meta.baseRefName, head.map((f) => f.uri));
  return {
    base,
    head,
    metadata: {
      number: meta.number,
      title: meta.title,
      body: meta.body,
      baseRef: meta.baseRefName,
      headRef: meta.headRefName,
    },
  };
}

export function run(argv: string[]): CliResult {
  if (argv.length === 0 || argv.includes("-h") || argv.includes("--help")) {
    return { code: 0, stdout: USAGE };
  }

  const [command, ...rest] = argv;

  try {
    if (command === "sentence") {
      const irPath = flagValue(rest, "--ir");
      let report: LogicReport;
      if (irPath) {
        report = evaluateSentence({ argument: loadIR(irPath) });
      } else {
        const dsl = rest.find((a) => !a.startsWith("-"));
        if (!dsl) return { code: 2, stdout: "", stderr: "sentence: missing <dsl> or --ir <file>" };
        report = evaluateSentence(dsl);
      }
      return { code: exitCodeFor(report.verdict), stdout: render(report, rest) };
    }

    if (command === "check") {
      const irPath = flagValue(rest, "--ir");
      if (!irPath) return { code: 2, stdout: "", stderr: "check: --ir <file> is required" };
      const report = evaluateArgument(loadIR(irPath));
      return { code: exitCodeFor(report.verdict), stdout: render(report, rest) };
    }

    if (command === "prompt") {
      const path = flagValue(rest, "--file");
      if (!path) return { code: 2, stdout: "", stderr: "prompt: --file <prompt.json> is required" };
      const input = JSON.parse(readFileSync(path, "utf8")) as PromptInput;
      const report = evaluatePrompt(input);
      return { code: exitCodeFor(report.verdict), stdout: render(report, rest) };
    }

    if (command === "markdown") {
      const path = rest.find((a) => !a.startsWith("-"));
      if (!path) return { code: 2, stdout: "", stderr: "markdown: missing <file.md>" };
      const report = evaluateMarkdown({ markdown: readFileSync(path, "utf8"), uri: path });
      return { code: exitCodeFor(report.verdict), stdout: render(report, rest) };
    }

    if (command === "repo") {
      const dir = rest.find((a) => !a.startsWith("-"));
      if (!dir) return { code: 2, stdout: "", stderr: "repo: missing <dir>" };
      const files = collectMarkdown(dir);
      const report = evaluateRepo({ files });
      return { code: exitCodeFor(report.verdict), stdout: render(report, rest) };
    }

    if (command === "pr") {
      const gate = parseGate(rest);
      const descriptionSeverity = parseDescription(rest);
      const { base, head, metadata } = resolvePrInput(rest);
      const report = evaluatePr({ base, head, metadata, gate, descriptionSeverity });
      return { code: exitCodeFor(report.verdict), stdout: render(report, rest) };
    }

    return { code: 2, stdout: "", stderr: `unknown command '${command}'\n\n${USAGE}` };
  } catch (err) {
    if (err instanceof ParseError) {
      return { code: 2, stdout: "", stderr: `parse error: ${err.message}` };
    }
    // schema-validation failure on a supplied IR is also malformed input
    const message = err instanceof Error ? err.message : String(err);
    return { code: 2, stdout: "", stderr: `malformed input: ${message}` };
  }
}
