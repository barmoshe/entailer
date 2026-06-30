---
name: Bug report
about: A wrong verdict, a crash, or unexpected behavior
title: "bug: "
labels: bug
---

**Which package and version**
e.g. `@entailer/core@0.1.0`

**What you ran**
The input (DSL string, IR JSON, markdown, or the CLI/MCP call). Minimal is best.

**What you expected vs what happened**
For a wrong verdict, include the `LogicReport` (`--json`) so the symbol dictionary,
formalization, and the certificate (proof / counter-model / minimal subset) are visible.
Remember: `validity != truth`. A `VALID` over premises you believe are false is not a bug.

**Environment**
Node version, OS, and whether `@entailer/solver` / `z3-solver` is installed (if relevant).
