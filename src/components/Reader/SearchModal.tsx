import React, { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { searchService } from '../../services/search';
import type { SearchResultItem } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: string;
  onSelectResult: (filePath: string, matchOffset: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  bookId,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [docCount, setDocCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      searchService.loadBookIndex(bookId).then(() => {
        setDocCount(searchService.getDocumentCount());
      });
    }
  }, [isOpen, bookId]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await searchService.search(bookId, query.trim());
      setResults(res);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-amber-100 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-5 shadow-2xl relative flex flex-col max-h-[80vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Search header */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-amber-600" />
            <h3 className="font-serif font-bold text-base text-gray-900 dark:text-zinc-100">
              全书内容检索
            </h3>
          </div>
          <p className="text-[11px] text-gray-400">
            已建立 {docCount} 篇章节离线索引。阅读过的文章将自动加入本地全文词典。
          </p>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearch} className="flex items-center space-x-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入关键词（如：入关学、三体、历史、工业...）"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl transition-colors shadow-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '搜索'}
          </button>
        </form>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : results.length > 0 ? (
            results.map((res) => (
              <div
                key={res.id}
                onClick={() => {
                  onSelectResult(res.filePath, res.matchOffset);
                  onClose();
                }}
                className="p-3 bg-amber-50/40 dark:bg-zinc-800/50 hover:bg-amber-100/60 dark:hover:bg-zinc-800 border border-amber-100/80 dark:border-zinc-700 rounded-2xl cursor-pointer transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-zinc-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                    {res.chapterTitle}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">{res.volume}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed font-serif">
                  {res.snippet}
                </p>
              </div>
            ))
          ) : query && !loading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              未检索到与 “{query}” 相关的已缓存内容。您可以继续阅读其他章节，或扩大检索范围。
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-gray-400">
              输入关键词后回车或点击“搜索”
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
