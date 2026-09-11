# @tiinex/provider-github

First-party GitHub provider for Tiinex. The package owns GitHub/GitHub-compatible host qualification, repository discovery, exact-commit Markdown materialization, and explicit GitHub publication execution over public Core contracts.

## Boundary

`provider-github` does not make GitHub semantic authority for generic browse, git, transport, export, or publication planning. It consumes the public Core adapter/artifact/publication contracts and supplies provider-specific host execution.

`github.com` is the built-in GitHub host. A different host is **never** classified as GitHub-compatible from URL resemblance alone. Custom hosts require explicit configuration:

```js
const host = {
  githubCompatible: true,
  webBaseUrl: 'https://ghe.example',
  apiBaseUrl: 'https://ghe.example/api/v3'
};
```

`rawBaseUrl` is optional for a custom host. Without it, file materialization uses the explicitly configured GitHub Contents API with the raw media type rather than guessing a raw-host URL.

## Source API

```js
import {
  createGithubProvider,
  registerGithubSource,
  discoverGithubMarkdownRefs,
  materializeGithubSource
} from '@tiinex/provider-github';

const source = registerGithubSource({
  repo: 'Tiinex/docs',
  ref: 'main',
  rootPaths: ['.topics']
});

const result = await materializeGithubSource(source, { repoDiscovery: true }, { fetchImpl: fetch });
```

Discovery resolves the configured/default branch to an exact 40-character commit before recursive tree enumeration. Materialized relative file paths are then read at that exact commit. Same-repository GitHub blob/raw URLs are accepted; cross-repository and unrelated-host URLs fail closed.

## Publication API

`executeGithubPublication(plan, options)` consumes a **ready shared Core publication plan**. It performs no mutation unless `options.authorization` explicitly binds both the exact `planId` and outbound payload SHA-256. Repo-file writes additionally require an explicit commit message. On `github.com`, supported host execution surfaces are repo files, issue bodies, and issue comments; every successful return is based on exact provider read-after-write verification through Core `buildPublicationResult`. Custom GitHub-compatible hosts support repo-file publication, while social mutation is blocked before write until the shared neutral publication contract can qualify custom-host issue/comment targets.

```js
const result = await executeGithubPublication(plan, {
  authorization: {
    authorized: true,
    planId: plan.planId,
    payloadSha256: plan.outboundPayload.sha256
  },
  commitMessage: 'Publish exact Markdown',
  token,
  fetchImpl: fetch
});
```

Credentials are runtime-only options and are never persisted into registered source configuration.

## Capability / contract mapping

| Provider capability | Implementation | Shared contract |
| --- | --- | --- |
| Register source | `registerGithubSource` | Core `makeSourceRegistration` |
| Discover repository | `discoverGithubMarkdownRefs` | neutral adapter `discover` capability |
| Materialize Markdown | `materializeGithubSource` | Core `makeAdapterResult` + `createRecordFromMarkdown` |
| Resolve exact source identity | `resolveGithubSourceRef`, `resolveGithubMaterializedCommit` | provider-owned GitHub host behavior |
| Execute publication | `executeGithubPublication` | Core ready publication plan + `buildPublicationResult` |
| Verify publication | `verifyGithubPublication` | required exact read-after-write observation |

## Known owner-side reconciliation

The current Core snapshot still contains GitHub-specific publication target kinds/parsing in `publication.targetContract.js` and `sources/github/github.issueTarget.js`. This provider no longer needs those helpers for its own host/source qualification, but Core must move that provider identity out of the neutral owner contract before custom GitHub-compatible social publication can be fully provider-neutral. This package does not patch Core or App.

## Qualification

Run `npm test` for focused use-case qualification and `npm run pack:check` for package closure. Tests prove explicit host qualification, no URL-shape forge inference, default-branch → exact-commit discovery, raw/API contents materialization, cross-repository rejection, fail-closed mutation authorization, and exact repo-file read-after-write verification.
