import React from 'react';
import {
  ChevronLeft,
  List,
  Search,
  Settings,
  BookOpen,
  Scroll,
} from 'lucide-react';
import type { BookMetadata, Chapter, ReadingSettings } from '../../types';

interface ReaderHeaderProps {
  book: BookMetadata;
  currentChapter: Chapter | null;
  settings: ReadingSettings;
  onBackToShelf: () => void;
  onToggleToc: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onToggleReadingMode: () => void;
  visible: boolean;
}

export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  book,
  currentChapter,
  settings,
  onBackToShelf,
  onToggleToc,
  onOpenSearch,
  onOpenSettings,
  onToggleReadingMode,
  visible,
}) => {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      } bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-amber-100/60 dark:border-zinc-800 shadow-xs`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Back & TOC */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
          <button
            onClick={onBackToShelf}
            className="p-2 -ml-2 text-gray-600 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
            title="返回书架"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={onToggleToc}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
            title="目录"
          >
            <List className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">目录</span>
          </button>

          <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700 mx-1 hidden sm:block shrink-0" />

          {/* Titles */}
          <div className="min-w-0 truncate">
            <span className="font-serif font-bold text-xs sm:text-sm text-gray-800 dark:text-zinc-200 truncate">
              {currentChapter?.title || book.title}
            </span>
            {currentChapter?.volume && (
              <span className="hidden md:inline-block ml-2 text-[11px] text-gray-400 dark:text-zinc-500">
                · {currentChapter.volume}
              </span>
            )}
          </div>
        </div>

        {/* Right: Search, Mode, Settings */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <button
            onClick={onOpenSearch}
            className="p-2 text-gray-600 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            title="全文搜索"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleReadingMode}
            className="p-2 text-gray-600 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            title={settings.readingMode === 'paginated' ? '切换为连续滚动模式' : '切换为分页阅读模式'}
          >
            {settings.readingMode === 'paginated' ? (
              <Scroll className="w-4 h-4" />
            ) : (
              <BookOpen className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 text-gray-600 dark:text-zinc-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            title="阅读设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
