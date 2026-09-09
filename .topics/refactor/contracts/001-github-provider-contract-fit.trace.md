# Continuity Context

- Envelope Schema: tiinex.root.v1
- Parent
  - Parent Schema: [tiinex.task.v1](https://github.com/Tiinex/docs/blob/053d46ce082d4ec261b82abc44ecca403d61e240/.topics/.schemas/core/task/tiinex.task.v1.schema.md)
  - Created At: 2026-09-09 15:48:19
  - Trace: [001-github-provider-boundary-and-extraction.trace.md](../001-github-provider-boundary-and-extraction.trace.md)
  - Origin:
    - [relative](../001-github-provider-boundary-and-extraction.trace.md)
- Current
  - Current Schema: [tiinex.task.v1](https://github.com/Tiinex/docs/blob/053d46ce082d4ec261b82abc44ecca403d61e240/.topics/.schemas/core/task/tiinex.task.v1.schema.md)
  - Created At: 2026-09-09 15:48:19
  - Authors: Anchor
  - Why: Decompose provider-github work so progress and later Reduction remain local and auditable.
  - Summary: Map current GitHub coupling to generic provider capabilities and identify leakage that must leave Core/App.
  - Status: ready/local

---

# GitHub provider contract fit

## Objective

Map current GitHub coupling to generic provider capabilities and identify leakage that must leave Core/App.

## Done Criteria

- The scoped result is represented in repository source/evidence.
- Any shared-boundary dependency is returned explicitly rather than implemented outside repository authority.
- A focused qualification protects the affected public/use-case behavior.

## Scope

Repository-local work for this subarea only. Do not expand into sibling repository implementation.

## Dependencies

- Parent repository Task: `.topics/refactor/001-github-provider-boundary-and-extraction.trace.md`.
- Cross-repository blockers return to Refactor Anchor for reconciliation.

---

# Continuity Integrity

- [sha256-base64url-c14n-v2](https://github.com/Tiinex/docs/blob/3988951208eb9a8926e84ab42625d4b42fa00c2d/.topics/.validators/sha256-base64url-c14n-v2.validator.md)
  - Towards: [001-github-provider-boundary-and-extraction.trace.md](../001-github-provider-boundary-and-extraction.trace.md)
  - Value: HV7PH013mfpHl7WBvj_yC7Z59H6mnx4U7gvMMGzMBew

- [sha256-base64url-c14n-v2](https://github.com/Tiinex/docs/blob/3988951208eb9a8926e84ab42625d4b42fa00c2d/.topics/.validators/sha256-base64url-c14n-v2.validator.md)
  - Towards: self
  - Value: J7SOeR2naf5al2Sxb5Cyh0jF45vxHkmaQW6xnMxre_g