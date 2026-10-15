import React from 'react';
import { BookOpen, Clock, Trash2, RefreshCw } from 'lucide-react';
import type { BookMetadata, ReadingProgress } from '../../types';
import { formatRelativeTime } from '../../utils/helpers';

interface BookCardProps {
  book: BookMetadata;
  progress?: ReadingProgress | null;
  onOpen: (book: BookMetadata) => void;
  onDelete: (bookId: string) => void;
  onSync: (book: BookMetadata) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  progress,
  onOpen,
  onDelete,
  onSync,
}) => {
  const percent = progress ? Math.round(progress.percent || 0) : 0;
  const isStarted = percent > 0;

  // Derive gradient theme based on repo name for visual variety
  const gradients = [
    'from-amber-700 via-amber-800 to-amber-950',
    'from-slate-700 via-slate-800 to-slate-950',
    'from-emerald-800 via-teal-900 to-slate-950',
    'from-indigo-800 via-purple-900 to-slate-950',
  ];
  const charCodeSum = book.title.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bgGradient = gradients[charCodeSum % gradients.length];

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-amber-100/80 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden hover:-translate-y-1">
      {/* Book Cover simulation */}
      <div
        onClick={() => onOpen(book)}
        className={`h-44 bg-gradient-to-br ${bgGradient} p-5 flex flex-col justify-between text-white cursor-pointer relative overflow-hidden select-none`}
      >
        {/* Book spine decorative line */}
        <div className="absolute top-0 bottom-0 left-3 w-1 bg-white/20 blur-[0.5px]" />
        <div className="absolute top-0 bottom-0 left-4 w-px bg-black/30" />

        <div className="flex items-center justify-between z-10 pl-4">
          <span className="text-[11px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-black/30 backdrop-blur-xs text-amber-200">
            {book.volumes.length} 卷 / {book.totalChapters} 篇
          </span>
          <span className="text-xs text-white/70 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(book.lastReadAt || book.createdAt)}</span>
          </span>
        </div>

        <div className="z-10 pl-4">
          <h3 className="font-serif text-lg font-bold line-clamp-2 leading-snug drop-shadow-sm text-amber-50">
            {book.title}
          </h3>
          <p className="text-xs text-amber-100/75 mt-1 line-clamp-1">
            {book.owner}/{book.repo}
          </p>
        </div>

        {/* Subtle decorative background circle */}
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Book Details & Actions */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {book.description || '暂无简介'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400 font-medium">
            <span>{isStarted ? `已读至 ${percent}%` : '未开始阅读'}</span>
            <span>{book.totalChapters} 章节</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Button Bar */}
        <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => onOpen(book)}
            className="flex-1 mr-2 inline-flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white transition-colors shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isStarted ? '继续阅读' : '开始翻阅'}</span>
          </button>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => onSync(book)}
              title="重新同步最新章节"
              className="p-2 text-gray-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(book.id)}
              title="从书架移除"
              className="p-2 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
