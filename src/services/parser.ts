import type { BookMetadata, Chapter, FileTreeItem, Volume } from '../types';

const READABLE_EXTENSIONS = new Set(['.txt', '.md', '.markdown', '.text']);

/**
 * Checks if a file path is a readable book content file.
 */
export function isReadableFile(path: string): boolean {
  const lower = path.toLowerCase();
  const lastDot = lower.lastIndexOf('.');
  if (lastDot === -1) return false;
  const ext = lower.substring(lastDot);
  return READABLE_EXTENSIONS.has(ext);
}

/**
 * Check if the file is a readme.
 */
export function isReadmeFile(path: string): boolean {
  const fileName = path.split('/').pop()?.toLowerCase() || '';
  return fileName === 'readme.md' || fileName === 'readme.txt' || fileName === 'readme';
}

/**
 * Clean and format title for Crown of Tokamak and general files.
 */
export function formatChapterTitle(fileName: string): { title: string; date?: string } {
  // Strip extension
  let base = fileName.replace(/\.(txt|md|markdown|text)$/i, '');

  // Tokamak format: 2020.04.21如何看待... or 2020-04-21...
  const dateMatch = base.match(/^(\d{4}[.-]\d{2}[.-]\d{2})[-_\s]*(.*)$/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    let rest = dateMatch[2].trim();
    // Replace underscores from sanitized titles
    rest = rest.replace(/_/g, ' ');
    return {
      title: rest || dateStr,
      date: dateStr,
    };
  }

  // Handle number prefixes like 01_chapter or 01.chapter
  const numMatch = base.match(/^(\d+)[._\s-]+(.*)$/);
  if (numMatch) {
    return {
      title: `${numMatch[1]}. ${numMatch[2].replace(/_/g, ' ').trim()}`,
    };
  }

  return { title: base.replace(/_/g, ' ').trim() };
}

/**
 * Build Volume & Chapter structure from file tree.
 */
export function buildBookStructure(
  owner: string,
  repo: string,
  branch: string,
  tree: FileTreeItem[],
  subPath?: string,
  repoMetadata?: { title?: string; description?: string }
): BookMetadata {
  let relevantBlobs = tree.filter((item) => item.type === 'blob');

  if (subPath) {
    const prefix = subPath.endsWith('/') ? subPath : `${subPath}/`;
    relevantBlobs = relevantBlobs.filter((item) => item.path.startsWith(prefix));
  }

  // Filter out scripts and binary files
  relevantBlobs = relevantBlobs.filter((item) => {
    const lower = item.path.toLowerCase();
    const fileName = lower.split('/').pop() || '';
    // Exclude merged_all.txt to avoid duplicate huge blocks
    if (fileName === 'merged_all.txt') return false;
    // Exclude hidden files / folders
    if (fileName.startsWith('.') || item.path.includes('/.')) return false;
    return isReadableFile(item.path);
  });

  // Find Readme file for preface
  let readmePath: string | undefined;
  for (const item of relevantBlobs) {
    if (isReadmeFile(item.path)) {
      readmePath = item.path;
      break;
    }
  }

  // Group files by directory or volume
  const volumeMap = new Map<string, { name: string; files: { path: string; size?: number }[] }>();

  // If readme exists, create a Preface volume
  if (readmePath) {
    volumeMap.set('__preface__', {
      name: '序言与说明',
      files: [{ path: readmePath }],
    });
  }

  for (const item of relevantBlobs) {
    if (item.path === readmePath) continue;

    const parts = item.path.split('/');
    let volumeKey = '主要章节';
    let volumeName = '主要章节';

    if (parts.length > 1) {
      // Subdirectory exists
      const dirName = parts[0];
      volumeKey = dirName;

      // Special friendly volume naming for Crown_of_Tokamak and other repos
      if (/^\d{4}$/.test(dirName)) {
        volumeName = `${dirName} 年回答整理`;
      } else if (dirName === '未知时间') {
        volumeName = '未知时间收录';
      } else if (dirName === '聊天记录') {
        volumeName = '群聊聊天记录';
      } else {
        volumeName = dirName;
      }
    }

    if (!volumeMap.has(volumeKey)) {
      volumeMap.set(volumeKey, { name: volumeName, files: [] });
    }
    volumeMap.get(volumeKey)!.files.push({ path: item.path, size: item.size });
  }

  // Sort volumes
  const sortedVolumeKeys = Array.from(volumeMap.keys()).sort((a, b) => {
    if (a === '__preface__') return -1;
    if (b === '__preface__') return 1;

    // Numerical years: 2020, 2021...
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;

    // Put 未知时间 or 聊天记录 towards the end
    if (a.includes('未知') || a.includes('聊天')) return 1;
    if (b.includes('未知') || b.includes('聊天')) return -1;

    return a.localeCompare(b, 'zh-Hans-CN');
  });

  const volumes: Volume[] = [];
  let totalChapterCounter = 0;

  for (let vIdx = 0; vIdx < sortedVolumeKeys.length; vIdx++) {
    const vKey = sortedVolumeKeys[vIdx];
    const volData = volumeMap.get(vKey)!;

    // Sort files within the volume
    volData.files.sort((f1, f2) => {
      const name1 = f1.path.split('/').pop() || '';
      const name2 = f2.path.split('/').pop() || '';
      return name1.localeCompare(name2, 'zh-Hans-CN', { numeric: true });
    });

    const chapters: Chapter[] = volData.files.map((file, fIdx) => {
      totalChapterCounter++;
      const fileName = file.path.split('/').pop() || '';
      const { title, date } = formatChapterTitle(fileName);

      return {
        id: file.path,
        filePath: file.path,
        title: title || fileName,
        volume: volData.name,
        date,
        order: fIdx + 1,
      };
    });

    volumes.push({
      id: vKey,
      name: volData.name,
      order: vIdx + 1,
      chapters,
    });
  }

  const bookId = subPath ? `${owner}/${repo}/${subPath}` : `${owner}/${repo}`;
  const displayTitle = repoMetadata?.title || repo;
  const displayDesc = repoMetadata?.description || `来自 GitHub 仓库 ${owner}/${repo} 的电子书`;

  return {
    id: bookId,
    owner,
    repo,
    branch,
    subPath,
    title: displayTitle,
    description: displayDesc,
    createdAt: Date.now(),
    lastReadAt: Date.now(),
    totalChapters: totalChapterCounter,
    volumes,
    readmePath,
  };
}

/**
 * Sub-chapter extraction for long TXT or Markdown files.
 * If a single file has internal chapters (e.g. # Heading or 第X章),
 * we can split it into sub-sections.
 */
export interface ParsedSubSection {
  title: string;
  charOffset: number;
  charLength: number;
}

export function parseSubSections(content: string, isMarkdown: boolean): ParsedSubSection[] {
  const sections: ParsedSubSection[] = [];
  const lines = content.split('\n');
  let currentOffset = 0;

  if (isMarkdown) {
    const headingRegex = /^(#{1,3})\s+(.+)$/;
    let currentTitle = '引言';
    let sectionStart = 0;

    for (const line of lines) {
      const match = line.match(headingRegex);
      if (match) {
        if (currentOffset > sectionStart) {
          sections.push({
            title: currentTitle,
            charOffset: sectionStart,
            charLength: currentOffset - sectionStart,
          });
        }
        currentTitle = match[2].trim();
        sectionStart = currentOffset;
      }
      currentOffset += line.length + 1; // +1 for newline
    }

    if (currentOffset > sectionStart) {
      sections.push({
        title: currentTitle,
        charOffset: sectionStart,
        charLength: currentOffset - sectionStart,
      });
    }
  } else {
    // TXT chapter regex
    const chapterRegex = /^(第\s*[0-9一二三四五六七八九十百千万]+\s*[章回节卷].*|Chapter\s+\d+.*|={4,}|-{4,}|20\d\d[.-/]\d\d[.-/]\d\d.*)$/i;
    let currentTitle = '开始阅读';
    let sectionStart = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (chapterRegex.test(trimmed)) {
        if (currentOffset > sectionStart) {
          sections.push({
            title: currentTitle,
            charOffset: sectionStart,
            charLength: currentOffset - sectionStart,
          });
        }
        currentTitle = trimmed;
        sectionStart = currentOffset;
      }
      currentOffset += line.length + 1;
    }

    if (currentOffset > sectionStart) {
      sections.push({
        title: currentTitle,
        charOffset: sectionStart,
        charLength: currentOffset - sectionStart,
      });
    }
  }

  // Only return sub-sections if there are at least 2 distinct sections found
  return sections.length >= 2 ? sections : [];
}
