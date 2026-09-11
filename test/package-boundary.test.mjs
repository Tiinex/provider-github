import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('package and release policy bind the provider-github repository identity and public provider surface', async () => {
  const pkg=JSON.parse(await readFile(new URL('../package.json', import.meta.url),'utf8'));
  const policy=JSON.parse(await readFile(new URL('../.github/release-policy.json', import.meta.url),'utf8'));
  assert.equal(pkg.name,'@tiinex/provider-github');
  assert.equal(pkg.repository.url,'git+https://github.com/Tiinex/provider-github.git');
  assert.equal(policy.repository,'Tiinex/provider-github');
  const publicModule=await import('../src/index.js');
  assert.deepEqual(Object.keys(publicModule).sort(),[
    'GITHUB_DOT_COM_HOST','GITHUB_FILE_SOURCE_KIND','GITHUB_ISSUE_BODY_TARGET_KIND','GITHUB_ISSUE_COMMENT_TARGET_KIND','GITHUB_PROVIDER_ID','GITHUB_REPO_FILE_TARGET_KIND','GITHUB_REPO_SOURCE_KIND',
    'authorizeGithubPublication','createGithubProvider','discoverGithubMarkdownRefs','exactGithubCommit','executeGithubPublication','loadGithubFilesForSource','materializeGithubSource','normalizeGithubRefToRaw','normalizeGithubRepoPath','normalizeGithubRepository','normalizeGithubRootPaths','parseGithubFileRef','qualifyGithubHost','qualifyGithubSocialTarget','registerGithubSource','resolveGithubMaterializedCommit','resolveGithubSourceRef','sameGithubHost','sourceGithubConfig','verifyGithubPublication'
  ].sort());
});
