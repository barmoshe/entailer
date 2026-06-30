# Security Policy

## Reporting a vulnerability

Please report security issues privately to **Barprojectsandbuilds@gmail.com**, or
via GitHub's private "Report a vulnerability" advisory flow. Do not open a public
issue for a suspected vulnerability.

Include a description, reproduction steps, and the affected package and version. We
aim to acknowledge reports within a few days.

## Supported versions

entailer is pre-1.0. Security fixes target the latest published `0.x` release of
each `@entailer/*` package.

## Scope notes

- **Translation faithfulness is not a vulnerability.** entailer reports the logical
  validity and consistency of the *displayed formalization*. An LLM translating
  prose into the wrong logic is a known, documented limitation (see `DESIGN.md`),
  surfaced through the confidence band and the `UNKNOWN` verdict, not a security bug.
- The deterministic core takes structured input only and runs no untrusted code.
- The optional `@entailer/solver` runs Z3 (WASM) over emitted SMT-LIB; the SMT-LIB
  is generated from the typed IR, not from raw user text.
