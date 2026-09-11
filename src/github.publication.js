import { buildPublicationResult } from '@tiinex/core/publication/publication.contract.js';
import { sha256Hex, utf8Bytes } from '@tiinex/core/export/package.bytes.js';
import { qualifyGithubHost, githubHostError } from './github.host.js';
import { normalizeGithubRepoPath, normalizeGithubRepository } from './github.source.js';
import { fetchGithubJson, fetchGithubText } from './github.transport.js';

export const GITHUB_REPO_FILE_TARGET_KIND = 'github.repo.file';
export const GITHUB_ISSUE_BODY_TARGET_KIND = 'github.issue.body';
export const GITHUB_ISSUE_COMMENT_TARGET_KIND = 'github.issue.comment';

export function authorizeGithubPublication(plan = {}, input = {}) {
  const planId = String(plan?.planId || '').trim();
  const payloadSha256 = String(plan?.outboundPayload?.sha256 || '').trim();
  if (plan?.status !== 'ready' || !planId || !payloadSha256) throw githubHostError('github.publication.plan-not-ready', 'GitHub publication requires one ready shared publication plan.');
  if (input.authorized !== true || String(input.planId || '') !== planId || String(input.payloadSha256 || '') !== payloadSha256) {
    throw githubHostError('github.publication.authorization-required', 'Remote mutation is fail-closed: authorization must explicitly bind the ready planId and exact outbound payload SHA-256.');
  }
  return Object.freeze({
    schema: 'tiinex.github.publication.authorization.v1',
    authorized: true,
    planId,
    payloadSha256,
    boundary: 'Explicit caller authorization for this exact shared publication plan and payload only.'
  });
}

export async function executeGithubPublication(plan = {}, options = {}) {
  const host = qualifyGithubHost(options.host);
  authorizeGithubPublication(plan, options.authorization || {});
  if (String(plan?.destination?.provider || '').toLowerCase() !== 'github') throw githubHostError('github.publication.provider-mismatch', 'Publication plan destination provider must be github.');
  const repo = normalizeGithubRepository(plan.destination?.repository || '', host);
  const targetKind = String(plan.destination?.targetKind || '').trim().toLowerCase();
  if (!host.builtin && [GITHUB_ISSUE_BODY_TARGET_KIND, GITHUB_ISSUE_COMMENT_TARGET_KIND].includes(targetKind)) {
    throw githubHostError('github.publication.custom-social-contract-unavailable', 'Custom GitHub-compatible social mutation is blocked before write until the shared neutral publication contract can qualify custom-host social targets.');
  }
  if (targetKind === GITHUB_REPO_FILE_TARGET_KIND) return executeRepoFile(plan, repo, host, options);
  if (targetKind === GITHUB_ISSUE_BODY_TARGET_KIND) return executeIssueBody(plan, repo, host, options);
  if (targetKind === GITHUB_ISSUE_COMMENT_TARGET_KIND) return executeIssueComment(plan, repo, host, options);
  throw githubHostError('github.publication.target-kind-unsupported', `Unsupported GitHub publication target kind: ${targetKind || '(missing)'}`);
}

export async function verifyGithubPublication(plan = {}, exactTarget = {}, options = {}) {
  const host = qualifyGithubHost(options.host);
  const repo = normalizeGithubRepository(plan?.destination?.repository || exactTarget.repo || exactTarget.repository || '', host);
  const targetKind = String(plan?.destination?.targetKind || exactTarget.targetKind || '').toLowerCase();
  if (targetKind === GITHUB_REPO_FILE_TARGET_KIND) {
    const commit = exactCommit(exactTarget.materializedCommit || exactTarget.commit || '');
    const repoPath = normalizeGithubRepoPath(exactTarget.path || plan.destination?.path || '');
    if (!commit) throw githubHostError('github.publication.verify.commit-required', 'Repo-file verification requires an exact materialized commit.');
    const observed = await readRepoFile(repo, repoPath, commit, host, options);
    return publicationResultFromObservation(plan, {
      targetKind,
      repo,
      path: repoPath,
      configuredRef: String(plan.destination?.ref || ''),
      materializedCommit: commit,
      inputTarget: `${host.webBaseUrl}/${repo}/blob/${commit}/${repoPath}`,
      content: observed.content,
      providerReceiptId: exactTarget.providerReceiptId || commit,
      observedAt: nowIso(options.clock),
      method: 'github-api-exact-repo-file-read-after-write'
    });
  }
  if (targetKind === GITHUB_ISSUE_BODY_TARGET_KIND || targetKind === GITHUB_ISSUE_COMMENT_TARGET_KIND) {
    const parsed = qualifyGithubSocialTarget(exactTarget.inputTarget || exactTarget.externalTarget || '', host);
    if (!parsed.ok || parsed.targetKind !== targetKind || parsed.repository.toLowerCase() !== repo.toLowerCase()) throw githubHostError('github.publication.verify.social-target-invalid', 'Social publication verification requires the exact qualified GitHub issue/comment target.');
    const observed = await readSocialTarget(parsed, host, options);
    return publicationResultFromObservation(plan, {
      targetKind,
      repo,
      inputTarget: parsed.inputTarget,
      content: observed.content,
      providerReceiptId: observed.providerReceiptId,
      observedAt: observed.observedAt || nowIso(options.clock),
      method: observed.method
    });
  }
  throw githubHostError('github.publication.target-kind-unsupported', `Unsupported GitHub publication target kind: ${targetKind || '(missing)'}`);
}

export function qualifyGithubSocialTarget(value = '', hostInput = undefined) {
  const host = qualifyGithubHost(hostInput);
  const raw = String(value || '').trim();
  if (!raw) return Object.freeze({ ok: false, input: raw, error: 'github.social-target.required' });
  let url;
  try { url = new URL(raw); } catch { return Object.freeze({ ok: false, input: raw, error: 'github.social-target.invalid-url' }); }
  const web = new URL(host.webBaseUrl);
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== web.hostname.toLowerCase()) return Object.freeze({ ok: false, input: raw, error: 'github.social-target.host-mismatch' });
  let pathname = url.pathname;
  const basePath = web.pathname.replace(/\/+$/, '');
  if (basePath && basePath !== '/') {
    if (!pathname.startsWith(basePath + '/')) return Object.freeze({ ok: false, input: raw, error: 'github.social-target.host-path-mismatch' });
    pathname = pathname.slice(basePath.length);
  }
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 4 || parts[2] !== 'issues' || !/^[1-9]\d*$/.test(parts[3])) return Object.freeze({ ok: false, input: raw, error: 'github.social-target.unsupported' });
  const repository = normalizeGithubRepository(`${parts[0]}/${parts[1]}`, host);
  const issueNumber = parts[3];
  const commentMatch = String(url.hash || '').match(/^#issuecomment-(\d+)$/);
  if (url.hash && !commentMatch) return Object.freeze({ ok: false, input: raw, error: 'github.social-target.unsupported-fragment' });
  const issueTarget = `${host.webBaseUrl}/${repository}/issues/${issueNumber}`;
  const commentId = commentMatch?.[1] || '';
  return Object.freeze({
    ok: true,
    provider: 'github',
    repository,
    owner: parts[0],
    repo: parts[1],
    issueNumber,
    number: Number(issueNumber),
    commentId,
    targetKind: commentId ? GITHUB_ISSUE_COMMENT_TARGET_KIND : GITHUB_ISSUE_BODY_TARGET_KIND,
    issueTarget,
    inputTarget: commentId ? `${issueTarget}#issuecomment-${commentId}` : issueTarget
  });
}

async function executeRepoFile(plan, repo, host, options) {
  const mutationPolicy = String(plan.mutationPolicy || '');
  if (!['create-new', 'update-known'].includes(mutationPolicy)) throw githubHostError('github.publication.repo-file.mutation-policy-unsupported', 'Repo-file mutation requires explicit create-new or update-known policy.');
  const ref = String(plan.destination?.ref || '').trim();
  if (!ref) throw githubHostError('github.publication.repo-file.ref-required', 'Repo-file publication requires an explicit destination ref.');
  const repoPath = normalizeGithubRepoPath(plan.destination?.path || '');
  const commitMessage = String(options.commitMessage || '').trim();
  if (!commitMessage) throw githubHostError('github.publication.commit-message-required', 'Repo-file publication requires an explicit commit message.');
  const [owner, name] = repo.split('/');
  const contentUrl = `${host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${encodeRepoPath(repoPath)}?ref=${encodeURIComponent(ref)}`;
  let current = null;
  try { current = await fetchGithubJson(contentUrl, options); }
  catch (error) {
    if (Number(error?.status || 0) !== 404) throw error;
  }
  if (mutationPolicy === 'create-new' && current) throw githubHostError('github.publication.create-target-exists', 'create-new policy refuses to overwrite an existing GitHub repo file.');
  if (mutationPolicy === 'update-known' && !current?.sha) throw githubHostError('github.publication.update-target-missing', 'update-known policy requires an existing GitHub repo file with an exact blob SHA.');

  const payload = {
    message: commitMessage,
    content: base64Utf8(String(plan.outboundPayload?.content || '')),
    branch: ref,
    ...(mutationPolicy === 'update-known' ? { sha: String(current.sha) } : {})
  };
  const writeUrl = `${host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${encodeRepoPath(repoPath)}`;
  const write = await fetchGithubJson(writeUrl, options, { method: 'PUT', body: JSON.stringify(payload), headers: { 'content-type': 'application/json' } });
  const commit = exactCommit(write?.commit?.sha);
  if (!commit) throw githubHostError('github.publication.commit-response-missing', 'GitHub repo-file write did not return an exact commit SHA.');
  return verifyGithubPublication(plan, {
    targetKind: GITHUB_REPO_FILE_TARGET_KIND,
    repo,
    path: repoPath,
    materializedCommit: commit,
    providerReceiptId: String(write?.content?.sha || write?.commit?.sha || '')
  }, { ...options, host });
}

async function executeIssueBody(plan, repo, host, options) {
  const mutationPolicy = String(plan.mutationPolicy || '');
  const [owner, name] = repo.split('/');
  let write;
  let target;
  if (mutationPolicy === 'create-new') {
    const title = String(options.issueTitle || '').trim();
    if (!title) throw githubHostError('github.publication.issue-title-required', 'Creating a GitHub issue requires an explicit issue title.');
    const url = `${host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues`;
    write = await fetchGithubJson(url, options, { method: 'POST', body: JSON.stringify({ title, body: String(plan.outboundPayload?.content || '') }), headers: { 'content-type': 'application/json' } });
    target = String(write?.html_url || '').trim();
  } else if (mutationPolicy === 'update-known') {
    const parsed = qualifyGithubSocialTarget(plan.destination?.externalTarget || '', host);
    if (!parsed.ok || parsed.targetKind !== GITHUB_ISSUE_BODY_TARGET_KIND || parsed.repository.toLowerCase() !== repo.toLowerCase()) throw githubHostError('github.publication.issue-target-invalid', 'update-known issue publication requires the exact planned issue target.');
    const url = `${host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${encodeURIComponent(parsed.issueNumber)}`;
    write = await fetchGithubJson(url, options, { method: 'PATCH', body: JSON.stringify({ body: String(plan.outboundPayload?.content || '') }), headers: { 'content-type': 'application/json' } });
    target = parsed.inputTarget;
  } else {
    throw githubHostError('github.publication.issue.mutation-policy-unsupported', 'Issue-body mutation requires explicit create-new or update-known policy.');
  }
  const parsedTarget = qualifyGithubSocialTarget(target, host);
  if (!parsedTarget.ok || parsedTarget.targetKind !== GITHUB_ISSUE_BODY_TARGET_KIND) throw githubHostError('github.publication.issue-response-target-invalid', 'GitHub issue write did not return an exact issue target URL.');
  return verifyGithubPublication(plan, { targetKind: GITHUB_ISSUE_BODY_TARGET_KIND, inputTarget: parsedTarget.inputTarget, providerReceiptId: String(write?.id || '') }, { ...options, host });
}

async function executeIssueComment(plan, repo, host, options) {
  const mutationPolicy = String(plan.mutationPolicy || '');
  const [owner, name] = repo.split('/');
  let write;
  let target;
  if (mutationPolicy === 'create-comment') {
    const container = qualifyGithubSocialTarget(plan.destination?.containerTarget || '', host);
    if (!container.ok || container.targetKind !== GITHUB_ISSUE_BODY_TARGET_KIND || container.repository.toLowerCase() !== repo.toLowerCase()) throw githubHostError('github.publication.comment-container-invalid', 'create-comment requires the exact planned parent issue target.');
    const url = `${host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/${encodeURIComponent(container.issueNumber)}/comments`;
    write = await fetchGithubJson(url, options, { method: 'POST', body: JSON.stringify({ body: String(plan.outboundPayload?.content || '') }), headers: { 'content-type': 'application/json' } });
    target = String(write?.html_url || '').trim();
  } else if (mutationPolicy === 'update-known') {
    const parsed = qualifyGithubSocialTarget(plan.destination?.externalTarget || '', host);
    if (!parsed.ok || parsed.targetKind !== GITHUB_ISSUE_COMMENT_TARGET_KIND || parsed.repository.toLowerCase() !== repo.toLowerCase()) throw githubHostError('github.publication.comment-target-invalid', 'update-known comment publication requires the exact planned comment target.');
    const url = `${host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/issues/comments/${encodeURIComponent(parsed.commentId)}`;
    write = await fetchGithubJson(url, options, { method: 'PATCH', body: JSON.stringify({ body: String(plan.outboundPayload?.content || '') }), headers: { 'content-type': 'application/json' } });
    target = parsed.inputTarget;
  } else {
    throw githubHostError('github.publication.comment.mutation-policy-unsupported', 'Issue-comment mutation requires explicit create-comment or update-known policy.');
  }
  const parsedTarget = qualifyGithubSocialTarget(target, host);
  if (!parsedTarget.ok || parsedTarget.targetKind !== GITHUB_ISSUE_COMMENT_TARGET_KIND) throw githubHostError('github.publication.comment-response-target-invalid', 'GitHub comment write did not return an exact comment target URL.');
  return verifyGithubPublication(plan, { targetKind: GITHUB_ISSUE_COMMENT_TARGET_KIND, inputTarget: parsedTarget.inputTarget, providerReceiptId: String(write?.id || '') }, { ...options, host });
}

async function readRepoFile(repo, repoPath, commit, host, options) {
  const [owner, name] = repo.split('/');
  const url = `${host.apiBaseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${encodeRepoPath(repoPath)}?ref=${encodeURIComponent(commit)}`;
  const loaded = await fetchGithubText(url, options, { headers: { accept: 'application/vnd.github.raw+json' } });
  return Object.freeze({ content: loaded.text, url });
}

async function readSocialTarget(parsed, host, options) {
  const url = parsed.targetKind === GITHUB_ISSUE_COMMENT_TARGET_KIND
    ? `${host.apiBaseUrl}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/issues/comments/${encodeURIComponent(parsed.commentId)}`
    : `${host.apiBaseUrl}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/issues/${encodeURIComponent(parsed.issueNumber)}`;
  const body = await fetchGithubJson(url, options);
  return Object.freeze({
    content: String(body?.body || ''),
    providerReceiptId: String(body?.id || parsed.commentId || parsed.issueNumber),
    observedAt: String(body?.updated_at || body?.created_at || ''),
    method: parsed.targetKind === GITHUB_ISSUE_COMMENT_TARGET_KIND ? 'github-api-exact-comment-body-read-after-write' : 'github-api-exact-issue-body-read-after-write'
  });
}

function publicationResultFromObservation(plan, observation) {
  const verifiedPayloadSha256 = sha256Hex(utf8Bytes(observation.content));
  return buildPublicationResult(plan, {
    state: 'success',
    verificationStatus: 'verified',
    verifiedPayloadSha256,
    providerReceiptId: observation.providerReceiptId || '',
    sourceTarget: {
      adapterId: 'github',
      repo: observation.repo || '',
      configuredRef: observation.configuredRef || '',
      materializedCommit: observation.materializedCommit || '',
      path: observation.path || '',
      targetKind: observation.targetKind,
      inputTarget: observation.inputTarget || '',
      providerReceiptId: observation.providerReceiptId || ''
    },
    verification: {
      status: 'verified',
      method: observation.method,
      observedAt: observation.observedAt || '',
      note: 'Exact GitHub provider read-after-write observation.'
    }
  });
}

function encodeRepoPath(value) {
  return normalizeGithubRepoPath(value).split('/').map(encodeURIComponent).join('/');
}

function exactCommit(value = '') {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{40}$/i.test(clean) ? clean.toLowerCase() : '';
}

function base64Utf8(value = '') {
  const bytes = utf8Bytes(value);
  if (typeof btoa === 'function') {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const word = (a << 16) | (b << 8) | c;
    out += alphabet[(word >>> 18) & 63];
    out += alphabet[(word >>> 12) & 63];
    out += i + 1 < bytes.length ? alphabet[(word >>> 6) & 63] : '=';
    out += i + 2 < bytes.length ? alphabet[word & 63] : '=';
  }
  return out;
}

function nowIso(clock) { return typeof clock === 'function' ? new Date(clock()).toISOString() : new Date().toISOString(); }
