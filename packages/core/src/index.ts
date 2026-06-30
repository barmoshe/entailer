/**
 * @entailer/core — public API.
 *
 * The trusted deterministic kernel. Pure TypeScript, zero LLM/solver
 * dependencies. Logic lives here and only here.
 */

// ---- AST + DSL ------------------------------------------------------------
export {
  // types
  type Term,
  type Var,
  type FuncTerm,
  type Formula,
  type Atom,
  type Pred,
  type Not,
  type And,
  type Or,
  type Implies,
  type Iff,
  type Bottom,
  type Top,
  type Forall,
  type Exists,
  // term constructors
  v,
  cst,
  fn,
  // formula constructors
  atom,
  pred,
  not,
  and,
  or,
  implies,
  iff,
  bottom,
  top,
  forall,
  exists,
  andAll,
  // utilities
  formulaToString,
  isPropositional,
  propAtomKey,
  atomsOf,
} from "./ast.js";

export { parse, ParseError } from "./parser.js";

// ---- Deterministic engines ------------------------------------------------
export {
  type Assignment,
  OutOfFragmentError,
  evaluate,
  allAssignments,
  satModels,
  isSat,
  isValid,
  isContradiction,
  firstCounterModel,
} from "./evaluate.js";

export {
  type TableauNode,
  type TableauEdge,
  type ProofTree,
  type TableauResult,
  refute,
} from "./tableau.js";

export { dpllSat, type DpllResult } from "./dpll.js";

// ---- Verify API -----------------------------------------------------------
export {
  type ValidityVerdict,
  type ConsistencyStatus,
  type ClassifyKind,
  type ValidityResult,
  type ConsistencyResult,
  checkValidity,
  checkConsistency,
  classify,
} from "./verify/index.js";

// ---- IR + schemas ---------------------------------------------------------
export {
  type Logic,
  type Source,
  type SourceSpan,
  type SymbolEntry,
  type TranslationConfidence,
  type FormalizedArgument,
  type ClaimSet,
  logicSchema,
  sourceSchema,
  sourceSpanSchema,
  symbolEntrySchema,
  formulaSchema,
  formalizedArgumentSchema,
  argumentReadingSchema,
  claimSetSchema,
  parseFormalizedArgument,
} from "./ir.js";

// ---- Report ---------------------------------------------------------------
export {
  type Verdict,
  type Severity,
  type LogicReport,
  type BuildReportInput,
  HONESTY_CONTRACT,
  verdictSchema,
  severitySchema,
  logicReportSchema,
  buildReport,
  toMarkdown,
} from "./report.js";

// ---- Adapters -------------------------------------------------------------
export {
  type SentenceInput,
  type DslSentenceInput,
  type SuppliedArgInput,
  evaluateSentence,
} from "./adapters/sentence.js";

export {
  type EvaluateArgumentOptions,
  evaluateArgument,
} from "./adapters/argument.js";

export {
  type PromptInput,
  type PromptClaimInput,
  evaluatePrompt,
  recoverConclusionIndex,
} from "./adapters/prompt.js";

export {
  type MarkdownInput,
  type ExtractedDoc,
  type ExtractedClaim,
  evaluateMarkdown,
  extractDoc,
} from "./adapters/markdown.js";

// ---- Taxonomy (machine-consumable; seeded, codegen pending) ---------------
export * from "./taxonomy.js";
