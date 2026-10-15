import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReadingProgress } from '../types';
import { db } from '../db';

export function useReadingProgress(bookId: string | null) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!bookId) {
      setProgress(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    db.progress.get(bookId).then((stored) => {
      if (stored) {
        setProgress(stored);
      } else {
        setProgress(null);
      }
      setLoading(false);
    });
  }, [bookId]);

  const saveProgress = useCallback(
    (newProgress: Partial<ReadingProgress> & { currentFilePath: string; currentChapterId: string }) => {
      if (!bookId) return;

      const updated: ReadingProgress = {
        bookId,
        currentFilePath: newProgress.currentFilePath,
        currentChapterId: newProgress.currentChapterId,
        charOffset: newProgress.charOffset ?? 0,
        percent: newProgress.percent ?? 0,
        pageIndex: newProgress.pageIndex,
        totalPages: newProgress.totalPages,
        updatedAt: Date.now(),
      };

      setProgress(updated);

      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        try {
          await db.progress.put(updated);
          // Also update lastReadAt in books table
          await db.books.update(bookId, { lastReadAt: Date.now() });
        } catch (err) {
          console.error('Failed to save reading progress:', err);
        }
      }, 300);
    },
    [bookId]
  );

  return {
    progress,
    saveProgress,
    loading,
  };
}
