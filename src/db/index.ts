import Dexie, { type Table } from 'dexie';
import type { BookMetadata, ReadingProgress, ReadingSettings } from '../types';

export interface CachedFile {
  key: string; // `${owner}/${repo}/${branch}/${path}`
  content: string;
  size: number;
  cachedAt: number;
}

export interface IndexedChapterDoc {
  id: string; // `${bookId}:${filePath}`
  bookId: string;
  filePath: string;
  title: string;
  volume: string;
  content: string;
  indexedAt: number;
}

export class GitReaderDatabase extends Dexie {
  books!: Table<BookMetadata, string>;
  progress!: Table<ReadingProgress, string>;
  cachedFiles!: Table<CachedFile, string>;
  settings!: Table<{ id: string; data: ReadingSettings }, string>;
  indexedDocs!: Table<IndexedChapterDoc, string>;

  constructor() {
    super('GitBookReaderDB');
    this.version(1).stores({
      books: 'id, owner, repo, lastReadAt, createdAt',
      progress: 'bookId, updatedAt',
      cachedFiles: 'key, cachedAt',
      settings: 'id',
      indexedDocs: 'id, bookId, filePath',
    });
  }
}

export const db = new GitReaderDatabase();

export const DEFAULT_SETTINGS: ReadingSettings = {
  theme: 'sepia',
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  readingMode: 'paginated',
  maxWidth: 820,
  mirrorSource: 'auto',
};

export async function getStoredSettings(): Promise<ReadingSettings> {
  try {
    const entry = await db.settings.get('user_settings');
    if (entry && entry.data) {
      return { ...DEFAULT_SETTINGS, ...entry.data };
    }
  } catch (err) {
    console.error('Failed to load settings from DB:', err);
  }
  return DEFAULT_SETTINGS;
}

export async function saveStoredSettings(settings: ReadingSettings): Promise<void> {
  try {
    await db.settings.put({ id: 'user_settings', data: settings });
  } catch (err) {
    console.error('Failed to save settings to DB:', err);
  }
}
