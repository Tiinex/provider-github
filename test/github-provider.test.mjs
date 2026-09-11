import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  GITHUB_DOT_COM_HOST,
  createGithubProvider,
  discoverGithubMarkdownRefs,
  executeGithubPublication,
  materializeGithubSource,
  normalizeGithubRefToRaw,
  normalizeGithubRepository,
  qualifyGithubHost,
  registerGithubSource
} from '../src/index.js';

const COMMIT = 'a'.repeat(40);
const NEXT_COMMIT = 'b'.repeat(40);

function response(body, { status = 200, statusText = 'OK', text = null } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
    text: async () => text ?? (typeof body === 'string' ? body : JSON.stringify(body))
  };
}

test('GitHub provider exposes the neutral adapter contract', () => {
  const provider = createGithubProvider();
  assert.equal(provider.schema, 'tiinex.adapter.definition.v1');
  assert.equal(provider.id, 'github');
  assert.equal(provider.capabilities.registerSource, true);
  assert.equal(provider.capabilities.discover, true);
  assert.equal(provider.capabilities.materialize, true);
  assert.match(provider.boundary, /GitHub\/GitHub-compatible/);
});

test('host qualification never infers unrelated forges as GitHub-compatible', () => {
  assert.equal(qualifyGithubHost().webBaseUrl, GITHUB_DOT_COM_HOST.webBaseUrl);
  assert.throws(() => qualifyGithubHost('https://gitlab.com'), /explicit/);
  assert.throws(() => qualifyGithubHost({ webBaseUrl: 'https://forge.example', apiBaseUrl: 'https://forge.example/api/v3' }), /explicitly true/);
  const custom = qualifyGithubHost({ githubCompatible: true, webBaseUrl: 'https://ghe.example', apiBaseUrl: 'https://ghe.example/api/v3' });
  assert.equal(custom.builtin, false);
  assert.equal(custom.rawBaseUrl, '');
});

test('repository identity is bounded to the qualified GitHub-family host', () => {
  assert.equal(normalizeGithubRepository('Tiinex/docs'), 'Tiinex/docs');
  assert.equal(normalizeGithubRepository('https://github.com/Tiinex/docs.git'), 'Tiinex/docs');
  assert.throws(() => normalizeGithubRepository('https://gitlab.com/Tiinex/docs'), /does not belong/);
  const custom = { githubCompatible: true, webBaseUrl: 'https://ghe.example', apiBaseUrl: 'https://ghe.example/api/v3' };
  assert.equal(normalizeGithubRepository('https://ghe.example/acme/docs', custom), 'acme/docs');
});

test('GitHub repo discovery resolves default branch to exact commit and returns bounded Markdown refs', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    if (url === 'https://api.github.com/repos/Tiinex/docs') return response({ default_branch: 'main' });
    if (url === 'https://api.github.com/repos/Tiinex/docs/commits/main') return response({ sha: COMMIT });
    if (url === `https://api.github.com/repos/Tiinex/docs/git/trees/${COMMIT}?recursive=1`) return response({ tree: [
      { type: 'blob', path: 'docs/b.md' },
      { type: 'blob', path: 'docs/a.trace.md' },
      { type: 'blob', path: 'docs/nested/c.markdown' },
      { type: 'blob', path: 'docs/skip.txt' },
      { type: 'blob', path: 'other/out.md' }
    ], truncated: false });
    throw new Error(`unexpected url ${url}`);
  };
  const source = registerGithubSource({ repo: 'Tiinex/docs', rootPaths: ['docs'] });
  const discovered = await discoverGithubMarkdownRefs(source, {}, { fetchImpl });
  assert.equal(discovered.ref, 'main');
  assert.equal(discovered.materializedCommit, COMMIT);
  assert.deepEqual(discovered.refs, ['docs/a.trace.md', 'docs/b.md', 'docs/nested/c.markdown']);
  assert.equal(discovered.diagnostics.requestCount, 3);
  assert.equal(seen.length, 3);
});

test('GitHub materialization reads exact-commit raw content and records source identity', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    if (url === 'https://api.github.com/repos/Tiinex/docs/commits/main') return response({ sha: COMMIT });
    if (url === `https://raw.githubusercontent.com/Tiinex/docs/${COMMIT}/README.md`) return response('# Docs\n\nExact content.\n', { text: '# Docs\n\nExact content.\n' });
    throw new Error(`unexpected url ${url}`);
  };
  const source = registerGithubSource({ repo: 'Tiinex/docs', ref: 'main' });
  const result = await materializeGithubSource(source, { fileRefs: ['README.md'] }, { fetchImpl });
  assert.equal(result.state, 'ok');
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].source.repo, 'Tiinex/docs');
  assert.equal(result.records[0].source.materializedCommit, COMMIT);
  assert.equal(result.records[0].source.sourceArtifactPath, 'README.md');
  assert.equal(result.records[0].sourceTarget.transportTier, 'github-raw');
  assert.deepEqual(seen, [
    'https://api.github.com/repos/Tiinex/docs/commits/main',
    `https://raw.githubusercontent.com/Tiinex/docs/${COMMIT}/README.md`
  ]);
});

test('custom GitHub-compatible hosts use explicitly configured API shape, not guessed raw hostnames', async () => {
  const host = { githubCompatible: true, webBaseUrl: 'https://ghe.example', apiBaseUrl: 'https://ghe.example/api/v3' };
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, accept: new Headers(init?.headers || {}).get('accept') });
    if (url === 'https://ghe.example/api/v3/repos/acme/docs/commits/main') return response({ sha: COMMIT });
    if (url === `https://ghe.example/api/v3/repos/acme/docs/contents/README.md?ref=${COMMIT}`) return response('# Enterprise\n', { text: '# Enterprise\n' });
    throw new Error(`unexpected url ${url}`);
  };
  const source = registerGithubSource({ repo: 'acme/docs', ref: 'main', host });
  const result = await materializeGithubSource(source, { fileRefs: ['README.md'] }, { fetchImpl });
  assert.equal(result.state, 'ok');
  assert.equal(result.records[0].sourceTarget.transportTier, 'github-compatible-api-contents');
  assert.equal(seen[1].accept, 'application/vnd.github.raw+json');
  assert.throws(() => normalizeGithubRefToRaw(source, 'README.md', { materializedCommit: COMMIT }), /no explicit rawBaseUrl/);
});

test('absolute GitHub file references reject cross-repository and unrelated-host URLs', () => {
  const source = registerGithubSource({ repo: 'Tiinex/docs', ref: COMMIT });
  assert.equal(normalizeGithubRefToRaw(source, 'README.md'), `https://raw.githubusercontent.com/Tiinex/docs/${COMMIT}/README.md`);
  assert.throws(() => normalizeGithubRefToRaw(source, 'https://github.com/Other/repo/blob/main/README.md'), /Cross-repository/);
  assert.throws(() => normalizeGithubRefToRaw(source, 'https://gitlab.com/Tiinex/docs/-/blob/main/README.md'), /does not belong|host/);
});

test('same-repository absolute file refs cannot silently switch the exact source ref', async () => {
  const fetchImpl = async (url) => {
    if (url === 'https://api.github.com/repos/Tiinex/docs/commits/main') return response({ sha: COMMIT });
    throw new Error(`unexpected url ${url}`);
  };
  const source = registerGithubSource({ repo: 'Tiinex/docs', ref: 'main' });
  const result = await materializeGithubSource(source, { fileRefs: ['https://github.com/Tiinex/docs/blob/other/README.md'] }, { fetchImpl });
  assert.equal(result.state, 'failed');
  assert.equal(result.errors[0].code, 'github.file.ref-mismatch');
});

test('custom-host social publication is blocked before destructive execution until the shared contract can qualify it', async () => {
  const content = '# Issue body\n';
  const sha256 = createHash('sha256').update(Buffer.from(content, 'utf8')).digest('hex');
  const plan = Object.freeze({
    schema: 'tiinex.publication.plan.v1',
    planId: 'publication-plan:custom-social',
    planSha256: 'plan-custom-social',
    status: 'ready',
    findings: Object.freeze([]),
    localInput: Object.freeze({ id: 'local:test', path: 'issue.md' }),
    destination: Object.freeze({ provider: 'github', repository: 'acme/docs', targetKind: 'github.issue.body' }),
    mutationPolicy: 'create-new',
    outboundPayload: Object.freeze({ content, sha256, bytes: Buffer.byteLength(content), mediaType: 'text/markdown' })
  });
  let calls = 0;
  await assert.rejects(() => executeGithubPublication(plan, {
    host: { githubCompatible: true, webBaseUrl: 'https://ghe.example', apiBaseUrl: 'https://ghe.example/api/v3' },
    authorization: { authorized: true, planId: plan.planId, payloadSha256: plan.outboundPayload.sha256 },
    issueTitle: 'Should not execute',
    fetchImpl: async () => { calls += 1; return response({}); }
  }), /blocked before write/);
  assert.equal(calls, 0);
});

test('publication is fail-closed without exact plan-bound authorization', async () => {
  const content = '# Publish\n';
  const plan = publicationPlan(content);
  await assert.rejects(() => executeGithubPublication(plan, { authorization: { authorized: true, planId: plan.planId, payloadSha256: 'wrong' }, commitMessage: 'publish', fetchImpl: async () => response({}) }), /authorization/);
});

test('repo-file publication performs explicit update and exact read-after-write verification', async () => {
  const content = '# Published\n\nExact.\n';
  const plan = publicationPlan(content);
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const method = init.method || 'GET';
    calls.push({ url, method, body: init.body ? JSON.parse(init.body) : null, accept: new Headers(init.headers || {}).get('accept') });
    if (method === 'GET' && url === 'https://api.github.com/repos/Tiinex/docs/contents/README.md?ref=main') return response({ sha: 'blob-before' });
    if (method === 'PUT' && url === 'https://api.github.com/repos/Tiinex/docs/contents/README.md') return response({ commit: { sha: NEXT_COMMIT }, content: { sha: 'blob-after' } });
    if (method === 'GET' && url === `https://api.github.com/repos/Tiinex/docs/contents/README.md?ref=${NEXT_COMMIT}`) return response(content, { text: content });
    throw new Error(`unexpected ${method} ${url}`);
  };
  const result = await executeGithubPublication(plan, {
    authorization: { authorized: true, planId: plan.planId, payloadSha256: plan.outboundPayload.sha256 },
    commitMessage: 'Publish README',
    fetchImpl
  });
  assert.equal(result.status, 'success');
  assert.equal(result.remoteTarget.materializedCommit, NEXT_COMMIT);
  assert.equal(result.remoteTarget.path, 'README.md');
  assert.equal(result.verification.verifiedPayloadSha256, plan.outboundPayload.sha256);
  assert.equal(result.receipt.verifiedPayloadSha256, plan.outboundPayload.sha256);
  assert.equal(calls[1].body.sha, 'blob-before');
  assert.equal(calls[2].accept, 'application/vnd.github.raw+json');
});

function publicationPlan(content) {
  const sha256 = createHash('sha256').update(Buffer.from(content, 'utf8')).digest('hex');
  return Object.freeze({
    schema: 'tiinex.publication.plan.v1',
    planId: 'publication-plan:test',
    planSha256: 'plan-sha-test',
    status: 'ready',
    findings: Object.freeze([]),
    localInput: Object.freeze({ id: 'local:test', path: 'README.md' }),
    destination: Object.freeze({ provider: 'github', repository: 'Tiinex/docs', ref: 'main', path: 'README.md', targetKind: 'github.repo.file' }),
    mutationPolicy: 'update-known',
    outboundPayload: Object.freeze({ content, sha256, bytes: Buffer.byteLength(content), mediaType: 'text/markdown' })
  });
}
