import { githubHostError } from './github.host.js';

export function githubFetchImpl(options = {}) {
  const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!fetchImpl) throw githubHostError('github.fetch.unavailable', 'GitHub provider requires an injected fetch implementation or a host with global fetch.');
  return fetchImpl;
}

export function githubRequestHeaders(options = {}, extra = {}) {
  const headers = new Headers(options.headers || {});
  if (options.token && !headers.has('authorization')) headers.set('authorization', `Bearer ${String(options.token)}`);
  if (!headers.has('accept')) headers.set('accept', 'application/vnd.github+json');
  for (const [key, value] of Object.entries(extra || {})) if (value !== undefined && value !== null) headers.set(key, String(value));
  return headers;
}

export async function fetchGithubJson(url, options = {}, request = {}) {
  const fetchImpl = githubFetchImpl(options);
  let response;
  try {
    response = await fetchImpl(url, {
      ...request,
      headers: githubRequestHeaders(options, request.headers || {})
    });
  } catch (cause) {
    throw githubHttpError('github.fetch.failed', `GitHub request failed: ${url}`, { url, cause });
  }
  if (!response?.ok) {
    const detail = await responseTextSafe(response);
    throw githubHttpError('github.http.error', `GitHub request returned ${response?.status || 'ERR'} for ${url}${detail ? `: ${detail.slice(0, 240)}` : ''}`, {
      url,
      status: Number(response?.status || 0),
      statusText: String(response?.statusText || ''),
      response
    });
  }
  try { return await response.json(); }
  catch (cause) { throw githubHttpError('github.response.invalid-json', `GitHub response was not valid JSON: ${url}`, { url, cause, response }); }
}

export async function fetchGithubText(url, options = {}, request = {}) {
  const fetchImpl = githubFetchImpl(options);
  let response;
  try {
    response = await fetchImpl(url, {
      ...request,
      headers: githubRequestHeaders(options, request.headers || {})
    });
  } catch (cause) {
    throw githubHttpError('github.fetch.failed', `GitHub request failed: ${url}`, { url, cause });
  }
  if (!response?.ok) {
    const detail = await responseTextSafe(response);
    throw githubHttpError('github.http.error', `GitHub request returned ${response?.status || 'ERR'} for ${url}${detail ? `: ${detail.slice(0, 240)}` : ''}`, {
      url,
      status: Number(response?.status || 0),
      statusText: String(response?.statusText || ''),
      response
    });
  }
  return Object.freeze({
    text: await response.text(),
    response
  });
}

export function githubHttpError(code, message, extra = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, extra);
  return error;
}

async function responseTextSafe(response) {
  if (!response || typeof response.text !== 'function') return '';
  try { return String(await response.text()); } catch { return ''; }
}
