# Continuity Context

- Envelope Schema: [tiinex.root.v1](https://github.com/Tiinex/docs/blob/302506f90537dc23d6f88ad0bd0bb9c97c6cf9f6/.topics/.schemas/tiinex.root.v1.schema.md)
- Current
  - Current Schema: [tiinex.reduction.v1](https://github.com/Tiinex/docs/blob/302506f90537dc23d6f88ad0bd0bb9c97c6cf9f6/.topics/.schemas/reduction/tiinex.reduction.v1.schema.md)
  - Created At: 2026-10-03 18:20:00
  - Authors: Anchor
  - Summary: Collapse stale provider-github execution lineage into one recoverable fresh-start boundary.
  - Status: ready/local

---

# Provider Github Fresh Start Reduction

## Source Context

- Reduced Workspace: `provider-github`
- Immutable Recovery Snapshot: `Tiinex/provider-github@6e92571b0ccefe5252ef6bb4df43df541c72e637`
- Exact Pre-Reduction Work Tree: `98915d07c41fb672b8a00d4303c94a51f66c771b`
- Exact Candidate Manifest: 9 files / 29028 bytes; SHA-256 `b98f97cdd3b5dda1a6f7f74239a7aec059a31592fc3dcd4a984f105177df4528` over sorted `path<TAB>git-blob-sha<TAB>byte-length` rows.
- Reduced Source Scope: all files previously carried under `.topics/work/**`.
- Recovery Qualification: the pushed carrier baseline was Git-tree matched against the immutable repository snapshot before this reduction; the exact candidate scope is therefore recoverable without relying on chat history.

## Carry-Forward State

- GitHub provider source and contracts remain; no prior provider refactor Task is carried as active.
- Repository implementation/source material, Workspace descriptor, and durable non-work authority outside the declared source scope remain in place.
- There is intentionally no claim that any historical Task is ongoing merely because it was previously labelled ready/local or was a lineage leaf.

## Loss And Uncertainty

- Detailed execution chronology, intermediate Handoffs, Tasks, Evidence, prior local Workspace Reductions, and other reduced work artifacts leave the current tree.
- Their exact bytes remain recoverable from `Tiinex/provider-github@6e92571b0ccefe5252ef6bb4df43df541c72e637`.
- This Reduction does not retroactively claim successful completion, acceptance, or correctness for every removed artifact; it records that the removed execution history is historical and is not the current continuation surface.
- Future work that needs an old detail should recover it from the immutable snapshot and start a new explicit Task rather than revive stale lineage by filename or status.

## Validation

- Pre-delete pushed recovery verification: qualified by exact Git tree match to `Tiinex/provider-github@6e92571b0ccefe5252ef6bb4df43df541c72e637`.
- Candidate manifest applied: 9/9 exact source files removed; the old `.topics/work` tree and pre-existing Workspace Reduction artifacts in scope no longer remain.
- Post-delete reference scan found no surviving local relative reference into the removed candidate set.
- This fresh-start Reduction passed the shared Core audit with verified c14n-v2 self-integrity.

---

# Continuity Integrity

- [sha256-base64url-c14n-v2](https://github.com/Tiinex/docs/blob/3988951208eb9a8926e84ab42625d4b42fa00c2d/.topics/.validators/sha256-base64url-c14n-v2.validator.md)
  - Towards: self
  - Value:9BlCPMJe4kioDbiLeC4ZTVC6q3Q_HgwkROhfX0NdsUQ
