import React, { useState, useEffect } from 'react';
import type { BookMetadata, Chapter } from '../../types';
import { fetchFileContent } from '../../services/github';
import { db } from '../../db';
import { getAllChapters } from '../../utils/helpers';
import { ReadingInterface } from '../reading-interface';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { ErrorBanner } from '../Common/ErrorBanner';

interface CoreaderBridgeProps {
  book: BookMetadata;
  onBackToShelf: () => void;
}

export const CoreaderBridge: React.FC<CoreaderBridgeProps> = ({ book, onBackToShelf }) => {
  const [coreaderBook, setCoreaderBook] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initBook = async () => {
    setLoading(true);
    setError(null);

    try {
      const allChapters = getAllChapters(book.volumes);
      if (allChapters.length === 0) {
        throw new Error('未在书籍中找到任何章节');
      }

      // Check saved progress
      const progress = await db.progress.get(book.id);
      let targetChapter: Chapter | undefined;

      if (progress?.currentFilePath) {
        targetChapter = allChapters.find((c) => c.filePath === progress.currentFilePath);
      }

      if (!targetChapter) {
        // If readme preface exists, open that first; otherwise chapter 0
        targetChapter = allChapters.find((c) => c.volume.includes('序言')) || allChapters[0];
      }

      const activeIdx = allChapters.findIndex((c) => c.filePath === targetChapter?.filePath);

      // Fetch chapter content
      const chapterText = await fetchFileContent(
        book.owner,
        book.repo,
        book.branch,
        targetChapter.filePath
      );

      // Build model for ReadingInterface
      const formattedBook = {
        id: book.id,
        title: book.title,
        author: `${book.owner}/${book.repo}`,
        type: 'txt',
        content: chapterText,
        chapters: allChapters.map((ch, idx) => ({
          id: ch.filePath,
          title: ch.title,
          volume: ch.volume,
          date: ch.date,
          filePath: ch.filePath,
          startPage: idx + 1,
          endPage: idx + 1,
          content: '',
        })),
        volumes: book.volumes,
        currentPage: progress?.pageIndex || 0,
        totalPages: 1,
        wordCount: chapterText.length,
        owner: book.owner,
        repo: book.repo,
        branch: book.branch,
        activeChapterIndex: activeIdx >= 0 ? activeIdx : 0,
      };

      setCoreaderBook(formattedBook);
    } catch (err: unknown) {
      setError((err as Error).message || '加载章节失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initBook();
  }, [book.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <LoadingSpinner label={`正在准备《${book.title}》阅读界面...`} size="lg" />
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          若首次加载大型 EPUB 或 PDF 文件（数十兆字节），网络传输与排版解析需片刻时间，请耐心稍候...
        </p>
      </div>
    );
  }

  if (error || !coreaderBook) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4">
          <ErrorBanner message={error || '无法打开该书籍'} onRetry={initBook} />
          <div className="text-center">
            <button
              onClick={onBackToShelf}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              返回书架
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <ReadingInterface book={coreaderBook} onClose={onBackToShelf} />;
};
