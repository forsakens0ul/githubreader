import { db } from '../db';
import type { BookMetadata } from '../types';

const DIR_STORAGE_KEY = 'gitreader_local_dir_name';

/**
 * Checks if File System Access API is supported by the current browser.
 * Supported in Chrome, Edge, Opera, etc.
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Gets the saved folder display name from localStorage.
 */
export function getSavedDirectoryName(): string | null {
  try {
    return localStorage.getItem(DIR_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Prompts user to select a local directory on their computer.
 */
export async function pickLocalDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('当前浏览器不支持文件系统访问 API，推荐使用 Chrome 或 Edge 浏览器。');
  }

  try {
    // @ts-ignore
    const dirHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
    });

    localStorage.setItem(DIR_STORAGE_KEY, dirHandle.name);
    return dirHandle;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null; // User cancelled
    }
    throw err;
  }
}

/**
 * Syncs all books and their cached files into the selected local directory.
 * Creates a folder structure:
 *   [LocalDir]/
 *     [BookTitle]/
 *       metadata.json
 *       [VolumeName]/
 *         [ChapterTitle].txt
 */
export async function syncBooksToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (msg: string) => void
): Promise<{ savedBooks: number; savedFiles: number }> {
  const books = await db.books.toArray();
  const cachedFiles = await db.cachedFiles.toArray();

  let savedBooks = 0;
  let savedFiles = 0;

  for (const book of books) {
    onProgress?.(`正在导出《${book.title}》...`);
    const cleanBookDirName = sanitizeFileName(`${book.owner}_${book.repo}`);
    const bookDir = await dirHandle.getDirectoryHandle(cleanBookDirName, { create: true });

    // Save metadata.json
    const metaFile = await bookDir.getFileHandle('metadata.json', { create: true });
    // @ts-ignore
    const metaWritable = await metaFile.createWritable();
    await metaWritable.write(JSON.stringify(book, null, 2));
    await metaWritable.close();
    savedBooks++;

    // Export cached chapters
    for (const vol of book.volumes) {
      const cleanVolName = sanitizeFileName(vol.name);
      const volDir = await bookDir.getDirectoryHandle(cleanVolName, { create: true });

      for (const ch of vol.chapters) {
        const cacheKey = `${book.owner}/${book.repo}/${book.branch}/${ch.filePath}`;
        const cached = cachedFiles.find((f) => f.key === cacheKey);
        if (cached && cached.content) {
          const fileName = sanitizeFileName(ch.title) + (ch.filePath.endsWith('.md') ? '.md' : '.txt');
          const fileHandle = await volDir.getFileHandle(fileName, { create: true });
          // @ts-ignore
          const writable = await fileHandle.createWritable();
          await writable.write(cached.content);
          await writable.close();
          savedFiles++;
        }
      }
    }
  }

  return { savedBooks, savedFiles };
}

/**
 * One-click export all books, progress and settings into a JSON backup file.
 */
export async function exportBackupJson(): Promise<void> {
  const books = await db.books.toArray();
  const progress = await db.progress.toArray();
  const settings = await db.settings.toArray();
  const cachedFiles = await db.cachedFiles.toArray();

  const backupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    books,
    progress,
    settings,
    cachedFilesCount: cachedFiles.length,
    cachedFiles: cachedFiles.map((f) => ({
      key: f.key,
      size: f.size,
      cachedAt: f.cachedAt,
      content: f.content,
    })),
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gitreader_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Restores books and progress from an uploaded JSON backup file.
 */
export async function importBackupJson(file: File): Promise<{ booksCount: number; filesCount: number }> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.books || !Array.isArray(data.books)) {
    throw new Error('无效的备份文件格式');
  }

  for (const b of data.books) {
    await db.books.put(b);
  }

  if (Array.isArray(data.progress)) {
    for (const p of data.progress) {
      await db.progress.put(p);
    }
  }

  if (Array.isArray(data.cachedFiles)) {
    for (const f of data.cachedFiles) {
      await db.cachedFiles.put(f);
    }
  }

  return {
    booksCount: data.books.length,
    filesCount: data.cachedFiles?.length || 0,
  };
}

/**
 * Estimates the current IndexedDB storage space used.
 */
export async function getStorageEstimate(): Promise<{ usedMb: string; totalMb?: string }> {
  if (navigator.storage && navigator.storage.estimate) {
    const est = await navigator.storage.estimate();
    const usedMb = ((est.usage || 0) / (1024 * 1024)).toFixed(1);
    const totalMb = est.quota ? ((est.quota || 0) / (1024 * 1024 * 1024)).toFixed(1) + ' GB' : undefined;
    return { usedMb: `${usedMb} MB`, totalMb };
  }
  return { usedMb: '无法估算' };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'untitled';
}
