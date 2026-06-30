/**
 * The CLI core, factored out of the bin so it is unit-testable without spawning
 * a process. `run` is pure: it returns the exit code + the text to print, and
 * never calls `process.exit` itself.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import {
  ParseError,
  evaluateArgument,
  evaluateMarkdown,
  evaluatePrompt,
  evaluateRepo,
  evaluateSentence,
  parseFormalizedArgument,
  toMarkdown,
  type LogicReport,
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

Options:
  --json                           print the LogicReport as JSON
  --sarif                          (accepted) note SARIF gating for location-less tiers
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
