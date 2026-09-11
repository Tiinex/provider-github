import {
  AdapterAvailability,
  makeAdapterDefinition,
  makeSourceRegistration
} from '@tiinex/core/adapters/adapter.contracts.js';
import { GITHUB_DOT_COM_HOST, qualifyGithubHost, githubHostError } from './github.host.js';

export const GITHUB_PROVIDER_ID = 'github';
export const GITHUB_REPO_SOURCE_KIND = 'github.repo';
export const GITHUB_FILE_SOURCE_KIND = 'github.file';

const REPO_SEGMENT = /^[A-Za-z0-9_.-]+$/;

export function createGithubProvider(options = {}) {
  const host = qualifyGithubHost(options.host);
  return makeAdapterDefinition({
    id: GITHUB_PROVIDER_ID,
    label: host.builtin ? 'GitHub' : `GitHub-compatible (${new URL(host.webBaseUrl).hostname})`,
    availability: AdapterAvailability.available,
    sourceKinds: [GITHUB_REPO_SOURCE_KIND, GITHUB_FILE_SOURCE_KIND],
    capabilities: {
      registerSource: true,
      materialize: true,
      discover: true,
      resolveAsset: false,
      openExternal: false,
      exportMaterial: false,
      requiresBridge: false
    },
    configShape: {
      repo: 'owner/name or an exact repository URL on the qualified GitHub-family host',
      ref: 'branch | tag | exact commit | empty means resolve host default branch',
      rootPaths: 'optional repo-relative discovery roots',
      fileRefs: 'optional explicit repo-relative Markdown paths or same-repository GitHub raw/blob URLs',
      host: 'github.com by default; custom hosts require explicit githubCompatible:true plus HTTPS web/api bases'
    },
    boundary: 'GitHub/GitHub-compatible host identity, repository discovery, file resolution and provider execution only; generic browse/git/export semantics remain provider-neutral.',
    notes: [
      'Unrelated forges are never classified as GitHub by URL shape alone.',
      'Network execution accepts an injected fetch implementation; credentials remain runtime-only and are not persisted in source configuration.'
    ]
  });
}

export function registerGithubSource(input = {}, options = {}) {
  const config = input.config || {};
  const host = qualifyGithubHost(input.host ?? config.host ?? options.host);
  const repo = normalizeGithubRepository(input.repo || input.repository || config.repo || config.repository || input.url || config.url || '', host);
  const ref = String(input.ref ?? config.ref ?? '').trim();
  const rootPaths = normalizeGithubRootPaths(input.rootPaths ?? input.rootPath ?? config.rootPaths ?? config.rootPath ?? []);
  const fileRefs = normalizeFileRefs(input.fileRefs ?? config.fileRefs ?? []);
  return makeSourceRegistration({
    id: input.id || '',
    adapterId: GITHUB_PROVIDER_ID,
    sourceKind: input.sourceKind || GITHUB_REPO_SOURCE_KIND,
    label: input.label || repo,
    config: {
      repo,
      ref,
      host,
      ...(rootPaths.length ? { rootPaths } : {}),
      ...(fileRefs.length ? { fileRefs } : {})
    },
    boundary: createGithubProvider({ host }).boundary,
    closeable: input.closeable !== false
  }, createGithubProvider({ host }));
}

export function normalizeGithubRepository(value = '', hostInput = undefined) {
  const host = qualifyGithubHost(hostInput);
  const raw = String(value || '').trim();
  if (!raw) throw githubHostError('github.repo.required', 'GitHub source requires an exact repository identity.');
  if (/^https?:\/\//i.test(raw)) {
    let url;
    try { url = new URL(raw); } catch { throw githubHostError('github.repo.invalid', `Invalid GitHub repository URL: ${raw}`); }
    if (url.protocol !== 'https:') throw githubHostError('github.repo.https-required', 'GitHub repository URLs must use HTTPS.');
    const expected = new URL(host.webBaseUrl);
    if (url.hostname.toLowerCase() !== expected.hostname.toLowerCase() || normalizeWebBasePath(url.pathname, expected.pathname) === null) {
      throw githubHostError('github.repo.host-mismatch', 'Repository URL does not belong to the explicitly qualified GitHub-family host.');
    }
    const relativePath = normalizeWebBasePath(url.pathname, expected.pathname);
    const parts = relativePath.split('/').filter(Boolean);
    if (parts.length !== 2) throw githubHostError('github.repo.url-not-repository-root', 'GitHub repository URL must identify exactly one repository root.');
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, '');
    return validateRepositoryParts(owner, repo);
  }
  if (raw.includes('://') || raw.startsWith('git@') || raw.startsWith('ssh:')) {
    throw githubHostError('github.repo.unsupported-transport-identity', 'Provider repository identity accepts owner/name or exact HTTPS repository URLs; generic git transport parsing remains outside this provider.');
  }
  const parts = raw.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length !== 2) throw githubHostError('github.repo.invalid', 'GitHub repository identity must be owner/name.');
  return validateRepositoryParts(parts[0], parts[1]);
}

export function normalizeGithubRepoPath(value = '') {
  const raw = String(value ?? '').trim().replace(/\\/g, '/');
  if (!raw) throw githubHostError('github.path.required', 'GitHub repository path is required.');
  if (raw.startsWith('/') || /^[A-Za-z]:\//.test(raw) || /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
    throw githubHostError('github.path.relative-required', 'GitHub repository paths must be repository-relative.');
  }
  const parts = raw.split('/');
  const clean = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') throw githubHostError('github.path.traversal', 'GitHub repository path traversal is not allowed.');
    clean.push(part);
  }
  if (!clean.length) throw githubHostError('github.path.required', 'GitHub repository path is required.');
  return clean.join('/');
}

export function normalizeGithubRootPaths(value = []) {
  const list = Array.isArray(value) ? value : String(value || '').split(/\r?\n|,/);
  const out = [];
  for (const item of list) {
    const raw = String(item || '').trim();
    if (!raw || raw === '.' || raw === './') {
      if (raw) out.push('.');
      continue;
    }
    out.push(normalizeGithubRepoPath(raw).replace(/\/+$/, ''));
  }
  return [...new Set(out)];
}

export function sourceGithubConfig(source = {}, options = {}) {
  const config = source?.config && typeof source.config === 'object' ? source.config : source;
  const host = qualifyGithubHost(options.host ?? config.host ?? source.host);
  const repo = normalizeGithubRepository(config.repo || config.repository || source.repo || source.repository || '', host);
  return Object.freeze({
    host,
    repo,
    ref: String(options.ref ?? config.ref ?? source.ref ?? '').trim(),
    materializedCommit: exactGithubCommit(options.materializedCommit ?? config.materializedCommit ?? source.materializedCommit ?? ''),
    rootPaths: normalizeGithubRootPaths(options.rootPaths ?? config.rootPaths ?? config.rootPath ?? source.rootPaths ?? source.rootPath ?? []),
    fileRefs: normalizeFileRefs(options.fileRefs ?? config.fileRefs ?? source.fileRefs ?? [])
  });
}

export function exactGithubCommit(value = '') {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{40}$/i.test(clean) ? clean.toLowerCase() : '';
}

function normalizeFileRefs(value) {
  const list = Array.isArray(value) ? value : (String(value || '').trim() ? [value] : []);
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))];
}

function validateRepositoryParts(owner, repo) {
  const cleanOwner = String(owner || '').trim();
  const cleanRepo = String(repo || '').trim();
  if (!cleanOwner || !cleanRepo || cleanOwner === '.' || cleanOwner === '..' || cleanRepo === '.' || cleanRepo === '..' || !REPO_SEGMENT.test(cleanOwner) || !REPO_SEGMENT.test(cleanRepo)) {
    throw githubHostError('github.repo.invalid', 'GitHub repository owner/name contains unsupported characters.');
  }
  return `${cleanOwner}/${cleanRepo}`;
}

function normalizeWebBasePath(pathname, basePath) {
  const path = String(pathname || '').replace(/\/+$/, '');
  const base = String(basePath || '').replace(/\/+$/, '');
  if (!base || base === '/') return path.replace(/^\/+/, '');
  if (path === base) return '';
  if (!path.startsWith(base + '/')) return null;
  return path.slice(base.length + 1);
}
