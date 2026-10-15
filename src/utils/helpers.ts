import type { Chapter, Volume } from '../types';

export function getAllChapters(volumes: Volume[]): Chapter[] {
  return volumes.flatMap((v) => v.chapters);
}

export function findChapterIndex(chapters: Chapter[], chapterId: string): number {
  return chapters.findIndex((c) => c.id === chapterId || c.filePath === chapterId);
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

export function estimateReadingMinutes(charCount: number): number {
  // Average Chinese reading speed: ~400 characters per minute
  return Math.max(1, Math.round(charCount / 400));
}
