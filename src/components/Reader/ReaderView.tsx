import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { BookMetadata, Chapter } from '../../types';
import { useReaderSettings } from '../../hooks/useReaderSettings';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { fetchFileContent } from '../../services/github';
import { searchService } from '../../services/search';
import { getAllChapters, findChapterIndex } from '../../utils/helpers';
import { ReaderHeader } from './ReaderHeader';
import { ReaderFooter } from './ReaderFooter';
import { PaginatedReader } from './PaginatedReader';
import { ScrollReader } from './ScrollReader';
import { TocDrawer } from './TocDrawer';
import { SearchModal } from './SearchModal';
import { ReaderSettingsModal } from './ReaderSettingsModal';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { ErrorBanner } from '../Common/ErrorBanner';

interface ReaderViewProps {
  book: BookMetadata;
  onBackToShelf: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ book, onBackToShelf }) => {
  const { settings, updateSettings } = useReaderSettings();
  const { progress, saveProgress, loading: progressLoading } = useReadingProgress(book.id);

  const chapters = useMemo(() => getAllChapters(book.volumes), [book.volumes]);

  // Current active chapter state
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [content, setContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState<boolean>(true);
  const [contentError, setContentError] = useState<string | null>(null);

  // Pagination state
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [charOffset, setCharOffset] = useState<number>(0);

  // Modals & UI controls
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Determine initial chapter from progress or fallback to first
  useEffect(() => {
    if (progressLoading || chapters.length === 0) return;

    let targetChapter: Chapter | undefined;
    if (progress?.currentChapterId) {
      targetChapter = chapters.find(
        (c) => c.id === progress.currentChapterId || c.filePath === progress.currentFilePath
      );
    }

    if (!targetChapter) {
      targetChapter = chapters[0];
    }

    setCurrentChapter(targetChapter);
    if (progress?.charOffset) {
      setCharOffset(progress.charOffset);
    }
  }, [progressLoading, chapters, progress?.currentChapterId, progress?.currentFilePath, progress?.charOffset]);

  // Fetch content whenever current chapter changes
  const loadChapterContent = useCallback(
    async (chapter: Chapter) => {
      setLoadingContent(true);
      setContentError(null);

      try {
        const text = await fetchFileContent(
          book.owner,
          book.repo,
          book.branch,
          chapter.filePath,
          { mirrorSource: settings.mirrorSource }
        );
        setContent(text);

        // Asynchronously add to search index
        searchService
          .indexChapter(book.id, chapter.filePath, chapter.title, chapter.volume, text)
          .catch((err) => console.warn('Search index chapter failed:', err));
      } catch (err: unknown) {
        setContentError((err as Error).message || '无法获取章节内容，请重试');
      } finally {
        setLoadingContent(false);
      }
    },
    [book.owner, book.repo, book.branch, book.id, settings.mirrorSource]
  );

  useEffect(() => {
    if (currentChapter) {
      loadChapterContent(currentChapter);
    }
  }, [currentChapter, loadChapterContent]);

  // Navigation indices
  const currentChapterIndex = useMemo(() => {
    if (!currentChapter) return 0;
    return findChapterIndex(chapters, currentChapter.id);
  }, [chapters, currentChapter]);

  const hasPrevChapter = currentChapterIndex > 0;
  const hasNextChapter = currentChapterIndex < chapters.length - 1;
  const nextChapter = hasNextChapter ? chapters[currentChapterIndex + 1] : null;

  const handlePrevChapter = () => {
    if (hasPrevChapter) {
      const prevCh = chapters[currentChapterIndex - 1];
      setCharOffset(0);
      setCurrentChapter(prevCh);
      saveProgress({
        currentFilePath: prevCh.filePath,
        currentChapterId: prevCh.id,
        charOffset: 0,
        percent: ((currentChapterIndex - 1) / chapters.length) * 100,
      });
    }
  };

  const handleNextChapter = () => {
    if (hasNextChapter) {
      const nextCh = chapters[currentChapterIndex + 1];
      setCharOffset(0);
      setCurrentChapter(nextCh);
      saveProgress({
        currentFilePath: nextCh.filePath,
        currentChapterId: nextCh.id,
        charOffset: 0,
        percent: ((currentChapterIndex + 1) / chapters.length) * 100,
      });
    }
  };

  const handleSelectChapter = (chapter: Chapter) => {
    const idx = findChapterIndex(chapters, chapter.id);
    setCharOffset(0);
    setCurrentChapter(chapter);
    saveProgress({
      currentFilePath: chapter.filePath,
      currentChapterId: chapter.id,
      charOffset: 0,
      percent: (idx / chapters.length) * 100,
    });
  };

  // Handle search jump
  const handleSelectSearchResult = (filePath: string, matchOffset: number) => {
    const targetCh = chapters.find((c) => c.filePath === filePath);
    if (targetCh) {
      setCharOffset(matchOffset);
      setCurrentChapter(targetCh);
      const idx = findChapterIndex(chapters, targetCh.id);
      saveProgress({
        currentFilePath: targetCh.filePath,
        currentChapterId: targetCh.id,
        charOffset: matchOffset,
        percent: (idx / chapters.length) * 100,
      });
    }
  };

  // Page change handler for paginated reader
  const handlePageChange = useCallback(
    (newPageIndex: number, newTotalPages: number, newOffset: number) => {
      setPageIndex(newPageIndex);
      setTotalPages(newTotalPages);
      setCharOffset(newOffset);

      if (currentChapter) {
        const chapterBasePercent = (currentChapterIndex / chapters.length) * 100;
        const pageRatio = newTotalPages > 0 ? newPageIndex / newTotalPages : 0;
        const chapterSpan = (1 / chapters.length) * 100;
        const totalProgress = chapterBasePercent + pageRatio * chapterSpan;

        saveProgress({
          currentFilePath: currentChapter.filePath,
          currentChapterId: currentChapter.id,
          charOffset: newOffset,
          percent: Math.min(100, Math.max(0, totalProgress)),
          pageIndex: newPageIndex,
          totalPages: newTotalPages,
        });
      }
    },
    [currentChapter, currentChapterIndex, chapters.length, saveProgress]
  );

  // Scroll progress handler
  const handleScrollProgress = useCallback(
    (newOffset: number, scrollPercent: number) => {
      setCharOffset(newOffset);
      if (currentChapter) {
        const chapterBasePercent = (currentChapterIndex / chapters.length) * 100;
        const chapterSpan = (1 / chapters.length) * 100;
        const totalProgress = chapterBasePercent + (scrollPercent / 100) * chapterSpan;

        saveProgress({
          currentFilePath: currentChapter.filePath,
          currentChapterId: currentChapter.id,
          charOffset: newOffset,
          percent: Math.min(100, Math.max(0, totalProgress)),
        });
      }
    },
    [currentChapter, currentChapterIndex, chapters.length, saveProgress]
  );

  // Theme container classes
  const themeClasses = {
    'sepia': 'bg-[#f7f1e3] text-[#433827]',
    'eye-care': 'bg-[#eaf4ea] text-[#24422b]',
    'light': 'bg-slate-50 text-slate-800',
    'dark': 'bg-[#18191c] text-[#d6d9dc]',
  }[settings.theme];

  return (
    <div className={`fixed inset-0 flex flex-col ${themeClasses} transition-colors duration-300 select-none overflow-hidden`}>
      {/* Top Header */}
      <ReaderHeader
        book={book}
        currentChapter={currentChapter}
        settings={settings}
        onBackToShelf={onBackToShelf}
        onToggleToc={() => setIsTocOpen(!isTocOpen)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleReadingMode={() =>
          updateSettings({
            readingMode: settings.readingMode === 'paginated' ? 'scroll' : 'paginated',
          })
        }
        visible={controlsVisible}
      />

      {/* Main Reading Canvas */}
      <main className="flex-1 w-full h-full relative overflow-hidden">
        {loadingContent ? (
          <div className="w-full h-full flex items-center justify-center">
            <LoadingSpinner label="正在读取章节文本..." size="lg" />
          </div>
        ) : contentError ? (
          <div className="w-full h-full flex items-center justify-center p-6">
            <div className="max-w-md w-full">
              <ErrorBanner
                message={contentError}
                onRetry={() => currentChapter && loadChapterContent(currentChapter)}
              />
            </div>
          </div>
        ) : settings.readingMode === 'paginated' ? (
          <PaginatedReader
            content={content}
            settings={settings}
            initialCharOffset={charOffset}
            onPageChange={handlePageChange}
            onToggleControls={() => setControlsVisible(!controlsVisible)}
            onPrevChapter={handlePrevChapter}
            onNextChapter={handleNextChapter}
          />
        ) : (
          <ScrollReader
            content={content}
            settings={settings}
            initialCharOffset={charOffset}
            onScrollProgress={handleScrollProgress}
            onToggleControls={() => setControlsVisible(!controlsVisible)}
            onNextChapter={handleNextChapter}
            hasNextChapter={hasNextChapter}
            nextChapterTitle={nextChapter?.title}
          />
        )}
      </main>

      {/* Bottom Footer */}
      <ReaderFooter
        visible={controlsVisible}
        readingMode={settings.readingMode}
        pageIndex={pageIndex}
        totalPages={totalPages}
        progressPercent={progress?.percent || 0}
        chapterDate={currentChapter?.date}
        hasPrevChapter={hasPrevChapter}
        hasNextChapter={hasNextChapter}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        onPrevPage={() => {
          // Trigger previous page via PaginatedReader or state
          if (pageIndex > 0) {
            setPageIndex(pageIndex - 1);
          }
        }}
        onNextPage={() => {
          if (pageIndex < totalPages - 1) {
            setPageIndex(pageIndex + 1);
          }
        }}
      />

      {/* Table of Contents Drawer */}
      <TocDrawer
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        volumes={book.volumes}
        currentChapterId={currentChapter?.id || ''}
        onSelectChapter={handleSelectChapter}
      />

      {/* Full-text Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        bookId={book.id}
        onSelectResult={handleSelectSearchResult}
      />

      {/* Reader Settings Modal */}
      <ReaderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
};
