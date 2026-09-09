import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export function deriveTiinexCommitLines(entries = []) {
  return [...entries]
    .filter((entry) => isTiinexArtifactPath(entry.path))
    .sort((a, b) => String(a.path).localeCompare(String(b.path)))
    .map((entry) => deriveTiinexCommitLine(entry.path, entry.markdown));
}

export function deriveTiinexCommitLine(filePath = '', markdown = '') {
  const normalizedPath = normalizePath(filePath);
  const filename = normalizedPath.split('/').pop() || '';
  const dimension = String(filename.match(/^(\d{3}(?:-\d+)*)-/)?.[1] || '000');
  const schemaLine = String(markdown || '').split(/\r?\n/).find((line) => /Current Schema\s*:/i.test(line)) || '';
  const schemaId = String(schemaLine.match(/tiinex\.([a-z0-9._-]+)\.v\d+/i)?.[1] || 'artifact').toLowerCase();
  const type = schemaId.split('.').filter(Boolean).pop() || 'artifact';
  const why = field(markdown, 'Why') || field(markdown, 'Summary') || `update ${type}`;
  const directory = normalizedPath.split('/').slice(0, -1).join('/') || '.topics';
  return `${directory}/${dimension} [${type}] ${why}`;
}

export function isTiinexArtifactPath(filePath = '') {
  const normalized = normalizePath(filePath);
  return normalized.startsWith('.topics/') && /\.md$/i.test(normalized);
}

function stagedTiinexEntries() {
  const listed = runGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']);
  const paths = listed.stdout.toString('utf8').split('\0').filter(Boolean).filter(isTiinexArtifactPath).sort();
  return paths.map((filePath) => {
    const shown = runGit(['show', `:${filePath}`], { encoding: null });
    return Object.freeze({ path: filePath, markdown: shown.stdout.toString('utf8') });
  });
}

function runGit(args, options = {}) {
  const result = spawnSync('git', args, { cwd: process.cwd(), encoding: options.encoding === null ? null : 'buffer', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : String(result.stderr || '');
    throw new Error(`git ${args.join(' ')} failed${stderr.trim() ? `: ${stderr.trim()}` : ''}`);
  }
  return result;
}

function field(markdown = '', name = '') {
  const match = String(markdown || '').match(new RegExp(`^[ \t]*-[ \t]+${escapeRe(name)}:[ \t]*(.*?)[ \t]*$`, 'mi'));
  return String(match?.[1] || '').trim().replace(/\s+/g, ' ');
}

function normalizePath(value = '') { return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, ''); }
function escapeRe(value = '') { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function main() {
  const lines = deriveTiinexCommitLines(stagedTiinexEntries());
  if (!lines.length) {
    console.error('No staged Tiinex Markdown artifacts under .topics/.');
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) main();
