/**
 * Emit the JSON Schema for the IR from the Zod source of truth.
 * Run via `pnpm --filter @entailer/core run gen:schema` (tsx resolves the
 * `.js` specifiers back to the TS sources).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { formalizedArgumentSchema } from "../src/ir.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "..", "schema");
const outFile = resolve(outDir, "ir.schema.json");

const jsonSchema = zodToJsonSchema(formalizedArgumentSchema, {
  name: "FormalizedArgument",
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(jsonSchema, null, 2) + "\n");
console.log(`wrote ${outFile}`);
