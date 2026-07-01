/**
 * The Entailer MCP server. Stateless, stdio. Registers the deterministic
 * verification tools over `@entailer/core` with zod input/output schemas and
 * structured content. Mirrors the house `palette-oklch` convention (DESIGN §7).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  checkConsistencyInput,
  checkConsistencyOutput,
  checkValidityInput,
  checkValidityOutput,
  classifyInput,
  classifyOutput,
  evaluateArgumentInput,
  evaluateDomainInput,
  evaluateDomainOutput,
  evaluateMarkdownInput,
  evaluateOutput,
  evaluatePrInput,
  evaluatePromptInput,
  evaluateRepoInput,
  evaluateSentenceInput,
  runCheckConsistency,
  runCheckValidity,
  runClassify,
  runEvaluateArgument,
  runEvaluateDomain,
  runEvaluateMarkdown,
  runEvaluatePr,
  runEvaluatePrompt,
  runEvaluateRepo,
  runEvaluateSentence,
} from "./tools.js";

/** Build a configured (but not yet connected) Entailer MCP server. */
export function createServer(): McpServer {
  const server = new McpServer({ name: "entailer", version: "0.1.0" });

  server.registerTool(
    "check_validity",
    {
      title: "Check validity",
      description:
        "Does the conclusion follow from the premises? Closed refutation ⇒ VALID; " +
        "open ⇒ INVALID with a counter-model. Inconsistent premises ⇒ flagged vacuous. " +
        "Out-of-fragment input ⇒ UNKNOWN. Inputs are logic-DSL strings.",
      inputSchema: checkValidityInput,
      outputSchema: checkValidityOutput,
    },
    (args) => runCheckValidity(args),
  );

  server.registerTool(
    "check_consistency",
    {
      title: "Check consistency",
      description:
        "Is the claim set jointly satisfiable? UNSAT returns a minimal conflicting " +
        "subset (indices into the input). A clean result is reported as no contradiction " +
        "found, never 'proven consistent'.",
      inputSchema: checkConsistencyInput,
      outputSchema: checkConsistencyOutput,
    },
    (args) => runCheckConsistency(args),
  );

  server.registerTool(
    "classify_formula",
    {
      title: "Classify a formula",
      description: "Classify a single formula as tautology / contradiction / contingent.",
      inputSchema: classifyInput,
      outputSchema: classifyOutput,
    },
    (args) => runClassify(args),
  );

  server.registerTool(
    "evaluate_sentence",
    {
      title: "Evaluate a sentence",
      description:
        "Tier-1: classify one claim and return a full LogicReport. Supply a symbol " +
        "dictionary for an honest report; validity, consistency, and truth stay separate.",
      inputSchema: evaluateSentenceInput,
      outputSchema: evaluateOutput,
    },
    (args) => runEvaluateSentence(args),
  );

  server.registerTool(
    "evaluate_argument",
    {
      title: "Evaluate a supplied argument",
      description:
        "Evaluate a FormalizedArgument IR (premises + optional conclusion + symbols) into " +
        "a LogicReport. The IR must carry a non-empty symbol dictionary or it is rejected.",
      inputSchema: evaluateArgumentInput,
      outputSchema: evaluateOutput,
    },
    (args) => runEvaluateArgument(args),
  );

  server.registerTool(
    "evaluate_prompt",
    {
      title: "Evaluate a prompt (Tier 2)",
      description:
        "Evaluate a prompt's claims: recover the conclusion from indicator words, treat flagged " +
        "enthymemes as premise-supplied, and check argument validity (or consistency if no conclusion).",
      inputSchema: evaluatePromptInput,
      outputSchema: evaluateOutput,
    },
    (args) => runEvaluatePrompt(args),
  );

  server.registerTool(
    "evaluate_markdown",
    {
      title: "Evaluate a markdown doc (Tier 3)",
      description:
        "Check within-doc consistency of a markdown document's fenced `entailer` claim blocks, " +
        "reporting the minimal conflicting subset back to path:line.",
      inputSchema: evaluateMarkdownInput,
      outputSchema: evaluateOutput,
    },
    (args) => runEvaluateMarkdown(args),
  );

  server.registerTool(
    "evaluate_repo",
    {
      title: "Evaluate a repo (Tier 4)",
      description:
        "Cross-file consistency over a set of markdown docs (the caller supplies file contents; " +
        "the core stays filesystem-free). Returns a selection manifest and a coverage caveat.",
      inputSchema: evaluateRepoInput,
      outputSchema: evaluateOutput,
    },
    (args) => runEvaluateRepo(args),
  );

  server.registerTool(
    "evaluate_pull_request",
    {
      title: "Evaluate a pull request (Tier 5)",
      description:
        "Base→head delta over a PR: cross-file consistency of the base claim-set vs the head " +
        "claim-set, reporting what the PR introduced / fixed and folding the PR description's " +
        "`entailer` claims into the head. `gate` drives the verdict (head | introduced); " +
        "`descriptionSeverity` governs the folded description (fail | warn | off).",
      inputSchema: evaluatePrInput,
      outputSchema: evaluateOutput,
    },
    (args) => runEvaluatePr(args),
  );

  server.registerTool(
    "evaluate_domain",
    {
      title: "Evaluate concept faithfulness (domain lens)",
      description:
        "Check a codebase against a declared concept cluster (member/user/guest, etc.). Only a " +
        "rank-1 finding is a verdict — one identifier fusing two declared-disjoint concepts, or a " +
        "self-contradictory declaration; ranks 2–3 are reader hints that assert nothing. Supply the " +
        "cluster declaration and file contents (core stays FS-free). `gate=introduced` + `base` " +
        "reports only leaks new vs the base.",
      inputSchema: evaluateDomainInput,
      outputSchema: evaluateDomainOutput,
    },
    (args) => runEvaluateDomain(args),
  );

  return server;
}
