export const GITHUB_DOT_COM_HOST = Object.freeze({
  providerFamily: 'github',
  githubCompatible: true,
  builtin: true,
  webBaseUrl: 'https://github.com',
  apiBaseUrl: 'https://api.github.com',
  rawBaseUrl: 'https://raw.githubusercontent.com'
});

export function qualifyGithubHost(value = undefined) {
  if (value === undefined || value === null || value === '' || value === 'github.com' || value === 'https://github.com') return GITHUB_DOT_COM_HOST;
  if (typeof value === 'string') {
    const normalized = normalizeBaseUrl(value, 'github.host.invalid');
    if (new URL(normalized).hostname.toLowerCase() === 'github.com') return GITHUB_DOT_COM_HOST;
    throw githubHostError('github.host.compatibility-explicit-required', 'Non-github.com hosts require explicit { githubCompatible: true, webBaseUrl, apiBaseUrl } configuration.');
  }
  if (!value || typeof value !== 'object') throw githubHostError('github.host.invalid', 'GitHub host configuration must be an object or github.com.');

  const webBaseUrl = normalizeBaseUrl(value.webBaseUrl || value.webUrl || value.host || '', 'github.host.web-base-required');
  const webHostname = new URL(webBaseUrl).hostname.toLowerCase();
  const builtin = webHostname === 'github.com';
  if (!builtin && value.githubCompatible !== true) {
    throw githubHostError('github.host.compatibility-explicit-required', 'A custom host is not classified as GitHub-compatible unless githubCompatible is explicitly true.');
  }
  if (builtin && !value.apiBaseUrl && !value.apiUrl && !value.rawBaseUrl && !value.rawUrl) return GITHUB_DOT_COM_HOST;
  const apiBaseUrl = normalizeBaseUrl(value.apiBaseUrl || value.apiUrl || (builtin ? GITHUB_DOT_COM_HOST.apiBaseUrl : ''), 'github.host.api-base-required');
  const rawValue = value.rawBaseUrl || value.rawUrl || (builtin ? GITHUB_DOT_COM_HOST.rawBaseUrl : '');
  const rawBaseUrl = rawValue ? normalizeBaseUrl(rawValue, 'github.host.raw-base-invalid') : '';
  return Object.freeze({
    providerFamily: 'github',
    githubCompatible: true,
    builtin,
    webBaseUrl,
    apiBaseUrl,
    rawBaseUrl
  });
}

export function sameGithubHost(a, b) {
  const left = qualifyGithubHost(a);
  const right = qualifyGithubHost(b);
  return left.webBaseUrl.toLowerCase() === right.webBaseUrl.toLowerCase()
    && left.apiBaseUrl.toLowerCase() === right.apiBaseUrl.toLowerCase();
}

export function githubHostError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function normalizeBaseUrl(value, code) {
  const raw = String(value || '').trim();
  if (!raw) throw githubHostError(code, 'GitHub-compatible host configuration requires an explicit HTTPS base URL.');
  let url;
  try { url = new URL(raw.includes('://') ? raw : `https://${raw}`); }
  catch { throw githubHostError(code, `Invalid GitHub host URL: ${raw}`); }
  if (url.protocol !== 'https:') throw githubHostError(code, 'GitHub host base URLs must use HTTPS.');
  if (url.username || url.password || url.search || url.hash) throw githubHostError(code, 'GitHub host base URLs cannot contain credentials, query strings, or fragments.');
  const pathname = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${pathname}`;
}
