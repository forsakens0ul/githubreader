import type { FileTreeItem, GitHubRepoRef, MirrorSource } from '../types';
import { db } from '../db';
import { decodeTextBuffer } from '../lib/book-parser';
import { parseDocumentBuffer } from './documentParser';

export class GitHubApiError extends Error {
  status?: number;
  isRateLimit?: boolean;
  constructor(message: string, status?: number, isRateLimit = false) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.isRateLimit = isRateLimit;
  }
}

/**
 * Parses user input into GitHub repository information.
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch/sub/path
 * - https://github.com/owner/repo/blob/branch/file.txt
 * - github.com/owner/repo
 * - owner/repo
 */
export function parseGitHubUrl(input: string): GitHubRepoRef {
  const cleanInput = input.trim();
  if (!cleanInput) {
    throw new Error('请输入 GitHub 仓库地址');
  }

  let pathname = cleanInput;
  if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
    try {
      const url = new URL(cleanInput);
      if (!url.hostname.includes('github.com')) {
        throw new Error('仅支持 github.com 仓库地址');
      }
      pathname = url.pathname;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('github.com')) {
        throw err;
      }
      throw new Error('无效的 URL 格式');
    }
  } else if (cleanInput.startsWith('github.com/')) {
    pathname = cleanInput.replace(/^github\.com\//, '/');
  } else {
    // maybe owner/repo or owner/repo/tree/...
    pathname = cleanInput.startsWith('/') ? cleanInput : `/${cleanInput}`;
  }

  // Remove leading/trailing slashes
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts.length < 2) {
    throw new Error('GitHub 地址格式需包含 owner 和 repo，例如: forsakens0ul/githubreader');
  }

  const owner = parts[0];
  const repo = parts[1];

  let branch: string | undefined = undefined;
  let subPath: string | undefined = undefined;

  // Check if it contains /tree/{branch} or /blob/{branch}
  if (parts.length >= 4 && (parts[2] === 'tree' || parts[2] === 'blob')) {
    branch = parts[3];
    if (parts.length > 4) {
      subPath = parts.slice(4).join('/');
    }
  }

  return { owner, repo, branch, subPath };
}

/**
 * Fetch basic metadata for a repository.
 */
export async function fetchRepoMetadata(
  owner: string,
  repo: string,
  token?: string
): Promise<{ defaultBranch: string; description: string; stars: number; title: string }> {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitReader-App',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    throw new GitHubApiError(`网络请求失败，请检查网络连接: ${(err as Error).message}`);
  }

  if (res.status === 403 || res.status === 429) {
    const data = await res.json().catch(() => ({}));
    const msg = data.message || '';
    if (msg.includes('rate limit')) {
      throw new GitHubApiError(
        'GitHub API 请求频率达到未认证上限（60次/小时）。您可以在设置中配置个人 GitHub Token，或稍后重试。',
        res.status,
        true
      );
    }
    throw new GitHubApiError(`GitHub API 访问受限: ${msg || res.statusText}`, res.status);
  }

  if (res.status === 404) {
    throw new GitHubApiError(`找不到仓库 ${owner}/${repo}，请确认仓库存在且为公开仓库。`, 404);
  }

  if (!res.ok) {
    throw new GitHubApiError(`获取仓库信息失败 (${res.status}): ${res.statusText}`, res.status);
  }

  const data = await res.json();
  return {
    defaultBranch: data.default_branch || 'main',
    description: data.description || '',
    stars: data.stargazers_count || 0,
    title: data.name || repo,
  };
}

/**
 * Fetch recursive file tree using GitHub git trees API.
 */
export async function fetchRepoFileTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<FileTreeItem[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitReader-App',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    throw new GitHubApiError(`获取文件树网络失败: ${(err as Error).message}`);
  }

  if (res.status === 403 || res.status === 429) {
    throw new GitHubApiError(
      'GitHub API 速率限制。建议稍后再试或在阅读设置中配置访问凭证。',
      res.status,
      true
    );
  }

  if (!res.ok) {
    throw new GitHubApiError(`获取文件列表失败 (${res.status}): ${res.statusText}`, res.status);
  }

  const data = await res.json();
  if (!Array.isArray(data.tree)) {
    return [];
  }

  return data.tree.map((item: { path: string; type: string; size?: number; sha?: string }) => ({
    path: item.path,
    type: item.type === 'tree' ? 'tree' : 'blob',
    size: item.size,
    sha: item.sha,
  }));
}

/**
 * Build mirror URLs for a file.
 */
export function getRawFileUrls(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): { raw: string; ghproxy: string; ghproxy2: string; jsdelivr: string } {
  const encodedPath = filePath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodedPath}`;

  return {
    raw: rawUrl,
    ghproxy: `https://ghproxy.net/${rawUrl}`,
    ghproxy2: `https://gh-proxy.com/${rawUrl}`,
    jsdelivr: `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${encodedPath}`,
  };
}

/**
 * Fetch text content of a file with automatic mirror fallback and IndexedDB caching.
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  options: {
    mirrorSource?: MirrorSource;
    forceRefresh?: boolean;
    token?: string;
  } = {}
): Promise<string> {
  const cacheKey = `${owner}/${repo}/${branch}/${filePath}`;

  // 1. Check local Dexie cache
  if (!options.forceRefresh) {
    try {
      const cached = await db.cachedFiles.get(cacheKey);
      if (cached && cached.content) {
        return cached.content;
      }
    } catch {
      // ignore cache read error
    }
  }

  const isLargeDoc = /\.(pdf|epub|docx)$/i.test(filePath);
  const timeoutMs = isLargeDoc ? 180000 : 35000; // 3 minutes for large docs, 35s for text

  const urls = getRawFileUrls(owner, repo, branch, filePath);
  const mirrorOrder: string[] = [];

  const source = options.mirrorSource || 'auto';
  if (source === 'raw') {
    mirrorOrder.push(urls.raw, urls.ghproxy, urls.ghproxy2);
  } else if (source === 'jsdelivr') {
    if (!isLargeDoc) mirrorOrder.push(urls.jsdelivr);
    mirrorOrder.push(urls.ghproxy, urls.ghproxy2, urls.raw);
  } else {
    // auto:
    // Try fast CORS proxies that support > 20MB files first in China/general network,
    // then direct raw, then jsDelivr (for files under 20MB)
    mirrorOrder.push(urls.ghproxy, urls.ghproxy2, urls.raw);
    if (!isLargeDoc) {
      mirrorOrder.push(urls.jsdelivr);
    }
  }

  let lastError: Error | null = null;

  for (const url of mirrorOrder) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        const text = await parseDocumentBuffer(buffer, filePath);
        // Cache to IndexedDB asynchronously
        db.cachedFiles.put({
          key: cacheKey,
          content: text,
          size: text.length,
          cachedAt: Date.now(),
        }).catch((err) => console.warn('Failed to cache file in DB:', err));

        return text;
      } else {
        lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      lastError = err as Error;
    }
  }

  // Fallback to GitHub API getContent if raw endpoints fail
  try {
    const apiHeaders: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'GitReader-App',
    };
    if (options.token) {
      apiHeaders['Authorization'] = `Bearer ${options.token}`;
    }
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
    const apiRes = await fetch(apiUrl, { headers: apiHeaders });
    if (apiRes.ok) {
      const data = await apiRes.json().catch(() => null);
      if (data && data.download_url) {
        const proxyUrl = `https://ghproxy.net/${data.download_url}`;
        const directRes = await fetch(proxyUrl);
        if (directRes.ok) {
          const apiBuffer = await directRes.arrayBuffer();
          const text = await parseDocumentBuffer(apiBuffer, filePath);
          db.cachedFiles.put({
            key: cacheKey,
            content: text,
            size: text.length,
            cachedAt: Date.now(),
          }).catch(() => {});
          return text;
        }
      }
    }
  } catch {
    // ignore
  }

  throw new Error(
    `无法获取文件内容: ${filePath}。${lastError ? `(${lastError.message})` : '请检查网络连接或源文件是否存在。'}`
  );
}
