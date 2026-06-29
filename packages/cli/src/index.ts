#!/usr/bin/env node
/** Entailer CLI entrypoint. Thin: parse argv, delegate to `run`, set exit code. */
import { run } from "./run.js";

const result = run(process.argv.slice(2));
if (result.stdout) process.stdout.write(result.stdout + "\n");
if (result.stderr) process.stderr.write(result.stderr + "\n");
process.exit(result.code);
