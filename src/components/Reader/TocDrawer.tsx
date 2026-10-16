import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Crosshair,
  ArrowUpDown,
  BookOpen,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Volume } from '@/types';

interface TocDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookId?: string;
  volumes?: Volume[];
  totalChapters?: number;
  currentChapterId?: string;
  currentFilePath?: string;
  onSelectChapter: (chapter: any) => void;
}

export const TocDrawer: React.FC<TocDrawerProps> = ({
  isOpen,
  onClose,
  bookId,
  volumes,
  totalChapters,
  currentChapterId,
  currentFilePath,
  onSelectChapter,
}) => {
  const [chapterFilter, setChapterFilter] = useState('');
  const [isTocAscending, setIsTocAscending] = useState(true);
  const activeChapterRef = useRef<HTMLButtonElement | null>(null);

  const storageKey = bookId ? `gitreader_expanded_vols_${bookId}` : 'gitreader_expanded_vols_default';

  // TOC folder hierarchy memory
  const [expandedVolumeIds, setExpandedVolumeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    // Default: find volume for current active chapter
    const activeVol = volumes?.find((v: any) =>
      v.chapters?.some((c: any) => c.id === currentChapterId || c.filePath === currentFilePath)
    );
    return activeVol ? [activeVol.id] : [];
  });

  // Find active volume
  const activeVolId = volumes?.find((v: any) =>
    v.chapters?.some(
      (c: any) => c.id === currentChapterId || c.filePath === currentFilePath
    )
  )?.id;

  // Whenever active chapter changes, ensure its volume is expanded in memory
  useEffect(() => {
    if (!activeVolId) return;
    setExpandedVolumeIds((prev) => {
      if (prev.includes(activeVolId)) return prev;
      const next = [...prev, activeVolId];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [activeVolId, storageKey]);

  // When TOC drawer opens, auto-scroll to the active article
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (activeChapterRef.current) {
          activeChapterRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 160);
      return () => clearTimeout(timer);
    }
  }, [isOpen, expandedVolumeIds, currentChapterId, currentFilePath]);

  const handleLocateCurrent = () => {
    if (activeVolId && !expandedVolumeIds.includes(activeVolId)) {
      setExpandedVolumeIds((prev) => [...prev, activeVolId]);
    }
    setTimeout(() => {
      activeChapterRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 120);
  };

  const toggleVolume = (volId: string) => {
    setExpandedVolumeIds((prev) => {
      const next = prev.includes(volId)
        ? prev.filter((id) => id !== volId)
        : [...prev, volId];
      try {
        localStorage.setItem(`gitreader_expanded_vols_${bookId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const allVolIds = volumes?.map((v) => v.id) || [];
  const areAllExpanded =
    allVolIds.length > 0 && allVolIds.every((id) => expandedVolumeIds.includes(id));

  const toggleExpandAll = () => {
    if (areAllExpanded) {
      setExpandedVolumeIds([]);
      try {
        localStorage.setItem(`gitreader_expanded_vols_${bookId}`, JSON.stringify([]));
      } catch {}
    } else {
      setExpandedVolumeIds(allVolIds);
      try {
        localStorage.setItem(`gitreader_expanded_vols_${bookId}`, JSON.stringify(allVolIds));
      } catch {}
    }
  };

  if (!isOpen) return null;

  const filterLower = chapterFilter.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-10 w-84 sm:w-96 max-w-[85vw] bg-background border-r border-border shadow-2xl flex flex-col h-full select-none animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold tracking-tight truncate">书籍目录</h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {volumes?.length || 0} 个卷册 · 共 {totalChapters || 0} 篇
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLocateCurrent}
              title="定位到当前正在阅读的文章"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
            >
              <Crosshair className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter & Action toolbar */}
        <div className="p-3 border-b border-border space-y-2 bg-muted/20">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="搜索标题、年份或日期..."
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className="text-xs h-8 pl-8 pr-7 bg-background"
            />
            {chapterFilter && (
              <button
                onClick={() => setChapterFilter('')}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
            <button
              onClick={toggleExpandAll}
              className="text-[11px] font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              {areAllExpanded ? '折叠全部卷册' : '展开全部卷册'}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsTocAscending(!isTocAscending)}
                className="inline-flex items-center space-x-1 text-[11px] hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                title={isTocAscending ? '切换为倒序 (最新在前)' : '切换为正序 (时间先后)'}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>{isTocAscending ? '正序' : '倒序'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Chapter Tree */}
        <ScrollArea className="flex-1 p-2.5">
          {volumes && volumes.length > 0 ? (
            <div className="space-y-1.5">
              {volumes.map((vol) => {
                const filteredChapters = (vol.chapters || []).filter((ch) => {
                  if (!filterLower) return true;
                  return (
                    ch.title.toLowerCase().includes(filterLower) ||
                    (ch.date && ch.date.includes(filterLower)) ||
                    vol.name.toLowerCase().includes(filterLower)
                  );
                });

                if (filteredChapters.length === 0) return null;

                const sortedChapters = isTocAscending
                  ? filteredChapters
                  : [...filteredChapters].reverse();

                const isExpanded =
                  Boolean(filterLower) || expandedVolumeIds.includes(vol.id);
                const isThisVolActive = vol.id === activeVolId;

                return (
                  <div
                    key={vol.id}
                    className={cn(
                      'rounded-xl transition-colors border',
                      isThisVolActive
                        ? 'border-amber-200/70 dark:border-amber-900/50 bg-amber-500/5'
                        : 'border-transparent'
                    )}
                  >
                    {/* Folder Header */}
                    <button
                      onClick={() => toggleVolume(vol.id)}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors select-none group',
                        isThisVolActive
                          ? 'hover:bg-amber-100/50 dark:hover:bg-amber-950/40'
                          : 'hover:bg-muted/60'
                      )}
                    >
                      <div className="flex items-center space-x-2 truncate min-w-0">
                        <span className="text-muted-foreground group-hover:text-foreground shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </span>
                        {isExpanded ? (
                          <FolderOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : (
                          <Folder className="w-4 h-4 text-amber-600/80 dark:text-amber-500/80 shrink-0" />
                        )}
                        <span
                          className={cn(
                            'text-xs truncate',
                            isThisVolActive
                              ? 'font-bold text-amber-900 dark:text-amber-200'
                              : 'font-semibold text-foreground'
                          )}
                        >
                          {vol.name}
                        </span>
                        {isThisVolActive && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-600 text-white shrink-0">
                            在读
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                        {filteredChapters.length} 篇
                      </span>
                    </button>

                    {/* Chapter items */}
                    {isExpanded && (
                      <div className="ml-4 pl-2.5 my-1 border-l-2 border-amber-200/60 dark:border-zinc-800 space-y-0.5">
                        {sortedChapters.map((ch) => {
                          const isSelected =
                            currentChapterId === ch.id ||
                            currentFilePath === ch.filePath;
                          return (
                            <button
                              key={ch.id}
                              ref={isSelected ? activeChapterRef : undefined}
                              onClick={() => {
                                onSelectChapter(ch.id);
                                if (window.innerWidth < 768) {
                                  onClose();
                                }
                              }}
                              className={cn(
                                'w-full text-left p-2 rounded-lg text-xs transition-colors flex flex-col space-y-0.5 relative group',
                                isSelected
                                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                              )}
                            >
                              <div className="flex items-center space-x-1.5 w-full">
                                {isSelected && (
                                  <BookOpen className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                                )}
                                {ch.format && ['docx', 'epub', 'pdf'].includes(ch.format) && (
                                  <span
                                    className={cn(
                                      'px-1 py-0.2 rounded text-[9px] uppercase font-mono font-bold shrink-0',
                                      isSelected
                                        ? 'bg-amber-700 text-amber-100'
                                        : 'bg-muted text-muted-foreground'
                                    )}
                                  >
                                    {ch.format}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    'line-clamp-2 leading-relaxed text-xs',
                                    isSelected
                                      ? 'text-white font-medium'
                                      : 'text-foreground'
                                  )}
                                >
                                  {ch.title}
                                </span>
                              </div>
                              {ch.date && (
                                <span
                                  className={cn(
                                    'text-[10px] font-mono',
                                    isSelected
                                      ? 'text-amber-100'
                                      : 'text-muted-foreground/75'
                                  )}
                                >
                                  {ch.date}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">未在书籍中找到章节</div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
