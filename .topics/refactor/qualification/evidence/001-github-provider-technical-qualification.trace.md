# Continuity Context

- Envelope Schema: tiinex.root.v1
- Parent
  - Parent Schema: [tiinex.task.v1](https://github.com/Tiinex/docs/blob/053d46ce082d4ec261b82abc44ecca403d61e240/.topics/.schemas/core/task/tiinex.task.v1.schema.md)
  - Created At: 2026-09-09 15:48:22
  - Trace: [001-github-provider-qualification.trace.md](../001-github-provider-qualification.trace.md)
  - Origin:
    - [relative](../001-github-provider-qualification.trace.md)
- Current
  - Current Schema: tiinex.evidence.v1
  - Created At: 2026-09-09 20:13:24
  - Authors: Anchor
  - Why: Seal exact local qualification and boundary evidence for the transferred GitHub provider implementation before return.
  - Summary: Provider-github passes exact focused tests and package closure with explicit host qualification, exact-commit source identity and fail-closed publication gates.
  - Status: ready/local

---

## Supported Claim Or Question

- Supported Claim Or Question: does `@tiinex/provider-github` now provide an independently consumable GitHub/GitHub-compatible provider for explicit host qualification, repository/default-ref resolution, exact-commit Markdown discovery/materialization and fail-closed provider publication execution over public neutral Core contracts
- Evidence Role: qualifies provider-github source, package surface, forge-classification boundary and destructive-action gates against the repo-owned Task lineage

## Provenance

- Known Source: current provider-github Workspace materialized through Tiinex from the qualified 001 Anchor-to-Anchor Provider-family carrier, with Core/App consulted read-only from qualified sibling Workspaces
- Provenance Limits: exact local qualification only; no claim of remote publication, registry state, or owner-side integration completion
- Preservation Basis: source changes are confined to provider-github; the local `node_modules/@tiinex/core` link is runtime-only qualification plumbing excluded from canonical manufacture
- Receipt: `evidence/receipts/001-provider-github-technical-qualification.json`
- Exact Test Output: `evidence/receipts/001-provider-github-npm-test.tap` (`sha256:429928ea1a866e06884dd461fa2c3eb416f98bf81ddbfa68a7bc35d76dbb4587`)
- Exact Pack Output: `evidence/receipts/001-provider-github-npm-pack-dry-run.json` (`sha256:f999f8c1ef85d167e162ea5ff1c2622e558d74bdebc74941c1c0f79aabd2b9bf`)
- Technical Receipt Digest: `sha256:d1899658922fedd0a588d0451c51bf4f3a94304fd36decd6a889cc465b60101e`

## Evidence Material

- Material: current provider source plus exact local qualification receipts sealed under this Evidence artifact
- Material Kind: provider source, focused fetch-fixture qualification, exact publication verification test, package dry-run receipt and source manifest
- `npm test`: passed **12/12**, failed **0**
- `npm pack --dry-run --json`: exit **0**, package `@tiinex/provider-github@0.1.0`, **11** publishable entries, package size **17345** bytes, unpacked size **67933** bytes
- Pack SHA-1: `078649431b0ea9b6566db51bb9700ad31ce1b68d`
- Pack Integrity: `sha512-G5j+AnAjCmUWiCxB9IKbvf1kt82OI7ou/jjT9PFIO8BxmmhxLqsLZfzDy9nxJBJqp5OFPl0wMjRJsE2i2Z9rUw==`
- Host Qualification: `github.com` is built in; a custom host is rejected unless `githubCompatible:true` and explicit HTTPS web/API base URLs are supplied; unrelated forge URLs are not inferred as GitHub
- Source Qualification: default branch resolution is followed by exact 40-character commit resolution before recursive Markdown discovery; materialization reads at the exact commit; cross-repository, unrelated-host and mismatched-ref file URLs fail closed
- Publication Qualification: remote mutation requires authorization bound to both exact `planId` and outbound payload SHA-256; repo-file update additionally requires an explicit commit message and exact existing blob identity; success requires exact read-after-write verification through Core `buildPublicationResult`
- Custom-host Social Safety: custom GitHub-compatible issue/comment mutation is blocked **before write** until the shared Core publication contract can qualify custom-host social targets
- Browser-host Viability: provider-github source contains no Node built-in imports; SHA-256/UTF-8 primitives come from public Core browser-compatible bytes utilities

## Capability And Contract Mapping

- Provider definition and source registration: `createGithubProvider` / `registerGithubSource` -> public Core adapter contracts
- GitHub-family host identity: `qualifyGithubHost` -> provider-owned explicit compatibility policy
- Repository/default-ref/exact-commit resolution: `resolveGithubSourceRef` / `resolveGithubMaterializedCommit` -> provider-owned GitHub API behavior
- Markdown discovery/materialization: `discoverGithubMarkdownRefs` / `materializeGithubSource` -> neutral Core adapter result and artifact record contracts
- Publication execution: `executeGithubPublication` -> ready Core publication plan, provider-owned GitHub API mutation, exact read-after-write observation, Core `buildPublicationResult`

## Owner-Side Reconciliation

- Core Blocker: current read-only Core `src/publication/publication.targetContract.js` still branches on provider identity `github`, exports GitHub target kinds, and imports `src/sources/github/github.issueTarget.js`; that parser is hard-coded to `github.com` social URLs. This prevents provider-github from making custom GitHub-compatible social publication fully provider-neutral without a Core-owned contract change.
- Proposed Core Change: replace GitHub-specific target parsing/kinds in the neutral publication owner with provider-neutral exact-target semantics/capability data, leaving GitHub social URL qualification in provider-github. Preserve Core ownership of publication plan/result truth and exact read-after-write requirements.
- App Reconciliation: current read-only App still contains its concrete GitHub adapter/registry and guided GitHub publication modules. App owns wiring/removal through its concurrent provider-neutral integration lane; this provider lane does not mutate App or copy App-private generic policy.

## Preservation And Fidelity

- Preservation State: generic browse/git/export/publication-plan semantics remain in their owners; credentials are runtime-only inputs and are not persisted in source configuration
- Fidelity Notes: custom hosts without an explicit raw base use the configured GitHub Contents API raw media type rather than a guessed raw hostname; absolute same-repository file URLs cannot silently switch away from the exact source ref
- Known Losses: custom-host social publication remains intentionally unavailable pending the Core-owned neutral target-contract reconciliation above

## Interpretation Limits

- Not Yet Used As: owner acceptance, npm publication authority, or proof of cross-repository integration completion
- Does Not Prove: npm publication, registry state, App integration wiring, arbitrary forge compatibility, generic Git transport semantics, or that GitHub is semantic authority for publication truth
- Must Not Be Treated As: permission to classify Gitea/Forgejo/GitLab as GitHub, permission to mutate without exact plan-bound authorization, or authority to edit Core/App from this lane

---

# Continuity Integrity

- [sha256-base64url-c14n-v2](https://github.com/Tiinex/docs/blob/3988951208eb9a8926e84ab42625d4b42fa00c2d/.topics/.validators/sha256-base64url-c14n-v2.validator.md)
  - Towards: [001-github-provider-qualification.trace.md](../001-github-provider-qualification.trace.md)
  - Value: 7IHQ-W68u_n_RPlyofu-7CVVNl_bZY45SHEZBKR9qqk

- [sha256-base64url-c14n-v2](https://github.com/Tiinex/docs/blob/3988951208eb9a8926e84ab42625d4b42fa00c2d/.topics/.validators/sha256-base64url-c14n-v2.validator.md)
  - Towards: self
  - Value: c4dVdS-SKuaTkvKEn_uSP92Lm9yi9F_f9i8yOF2I5W0