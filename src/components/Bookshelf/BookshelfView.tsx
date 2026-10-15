import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Compass,
  Sparkles,
  BookMarked,
  ShieldCheck,
  Smartphone,
  HardDrive,
} from 'lucide-react';
import { db } from '../../db';
import type { BookMetadata, ReadingProgress } from '../../types';
import { BookCard } from './BookCard';
import { AddBookModal } from './AddBookModal';
import { StorageSettingsModal } from './StorageSettingsModal';
import { LoadingSpinner } from '../Common/LoadingSpinner';

interface BookshelfViewProps {
  onOpenBook: (book: BookMetadata) => void;
}

export const BookshelfView: React.FC<BookshelfViewProps> = ({ onOpenBook }) => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  const loadBookshelf = async () => {
    setLoading(true);
    try {
      const allBooks = await db.books.toArray();
      // Sort by lastReadAt descending
      allBooks.sort((a, b) => (b.lastReadAt || b.createdAt) - (a.lastReadAt || a.createdAt));
      setBooks(allBooks);

      const allProgress = await db.progress.toArray();
      const pMap: Record<string, ReadingProgress> = {};
      for (const p of allProgress) {
        pMap[p.bookId] = p;
      }
      setProgressMap(pMap);
    } catch (err) {
      console.error('Failed to load books from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookshelf();
  }, []);

  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm('确定要从书架移除这本书吗？（已缓存的阅读进度将被清除）')) {
      await db.books.delete(bookId);
      await db.progress.delete(bookId);
      loadBookshelf();
    }
  };

  const handleSyncBook = async (_book: BookMetadata) => {
    // Re-import the same repo
    setIsAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-amber-100/70 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-gray-900 dark:text-zinc-100">
                GitBook Reader
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-amber-700 dark:text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-zinc-800">
                GitHub 电子书阅读器
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsStorageModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-750 transition-all shadow-sm"
              title="管理本地存储与文件同步"
            >
              <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              <span className="hidden sm:inline">本地存储与同步</span>
              <span className="sm:hidden">存储</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white transition-all shadow-sm shadow-amber-600/30 hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>导入新书</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="py-20">
            <LoadingSpinner label="正在读取本地书架..." size="lg" />
          </div>
        ) : books.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold font-serif text-gray-900 dark:text-zinc-100">
                  我的书架
                </h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  共收藏 {books.length} 本 GitHub 文本书籍
                </p>
              </div>
            </div>

            {/* Books Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((b) => (
                <BookCard
                  key={b.id}
                  book={b}
                  progress={progressMap[b.id]}
                  onOpen={onOpenBook}
                  onDelete={handleDeleteBook}
                  onSync={handleSyncBook}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Empty State / Welcome Hero */
          <div className="py-12 sm:py-16 flex flex-col items-center max-w-2xl mx-auto text-center space-y-8 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400 shadow-inner">
              <BookMarked className="w-10 h-10" />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight text-gray-900 dark:text-zinc-100">
                把 GitHub 仓库变成一本真正的书
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-zinc-400 leading-relaxed max-w-lg mx-auto">
                输入公开 GitHub 文本仓库，智能识别年份目录、回答标题与章节层次，享受纯净的电子书翻页排版。
              </p>
            </div>

            {/* Quick Start Call to Action */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-amber-200/80 dark:border-zinc-800 shadow-xl max-w-md w-full space-y-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>一键试读官方范例</span>
              </div>
              <div className="text-left space-y-1">
                <h4 className="font-serif font-bold text-base text-gray-900 dark:text-zinc-100">
                  《托卡马克之冠》知乎回答合集
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  包含 2020 ~ 2025 年知乎深度回答整理，已自动排除冗余脚本与巨型单文件。
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl text-sm font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white transition-all shadow-md shadow-amber-600/30"
              >
                <BookOpen className="w-4 h-4" />
                <span>立即导入并阅读</span>
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left w-full">
              <div className="p-4 bg-white/60 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-zinc-800 flex items-center justify-center text-amber-600">
                  <Compass className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold text-gray-900 dark:text-zinc-200">
                  结构化目录解析
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  自动识别按年份、按 Markdown 标头组织的文本结构，生成流畅卷节。
                </p>
              </div>

              <div className="p-4 bg-white/60 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-zinc-800 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold text-gray-900 dark:text-zinc-200">
                  本地私有与离线
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  IndexedDB 本地持久化，读过的章节离线亦可浏览，阅读进度永不丢失。
                </p>
              </div>

              <div className="p-4 bg-white/60 dark:bg-zinc-900/60 rounded-2xl border border-gray-100 dark:border-zinc-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-zinc-800 flex items-center justify-center text-indigo-600">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-bold text-gray-900 dark:text-zinc-200">
                  沉浸分页与护眼
                </h5>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                  段落字偏移分页排版，多款柔和色彩与字号自由搭配，多端响应适配。
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Book Modal */}
      <AddBookModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onBookAdded={(newBook) => {
          loadBookshelf();
          onOpenBook(newBook);
        }}
      />

      {/* Storage Settings Modal */}
      <StorageSettingsModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        onDataChanged={loadBookshelf}
      />
    </div>
  );
};
