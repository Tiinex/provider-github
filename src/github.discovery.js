import { exactGithubCommit, normalizeGithubRepoPath, sourceGithubConfig } from './github.source.js';
import { fetchGithubJson } from './github.transport.js';

const MARKDOWN_RE = /\.(?:md|markdown)$/i;

export async function resolveGithubSourceRef(source = {}, options = {}) {
  const config = sourceGithubConfig(source, options);
  if (config.ref) return Object.freeze({ ref: config.ref, resolvedFrom: 'explicit', requests: 0, host: config.host, repo: config.repo });
  const [owner, repo] = config.repo.split('/');
  const url = `${config.host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const body = await fetchGithubJson(url, options);
  const ref = String(body?.default_branch || '').trim();
  if (!ref) throw githubDiscoveryError('github.ref.default-branch-missing', 'GitHub repository metadata did not provide a default branch.', { url });
  return Object.freeze({ ref, resolvedFrom: 'default-branch', requests: 1, host: config.host, repo: config.repo });
}

export async function resolveGithubMaterializedCommit(source = {}, options = {}) {
  const config = sourceGithubConfig(source, options);
  const alreadyExact = config.materializedCommit || exactGithubCommit(config.ref);
  if (alreadyExact) return Object.freeze({ ref: config.ref || alreadyExact, materializedCommit: alreadyExact, requests: 0, host: config.host, repo: config.repo });
  const refResolution = config.ref ? { ref: config.ref, requests: 0 } : await resolveGithubSourceRef(source, options);
  const ref = String(refResolution.ref || '').trim();
  const [owner, repo] = config.repo.split('/');
  const url = `${config.host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}`;
  const body = await fetchGithubJson(url, options);
  const materializedCommit = exactGithubCommit(body?.sha);
  if (!materializedCommit) throw githubDiscoveryError('github.commit.exact-sha-missing', 'GitHub commit resolution did not return an exact 40-character commit SHA.', { url, ref });
  return Object.freeze({ ref, materializedCommit, requests: Number(refResolution.requests || 0) + 1, host: config.host, repo: config.repo });
}

export async function discoverGithubMarkdownRefs(source = {}, input = {}, options = {}) {
  const config = sourceGithubConfig(source, { ...options, ...input });
  const resolved = await resolveGithubMaterializedCommit(source, { ...options, ref: config.ref, materializedCommit: config.materializedCommit });
  const [owner, repo] = config.repo.split('/');
  const url = `${config.host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${resolved.materializedCommit}?recursive=1`;
  const body = await fetchGithubJson(url, options);
  const roots = config.rootPaths.length ? config.rootPaths : ['.'];
  const maxFiles = normalizeMaxFiles(input.maxFiles ?? options.maxFiles) || 2000;
  const refs = [];
  let totalMarkdown = 0;
  for (const item of Array.isArray(body?.tree) ? body.tree : []) {
    if (String(item?.type || '') !== 'blob') continue;
    let repoPath;
    try { repoPath = normalizeGithubRepoPath(item.path || ''); }
    catch { continue; }
    if (!MARKDOWN_RE.test(repoPath)) continue;
    if (!insideAnyRoot(repoPath, roots)) continue;
    totalMarkdown += 1;
    if (refs.length < maxFiles) refs.push(repoPath);
  }
  refs.sort((a, b) => a.localeCompare(b));
  const warnings = [];
  if (body?.truncated) warnings.push({ code: 'github.discovery.tree-truncated', message: 'GitHub reported a truncated recursive tree; discovery is incomplete.' });
  if (totalMarkdown > refs.length) warnings.push({ code: 'github.discovery.bounded', message: `Loaded first ${refs.length} of ${totalMarkdown} Markdown files.`, maxFiles, totalMarkdown });
  return Object.freeze({
    repo: config.repo,
    ref: resolved.ref,
    materializedCommit: resolved.materializedCommit,
    refs: Object.freeze(refs),
    warnings: Object.freeze(warnings),
    diagnostics: Object.freeze({
      host: config.host.webBaseUrl,
      apiBaseUrl: config.host.apiBaseUrl,
      requestCount: Number(resolved.requests || 0) + 1,
      roots: Object.freeze(roots.slice()),
      maxFiles,
      totalMarkdown,
      treeTruncated: Boolean(body?.truncated)
    })
  });
}

export function githubDiscoveryError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function insideAnyRoot(repoPath, roots) {
  return roots.some((root) => root === '.' || repoPath === root || repoPath.startsWith(`${root}/`));
}

function normalizeMaxFiles(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.max(1, Math.min(Math.floor(number), 10000));
}
