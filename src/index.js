export {
  GITHUB_DOT_COM_HOST,
  qualifyGithubHost,
  sameGithubHost
} from './github.host.js';

export {
  GITHUB_FILE_SOURCE_KIND,
  GITHUB_PROVIDER_ID,
  GITHUB_REPO_SOURCE_KIND,
  createGithubProvider,
  exactGithubCommit,
  normalizeGithubRepoPath,
  normalizeGithubRepository,
  normalizeGithubRootPaths,
  registerGithubSource,
  sourceGithubConfig
} from './github.source.js';

export {
  discoverGithubMarkdownRefs,
  resolveGithubMaterializedCommit,
  resolveGithubSourceRef
} from './github.discovery.js';

export {
  loadGithubFilesForSource,
  materializeGithubSource,
  normalizeGithubRefToRaw,
  parseGithubFileRef
} from './github.materialize.js';

export {
  GITHUB_ISSUE_BODY_TARGET_KIND,
  GITHUB_ISSUE_COMMENT_TARGET_KIND,
  GITHUB_REPO_FILE_TARGET_KIND,
  authorizeGithubPublication,
  executeGithubPublication,
  qualifyGithubSocialTarget,
  verifyGithubPublication
} from './github.publication.js';
