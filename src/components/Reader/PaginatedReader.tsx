import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ReadingSettings } from '../../types';
import { paginateContent, findPageIndexByOffset, type PageSlice } from '../../services/paginator';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginatedReaderProps {
  content: string;
  settings: ReadingSettings;
  initialCharOffset?: number;
  onPageChange: (pageIndex: number, totalPages: number, charOffset: number) => void;
  onToggleControls: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
}

export const PaginatedReader: React.FC<PaginatedReaderProps> = ({
  content,
  settings,
  initialCharOffset = 0,
  onPageChange,
  onToggleControls,
  onPrevChapter,
  onNextChapter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute pages
  const pages: PageSlice[] = useMemo(() => {
    return paginateContent(content, {
      containerWidth: Math.min(dimensions.width, settings.maxWidth),
      containerHeight: dimensions.height,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
    });
  }, [content, dimensions, settings.fontSize, settings.lineHeight, settings.maxWidth]);

  // Restore page index based on charOffset when content or layout changes
  useEffect(() => {
    if (pages.length > 0) {
      const idx = findPageIndexByOffset(pages, initialCharOffset);
      setCurrentPageIndex(idx);
      const targetPage = pages[idx] || pages[0];
      onPageChange(idx, pages.length, targetPage?.startOffset || 0);
    }
  }, [pages, initialCharOffset]);

  const goToPage = useCallback(
    (newIndex: number) => {
      if (newIndex >= 0 && newIndex < pages.length) {
        setCurrentPageIndex(newIndex);
        const p = pages[newIndex];
        onPageChange(newIndex, pages.length, p.startOffset);
      } else if (newIndex < 0) {
        onPrevChapter();
      } else if (newIndex >= pages.length) {
        onNextChapter();
      }
    },
    [pages, onPageChange, onPrevChapter, onNextChapter]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToPage(currentPageIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPage(currentPageIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, goToPage]);

  // Touch gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        goToPage(currentPageIndex - 1);
      } else {
        goToPage(currentPageIndex + 1);
      }
    }
  };

  // Center click vs side click
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const widthRatio = clickX / rect.width;

    if (widthRatio < 0.25) {
      goToPage(currentPageIndex - 1);
    } else if (widthRatio > 0.75) {
      goToPage(currentPageIndex + 1);
    } else {
      onToggleControls();
    }
  };

  const currentPage = pages[currentPageIndex] || pages[0];

  const fontClass = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
  }[settings.fontFamily];

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-full flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden px-4 sm:px-8 py-6"
    >
      {/* Content wrapper */}
      <div
        className={`w-full h-full flex flex-col justify-start transition-opacity duration-200 ${fontClass}`}
        style={{
          maxWidth: `${settings.maxWidth}px`,
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
      >
        <div className="whitespace-pre-wrap break-words leading-relaxed tracking-wide text-justify">
          {currentPage?.text || ''}
        </div>
      </div>

      {/* Subtle Side Navigation indicator bars (hover only on desktop) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          goToPage(currentPageIndex - 1);
        }}
        disabled={currentPageIndex <= 0}
        aria-label="上一页"
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-14 rounded-xl items-center justify-center opacity-0 hover:opacity-70 bg-black/10 dark:bg-white/10 hover:bg-black/20 transition-all text-current disabled:hidden"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          goToPage(currentPageIndex + 1);
        }}
        disabled={currentPageIndex >= pages.length - 1}
        aria-label="下一页"
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-14 rounded-xl items-center justify-center opacity-0 hover:opacity-70 bg-black/10 dark:bg-white/10 hover:bg-black/20 transition-all text-current disabled:hidden"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
