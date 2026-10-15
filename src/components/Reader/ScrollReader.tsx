import React, { useEffect, useRef } from 'react';
import type { ReadingSettings } from '../../types';
import { ArrowRight } from 'lucide-react';

interface ScrollReaderProps {
  content: string;
  settings: ReadingSettings;
  initialCharOffset?: number;
  onScrollProgress: (charOffset: number, percent: number) => void;
  onToggleControls: () => void;
  onNextChapter: () => void;
  hasNextChapter: boolean;
  nextChapterTitle?: string;
}

export const ScrollReader: React.FC<ScrollReaderProps> = ({
  content,
  settings,
  initialCharOffset = 0,
  onScrollProgress,
  onToggleControls,
  onNextChapter,
  hasNextChapter,
  nextChapterTitle,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialScrollApplied = useRef(false);

  // Restore scroll position based on charOffset
  useEffect(() => {
    if (!containerRef.current || isInitialScrollApplied.current) return;
    if (initialCharOffset > 0 && content.length > 0) {
      const ratio = initialCharOffset / content.length;
      const targetScroll = containerRef.current.scrollHeight * ratio;
      containerRef.current.scrollTop = targetScroll;
      isInitialScrollApplied.current = true;
    }
  }, [content, initialCharOffset]);

  const handleScroll = () => {
    if (!containerRef.current || content.length === 0) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    const percent = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    const charOffset = Math.round((percent / 100) * content.length);
    onScrollProgress(charOffset, percent);
  };

  const fontClass = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
  }[settings.fontFamily];

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onClick={(e) => {
        // Only toggle controls if not clicking a button
        if ((e.target as HTMLElement).closest('button')) return;
        onToggleControls();
      }}
      className="w-full h-full overflow-y-auto px-4 sm:px-8 py-16 flex flex-col items-center"
    >
      <div
        className={`w-full transition-all duration-200 ${fontClass}`}
        style={{
          maxWidth: `${settings.maxWidth}px`,
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
      >
        <div className="whitespace-pre-wrap break-words leading-relaxed tracking-wide text-justify">
          {content}
        </div>

        {/* Bottom next chapter card */}
        {hasNextChapter && (
          <div className="mt-16 pt-8 border-t border-amber-200/40 dark:border-zinc-800 flex flex-col items-center">
            <button
              onClick={onNextChapter}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition-all shadow-md shadow-amber-600/20 hover:scale-102"
            >
              <span>下一篇: {nextChapterTitle || '阅读下一章'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
