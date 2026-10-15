export type ThemeMode = 'light' | 'dark' | 'sepia' | 'eye-care';
export type ReadingMode = 'paginated' | 'scroll';
export type FontFamily = 'sans' | 'serif' | 'mono';
export type MirrorSource = 'auto' | 'raw' | 'jsdelivr' | 'gitmirror';

export interface GitHubRepoRef {
  owner: string;
  repo: string;
  branch?: string;
  subPath?: string;
}

export interface FileTreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha?: string;
}

export interface Chapter {
  id: string; // filePath or filePath#offset
  filePath: string;
  title: string;
  volume: string;
  date?: string;
  order: number;
  charOffset?: number;
  charLength?: number;
}

export interface Volume {
  id: string;
  name: string;
  order: number;
  chapters: Chapter[];
}

export interface BookMetadata {
  id: string; // `${owner}/${repo}` or `${owner}/${repo}/${subPath}`
  owner: string;
  repo: string;
  branch: string;
  subPath?: string;
  title: string;
  description: string;
  createdAt: number;
  lastReadAt: number;
  totalChapters: number;
  volumes: Volume[];
  readmePath?: string;
}

export interface ReadingProgress {
  bookId: string;
  currentChapterId: string;
  currentFilePath: string;
  charOffset: number;
  percent: number;
  pageIndex?: number;
  totalPages?: number;
  updatedAt: number;
}

export interface ReadingSettings {
  theme: ThemeMode;
  fontSize: number; // 14 to 28
  lineHeight: number; // 1.4 to 2.4
  fontFamily: FontFamily;
  readingMode: ReadingMode;
  maxWidth: number; // 600 to 1100
  mirrorSource: MirrorSource;
}

export interface SearchResultItem {
  id: string;
  bookId: string;
  filePath: string;
  chapterTitle: string;
  volume: string;
  snippet: string;
  matchOffset: number;
}
