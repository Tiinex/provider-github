import { makeAdapterResult } from '@tiinex/core/adapters/adapter.contracts.js';
import { createRecordFromMarkdown } from '@tiinex/core/artifacts/artifact.record.js';
import { qualifyGithubHost, githubHostError } from './github.host.js';
import {
  GITHUB_PROVIDER_ID,
  GITHUB_REPO_SOURCE_KIND,
  exactGithubCommit,
  normalizeGithubRepoPath,
  normalizeGithubRepository,
  registerGithubSource,
  sourceGithubConfig
} from './github.source.js';
import { discoverGithubMarkdownRefs, resolveGithubMaterializedCommit } from './github.discovery.js';
import { fetchGithubText } from './github.transport.js';

export function normalizeGithubRefToRaw(source = {}, ref = '', options = {}) {
  const config = sourceGithubConfig(source, options);
  const host = config.host;
  const target = parseGithubFileRef(config, ref);
  const materializedCommit = exactGithubCommit(options.materializedCommit || config.materializedCommit || config.ref || target.ref);
  const effectiveRef = materializedCommit || target.ref || config.ref;
  if (!effectiveRef) throw githubHostError('github.file.ref-required', 'GitHub raw URL construction requires an exact materialized commit or explicit source/file ref.');
  if (!host.rawBaseUrl) throw githubHostError('github.file.raw-base-unavailable', 'Qualified GitHub-compatible host has no explicit rawBaseUrl; use provider materialization, which falls back to the GitHub Contents API.');
  const [owner, repo] = config.repo.split('/');
  return `${host.rawBaseUrl}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(effectiveRef)}/${encodeRepoPath(target.path)}`;
}

export async function loadGithubFilesForSource(source = {}, fileRefs = [], options = {}) {
  const config = sourceGithubConfig(source, options);
  const resolved = await resolveGithubMaterializedCommit(source, { ...options, ref: config.ref, materializedCommit: config.materializedCommit });
  const refs = (Array.isArray(fileRefs) ? fileRefs : []).map((item, index) => normalizeTarget(item, index));
  const records = [];
  const errors = [];
  const events = [];
  let requests = Number(resolved.requests || 0);

  for (const target of refs) {
    try {
      const parsed = parseGithubFileRef({ ...config, ref: resolved.ref, materializedCommit: resolved.materializedCommit }, target.ref);
      if (parsed.ref && parsed.ref !== resolved.ref && exactGithubCommit(parsed.ref) !== resolved.materializedCommit) {
        throw githubHostError('github.file.ref-mismatch', 'Absolute GitHub file reference belongs to a different ref than the exact source boundary.');
      }
      const request = githubFileReadRequest(config.host, config.repo, resolved.materializedCommit, parsed.path);
      const loaded = await fetchGithubText(request.url, options, { headers: request.headers });
      requests += 1;
      const sourceTarget = Object.freeze({
        schema: 'tiinex.source.material.target.v1',
        adapterId: GITHUB_PROVIDER_ID,
        repo: config.repo,
        configuredRef: resolved.ref,
        materializedCommit: resolved.materializedCommit,
        sourceArtifactPath: parsed.path,
        inputTarget: target.inputTarget,
        surface: target.surface,
        targetKind: target.targetKind,
        transportTier: request.transportTier,
        loaded: true,
        requestUrl: request.url
      });
      const record = Object.assign(createRecordFromMarkdown(loaded.text, {
        path: parsed.path,
        name: parsed.path.split('/').pop() || parsed.path,
        sourceMode: 'github-source'
      }), {
        source: Object.freeze({
          id: source.id || `${GITHUB_PROVIDER_ID}:${config.repo}`,
          adapterId: GITHUB_PROVIDER_ID,
          sourceKind: source.sourceKind || GITHUB_REPO_SOURCE_KIND,
          sourceMode: 'github-source',
          repo: config.repo,
          configuredRef: resolved.ref,
          materializedCommit: resolved.materializedCommit,
          sourceArtifactPath: parsed.path
        }),
        sourceTarget
      });
      records.push(record);
      events.push(Object.freeze({ code: 'github.file.loaded', ref: target.ref, path: parsed.path, requestUrl: request.url, transportTier: request.transportTier }));
    } catch (error) {
      errors.push(Object.freeze({
        code: String(error?.code || 'github.file.load-failed'),
        ref: String(target.ref || ''),
        surface: target.surface,
        message: String(error?.message || error),
        status: Number(error?.status || 0) || undefined
      }));
      events.push(Object.freeze({ code: String(error?.code || 'github.file.load-failed'), ref: target.ref, error: String(error?.message || error) }));
    }
  }
  return Object.freeze({
    repo: config.repo,
    ref: resolved.ref,
    materializedCommit: resolved.materializedCommit,
    records: Object.freeze(records),
    errors: Object.freeze(errors),
    okCount: records.length,
    failCount: errors.length,
    diagnostics: Object.freeze({ requests, events: Object.freeze(events) })
  });
}

export async function materializeGithubSource(source = {}, input = {}, options = {}) {
  const registered = ensureGithubSource(source, options);
  const config = sourceGithubConfig(registered, options);
  const explicitRefs = normalizeInputRefs(input.fileRefs ?? config.fileRefs ?? []);
  let refs = explicitRefs.map((ref, index) => ({ ref, surface: 'explicitFiles', targetKind: 'explicit-markdown', inputTarget: ref, targetIndex: index }));
  const warnings = [];
  const errors = [];
  let discovery = null;

  if (input.repoDiscovery === true || !refs.length) {
    try {
      discovery = await discoverGithubMarkdownRefs(registered, input, options);
      warnings.push(...discovery.warnings);
      const discoveredTargets = discovery.refs.map((ref, index) => ({ ref, surface: 'repoFiles', targetKind: 'repo-markdown', inputTarget: ref, targetIndex: index }));
      refs = uniqueTargets([...refs, ...discoveredTargets]);
    } catch (error) {
      const issue = Object.freeze({
        code: String(error?.code || 'github.discovery.failed'),
        surface: 'repoFiles',
        message: String(error?.message || error),
        status: Number(error?.status || 0) || undefined
      });
      if (refs.length) warnings.push(issue);
      else errors.push(issue);
    }
  }

  let loaded = { records: [], errors: [], okCount: 0, failCount: 0, ref: config.ref, materializedCommit: config.materializedCommit, diagnostics: { requests: 0, events: [] } };
  if (refs.length) {
    loaded = await loadGithubFilesForSource(registered, refs, {
      ...options,
      ref: discovery?.ref || config.ref,
      materializedCommit: discovery?.materializedCommit || config.materializedCommit
    });
    errors.push(...loaded.errors);
  }

  return makeAdapterResult({
    adapterId: GITHUB_PROVIDER_ID,
    sourceId: registered.id || `${GITHUB_PROVIDER_ID}:${config.repo}`,
    records: loaded.records,
    errors,
    warnings,
    diagnostics: {
      sourceBoundary: 'explicit-github-family-source',
      host: config.host.webBaseUrl,
      repo: config.repo,
      configuredRef: loaded.ref || discovery?.ref || config.ref,
      materializedCommit: loaded.materializedCommit || discovery?.materializedCommit || '',
      requestedCount: refs.length,
      discovery: discovery?.diagnostics || null,
      transport: loaded.diagnostics || null
    }
  });
}

export function parseGithubFileRef(sourceConfig = {}, value = '') {
  const host = qualifyGithubHost(sourceConfig.host);
  const repo = normalizeGithubRepository(sourceConfig.repo || sourceConfig.repository || '', host);
  const raw = String(value || '').trim();
  if (!raw) throw githubHostError('github.file.ref-required', 'GitHub file reference is required.');
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) return Object.freeze({ path: normalizeGithubRepoPath(raw), ref: '', inputTarget: raw });

  let url;
  try { url = new URL(raw); } catch { throw githubHostError('github.file.url-invalid', `Invalid GitHub file URL: ${raw}`); }
  if (url.protocol !== 'https:') throw githubHostError('github.file.https-required', 'GitHub file URLs must use HTTPS.');
  const [expectedOwner, expectedRepo] = repo.split('/');
  const webHost = new URL(host.webBaseUrl);
  const rawHost = host.rawBaseUrl ? new URL(host.rawBaseUrl) : null;

  if (url.hostname.toLowerCase() === webHost.hostname.toLowerCase()) {
    const basePath = webHost.pathname.replace(/\/+$/, '');
    let pathname = url.pathname;
    if (basePath && basePath !== '/') {
      if (!pathname.startsWith(basePath + '/')) throw githubHostError('github.file.host-path-mismatch', 'GitHub file URL is outside the qualified host web base path.');
      pathname = pathname.slice(basePath.length);
    }
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 5 || parts[2] !== 'blob') throw githubHostError('github.file.unsupported-web-url', 'GitHub web file URLs must use the exact /owner/repo/blob/ref/path form.');
    if (parts[0].toLowerCase() !== expectedOwner.toLowerCase() || parts[1].toLowerCase() !== expectedRepo.toLowerCase()) throw githubHostError('github.file.cross-repo', 'Cross-repository GitHub file URLs are not allowed for this source.');
    return Object.freeze({ path: normalizeGithubRepoPath(parts.slice(4).map(decodeURIComponent).join('/')), ref: decodeURIComponent(parts[3]), inputTarget: raw });
  }

  if (rawHost && url.hostname.toLowerCase() === rawHost.hostname.toLowerCase()) {
    const basePath = rawHost.pathname.replace(/\/+$/, '');
    let pathname = url.pathname;
    if (basePath && basePath !== '/') {
      if (!pathname.startsWith(basePath + '/')) throw githubHostError('github.file.host-path-mismatch', 'GitHub raw file URL is outside the configured raw base path.');
      pathname = pathname.slice(basePath.length);
    }
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 4) throw githubHostError('github.file.raw-url-invalid', 'GitHub raw file URL is incomplete.');
    if (parts[0].toLowerCase() !== expectedOwner.toLowerCase() || parts[1].toLowerCase() !== expectedRepo.toLowerCase()) throw githubHostError('github.file.cross-repo', 'Cross-repository GitHub raw URLs are not allowed for this source.');
    return Object.freeze({ path: normalizeGithubRepoPath(parts.slice(3).map(decodeURIComponent).join('/')), ref: decodeURIComponent(parts[2]), inputTarget: raw });
  }

  throw githubHostError('github.file.host-mismatch', 'Absolute file URL does not belong to the explicitly qualified GitHub-family host.');
}

function githubFileReadRequest(host, repo, commit, repoPath) {
  const [owner, name] = repo.split('/');
  if (host.rawBaseUrl) {
    return Object.freeze({
      url: `${host.rawBaseUrl}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${encodeURIComponent(commit)}/${encodeRepoPath(repoPath)}`,
      headers: {},
      transportTier: host.builtin ? 'github-raw' : 'github-compatible-explicit-raw'
    });
  }
  return Object.freeze({
    url: `${host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${encodeRepoPath(repoPath)}?ref=${encodeURIComponent(commit)}`,
    headers: { accept: 'application/vnd.github.raw+json' },
    transportTier: 'github-compatible-api-contents'
  });
}

function ensureGithubSource(source, options) {
  if (source?.schema === 'tiinex.source.registration.v1') {
    sourceGithubConfig(source, options);
    return source;
  }
  return registerGithubSource(source, options);
}

function normalizeTarget(item, index) {
  if (item && typeof item === 'object') return {
    ref: String(item.ref || item.path || item.url || '').trim(),
    surface: String(item.surface || 'explicitFiles'),
    targetKind: String(item.targetKind || 'github-markdown'),
    inputTarget: String(item.inputTarget || item.ref || item.path || item.url || '').trim(),
    targetIndex: Number.isFinite(Number(item.targetIndex)) ? Number(item.targetIndex) : index
  };
  const ref = String(item || '').trim();
  return { ref, surface: 'explicitFiles', targetKind: 'github-markdown', inputTarget: ref, targetIndex: index };
}

function normalizeInputRefs(value) {
  const list = Array.isArray(value) ? value : (String(value || '').trim() ? [value] : []);
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))];
}

function uniqueTargets(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = String(item.ref || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function encodeRepoPath(repoPath) {
  return normalizeGithubRepoPath(repoPath).split('/').map(encodeURIComponent).join('/');
}
