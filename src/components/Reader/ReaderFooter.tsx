import React from 'react';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import type { ReadingMode } from '../../types';

interface ReaderFooterProps {
  visible: boolean;
  readingMode: ReadingMode;
  pageIndex: number;
  totalPages: number;
  progressPercent: number;
  chapterDate?: string;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export const ReaderFooter: React.FC<ReaderFooterProps> = ({
  visible,
  readingMode,
  pageIndex,
  totalPages,
  progressPercent,
  chapterDate,
  hasPrevChapter,
  hasNextChapter,
  onPrevChapter,
  onNextChapter,
  onPrevPage,
  onNextPage,
}) => {
  return (
    <footer
      className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      } bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-amber-100/60 dark:border-zinc-800 shadow-sm`}
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between text-xs text-gray-600 dark:text-zinc-300 select-none">
        {/* Left: Previous chapter */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={onPrevChapter}
            disabled={!hasPrevChapter}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-medium"
            title="上一篇"
          >
            <SkipBack className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">上一篇</span>
          </button>

          {readingMode === 'paginated' && (
            <button
              onClick={onPrevPage}
              disabled={pageIndex <= 0}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-medium"
              title="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上页</span>
            </button>
          )}
        </div>

        {/* Center: Page / Progress stats */}
        <div className="flex flex-col items-center justify-center space-y-0.5">
          {readingMode === 'paginated' ? (
            <span className="font-mono font-medium text-gray-800 dark:text-zinc-200">
              第 {pageIndex + 1} / {totalPages || 1} 页
            </span>
          ) : (
            <span className="font-mono font-medium text-gray-800 dark:text-zinc-200">
              已读 {Math.round(progressPercent)}%
            </span>
          )}

          {chapterDate && (
            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
              {chapterDate}
            </span>
          )}
        </div>

        {/* Right: Next page & Next chapter */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {readingMode === 'paginated' && (
            <button
              onClick={onNextPage}
              disabled={pageIndex >= totalPages - 1}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-medium"
              title="下一页"
            >
              <span>下页</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onNextChapter}
            disabled={!hasNextChapter}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-medium"
            title="下一篇"
          >
            <span className="hidden sm:inline">下一篇</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
