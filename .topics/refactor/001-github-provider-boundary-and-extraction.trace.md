# Continuity Context

- Envelope Schema: tiinex.root.v1
- Parent
  - Parent Schema: [tiinex.topic.v1](https://github.com/Tiinex/docs/blob/053d46ce082d4ec261b82abc44ecca403d61e240/.topics/.schemas/core/topic/tiinex.topic.v1.schema.md)
  - Created At: 2026-09-09 15:45:03
  - Trace: [001-turn-2-repository-decomposition-frontier.trace.md](../../business::.topics/initiatives/refactor/repositories/001-turn-2-repository-decomposition-frontier.trace.md)
  - Origin:
    - [relative](../../business::.topics/initiatives/refactor/repositories/001-turn-2-repository-decomposition-frontier.trace.md)
- Current
  - Current Schema: [tiinex.task.v1](https://github.com/Tiinex/docs/blob/053d46ce082d4ec261b82abc44ecca403d61e240/.topics/.schemas/core/task/tiinex.task.v1.schema.md)
  - Created At: 2026-09-09 15:48:19
  - Authors: Anchor
  - Why: Give provider-github its own executable Task lineage while retaining the cross-repository objective in Business.
  - Summary: Extract GitHub-family discovery, browse/git resolution and publication behavior from Core/App into an independently versioned first-party provider.
  - Status: ready/local

---

# GitHub provider boundary and extraction

## Objective

Extract GitHub-family discovery, browse/git resolution and publication behavior from Core/App into an independently versioned first-party provider.

## Done Criteria

- The repository boundary is explicit and independently understandable.
- Package/release identity matches `Tiinex/provider-github` and `@tiinex/provider-github`.
- Shared contracts are consumed through public neutral surfaces rather than copied sibling implementation.
- Qualification is fast, use-case oriented and fail-closed where lineage, source identity, authority or destructive behavior is involved.

## Scope

GitHub and genuinely GitHub-compatible host behavior. Generic browse/git semantics remain provider-neutral; do not classify unrelated forges as GitHub by URL resemblance alone.

## Dependencies

- Controlling Business lineage: `business::.topics/initiatives/refactor/repositories/001-turn-2-repository-decomposition-frontier.trace.md`.
- Shared contract changes remain owned by their current repository/semantic authority and are returned to Refactor Anchor for reconciliation.

---

# Continuity Integrity

- [sha256-base64url-c14n-v2](https://github.com/Tiinex/docs/blob/3988951208eb9a8926e84ab42625d4b42fa00c2d/.topics/.validators/sha256-base64url-c14n-v2.validator.md)
  - Towards: [001-turn-2-repository-decomposition-frontier.trace.md](../../business::.topics/initiatives/refactor/repositories/001-turn-2-repository-decomposition-frontier.trace.md)
  - Value: FSTPBfQmP7ZXOwuLt5OxiGGRIC7uF4WtwqPKJO54Dzw

- [sha256-base64url-c14n-v2](https://github.com/Tiinex/docs/blob/3988951208eb9a8926e84ab42625d4b42fa00c2d/.topics/.validators/sha256-base64url-c14n-v2.validator.md)
  - Towards: self
  - Value: HV7PH013mfpHl7WBvj_yC7Z59H6mnx4U7gvMMGzMBew