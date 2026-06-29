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
  evaluateOutput,
  evaluateSentenceInput,
  runCheckConsistency,
  runCheckValidity,
  runClassify,
  runEvaluateArgument,
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

  return server;
}
