"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Menu,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookStore } from "@/lib/store";
import { ReadingEngine, PageInfo } from "@/lib/reading-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fetchFileContent } from "@/services/github";
import { db } from "@/db";

import { TocDrawer } from "./Reader/TocDrawer";
import { SettingsDrawer } from "./Reader/SettingsDrawer";
import { SearchDialog } from "./Reader/SearchDialog";
import { HighlightMenu } from "./Reader/HighlightMenu";

interface ReadingInterfaceProps {
  book: any;
  onClose: () => void;
}

export function ReadingInterface({ book, onClose }: ReadingInterfaceProps) {
  const {
    settings,
    highlights,
    addHighlight,
    updateBook,
    notes,
    addNote,
  } = useBookStore();

  const [readingEngine] = useState(() => new ReadingEngine(book));
  const [currentPage, setCurrentPage] = useState(book.currentPage || 0);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [currentChapterInfo, setCurrentChapterInfo] = useState<{
    id: string;
    title: string;
    filePath: string;
    date?: string;
  } | null>(() => {
    const initCh = book.chapters?.[book.activeChapterIndex || 0];
    return initCh
      ? {
          id: initCh.id,
          title: book.currentChapterTitle || initCh.title,
          filePath: book.currentChapterId || initCh.filePath || initCh.id,
          date: book.currentChapterDate || initCh.date,
        }
      : null;
  });

  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [highlightMenuPosition, setHighlightMenuPosition] = useState({ x: 0, y: 0 });
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [brightness, setBrightness] = useState(settings.brightness);
  const [isReading, setIsReading] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(200);
  const [readingMode, setReadingMode] = useState<"paged" | "scroll">("paged");

  const contentRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Selection | null>(null);

  // Initialize page info
  useEffect(() => {
    let mounted = true;
    const bookTitle = book.title;
    const bookContent = book.content;

    try {
      if (!bookContent || bookContent.trim() === "" || bookContent === "No content available") {
        if (book.chapters && book.chapters.length > 0) {
          let mergedContent = "";
          for (const chapter of book.chapters) {
            if (chapter.content && chapter.content.trim() !== "") {
              mergedContent += chapter.content + "\n\n";
            }
          }
          if (mergedContent.trim() !== "") {
            readingEngine.updateContent(mergedContent);
          } else {
            throw new Error(`无法读取"${bookTitle}"的内容，请尝试重新导入。`);
          }
        } else {
          throw new Error(`无法读取"${bookTitle}"的内容，请尝试重新导入。`);
        }
      }

      const totalPages = readingEngine.getTotalPages();
      if (totalPages === 0) {
        throw new Error("未找到可阅读的页面，请尝试重新导入书籍");
      }

      const validPage = Math.max(0, Math.min(currentPage, totalPages - 1));
      const info = readingEngine.getPageInfo(validPage);

      if (info && mounted) {
        setPageInfo(info);
        if (validPage !== currentPage) {
          setCurrentPage(validPage);
        }
      }
    } catch (error) {
      if (mounted) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `无法读取"${bookTitle}"的内容，请尝试重新导入。`;

        setPageInfo({
          content: errorMessage,
          chapterId: "chapter-1",
          chapterTitle: bookTitle || "Full Text",
          pageInChapter: 0,
          totalPagesInChapter: 1,
          globalPage: 0,
          totalPages: 1,
        });

        toast.error(errorMessage, { duration: 5000 });
      }
    }

    return () => {
      mounted = false;
    };
  }, [book, currentPage, readingEngine]);

  // Update book progress
  useEffect(() => {
    if (pageInfo) {
      const progress = Math.round(((pageInfo.globalPage + 1) / pageInfo.totalPages) * 100);
      updateBook(book.id, {
        currentPage: pageInfo.globalPage,
        progress,
        lastReadAt: new Date(),
      });
    }
  }, [pageInfo, book.id, updateBook]);

  // Apply brightness filter
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.filter = `brightness(${brightness}%)`;
    }
  }, [brightness]);

  // Repaginate when settings change
  const repaginateTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (repaginateTimeout.current) {
      clearTimeout(repaginateTimeout.current);
    }

    repaginateTimeout.current = setTimeout(() => {
      readingEngine.repaginate({
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        lineHeight: settings.lineHeight,
        pageWidth: settings.pageWidth,
        pageHeight: window.innerHeight - 200,
        padding: 40,
      });

      const info = readingEngine.getPageInfo(currentPage);
      setPageInfo(info);
    }, 250);

    return () => {
      if (repaginateTimeout.current) clearTimeout(repaginateTimeout.current);
    };
  }, [
    settings.fontSize,
    settings.fontFamily,
    settings.lineHeight,
    settings.pageWidth,
  ]);

  // Chapter Navigation
  const currentChapterIndex = book.chapters?.findIndex(
    (c: any) => c.id === currentChapterInfo?.id || c.filePath === currentChapterInfo?.filePath
  ) ?? -1;

  const goToChapter = async (chapterOrId: any) => {
    const chapterId =
      typeof chapterOrId === "string"
        ? chapterOrId
        : chapterOrId?.id || chapterOrId?.filePath;
    if (!chapterId) return;
    if (book.owner && book.repo) {
      const ch = book.chapters?.find((c: any) => c.id === chapterId || c.filePath === chapterId);
      if (!ch) return;
      setIsLoadingChapter(true);
      const isLargeDoc = /\.(pdf|epub|docx)$/i.test(ch.filePath || ch.id);
      let toastId: string | number | undefined;
      if (isLargeDoc) {
        toastId = toast.loading(`正在获取并解析 ${ch.title}，文件较大请稍候...`);
      }
      try {
        const text = await fetchFileContent(book.owner, book.repo, book.branch || 'main', ch.filePath || ch.id);
        if (toastId) toast.dismiss(toastId);
        readingEngine.updateContent(text, ch.title, ch.filePath || ch.id);
        setCurrentChapterInfo({
          id: ch.id,
          title: ch.title,
          filePath: ch.filePath || ch.id,
          date: ch.date,
        });
        setCurrentPage(0);
        setPageInfo(readingEngine.getPageInfo(0));

        // Save progress to Dexie
        const chIdx = book.chapters?.findIndex((c: any) => c.id === ch.id) || 0;
        const total = book.chapters?.length || 1;
        db.progress.put({
          bookId: book.id,
          currentFilePath: ch.filePath || ch.id,
          currentChapterId: ch.id,
          charOffset: 0,
          percent: Math.round(((chIdx + 1) / total) * 100),
          updatedAt: Date.now(),
        });
        db.books.update(book.id, { lastReadAt: Date.now() });
        toast.success(`已切换至: ${ch.title}`, { duration: 1500 });
      } catch (err: any) {
        if (toastId) toast.dismiss(toastId);
        toast.error(`加载章节失败: ${err.message}`);
      } finally {
        if (toastId) toast.dismiss(toastId);
        setIsLoadingChapter(false);
      }
      return;
    }
    const firstPage = readingEngine.getChapterFirstPage(chapterId);
    setCurrentPage(firstPage);
  };

  const goToNextChapter = () => {
    if (currentChapterIndex >= 0 && currentChapterIndex < (book.chapters?.length || 0) - 1) {
      const nextCh = book.chapters[currentChapterIndex + 1];
      goToChapter(nextCh.id);
    }
  };

  const goToPrevChapter = () => {
    if (currentChapterIndex > 0) {
      const prevCh = book.chapters[currentChapterIndex - 1];
      goToChapter(prevCh.id);
    }
  };

  const nextPage = () => {
    if (pageInfo && pageInfo.globalPage < pageInfo.totalPages - 1) {
      setCurrentPage(pageInfo.globalPage + 1);
    } else if (
      pageInfo &&
      pageInfo.globalPage === pageInfo.totalPages - 1 &&
      currentChapterIndex >= 0 &&
      currentChapterIndex < (book.chapters?.length || 0) - 1
    ) {
      goToNextChapter();
      toast.info("已翻至下一篇回答", { duration: 1200 });
    }
  };

  const prevPage = () => {
    if (pageInfo && pageInfo.globalPage > 0) {
      setCurrentPage(pageInfo.globalPage - 1);
    } else if (pageInfo && pageInfo.globalPage === 0 && currentChapterIndex > 0) {
      goToPrevChapter();
      toast.info("已返回上一篇回答", { duration: 1200 });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showSettings || showChapters || showSearch) return;

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          prevPage();
          break;
        case "ArrowRight":
        case "ArrowDown":
        case " ":
          e.preventDefault();
          nextPage();
          break;
        case "Home":
          e.preventDefault();
          setCurrentPage(0);
          break;
        case "End":
          e.preventDefault();
          setCurrentPage(readingEngine.getTotalPages() - 1);
          break;
        case "f":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowSearch(true);
          }
          break;
        case "Escape":
          if (isFullscreen) {
            setIsFullscreen(false);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [showSettings, showChapters, showSearch, isFullscreen, pageInfo, currentChapterIndex]);

  // Text selection for highlight
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(text);
      selectionRef.current = selection;
      setSelectionRange({
        start: range.startOffset,
        end: range.endOffset,
      });
      setHighlightMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
      setShowHighlightMenu(true);
    }
  }, []);

  const clearSelection = () => {
    setSelectedText("");
    setSelectionRange(null);
    selectionRef.current?.removeAllRanges();
  };

  const createHighlight = (
    color: "yellow" | "blue" | "green" | "red",
    style: "highlight" | "underline" | "wave"
  ) => {
    if (selectedText && selectionRange && pageInfo) {
      addHighlight({
        bookId: book.id,
        text: selectedText,
        color,
        style,
        page: pageInfo.globalPage,
        position: selectionRange,
      });
      setShowHighlightMenu(false);
      clearSelection();
      toast.success("已添加高亮标记");
    }
  };

  const handleSaveNote = (noteText: string) => {
    if (selectedText && selectionRange && pageInfo) {
      addNote({
        bookId: book.id,
        text: selectedText,
        note: noteText,
        chapterId: pageInfo.chapterId,
        page: pageInfo.globalPage,
        position: selectionRange,
      });

      if (noteText.trim()) {
        addHighlight({
          bookId: book.id,
          text: selectedText,
          note: noteText,
          color: "yellow",
          style: "highlight",
          page: pageInfo.globalPage,
          position: selectionRange,
        });
      }

      toast.success("批注笔记已保存");
    }
    clearSelection();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Wheel scroll mode
  useEffect(() => {
    if (readingMode !== "scroll") return;

    const THRESHOLD = 60;
    const LOCK = 700;
    let locked = false;

    const onWheel = (e: WheelEvent) => {
      if (showSettings || showChapters || showSearch) return;
      if (locked) return;

      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

      if (e.deltaY > 0 && scrollTop + clientHeight >= scrollHeight - THRESHOLD) {
        if (pageInfo && pageInfo.globalPage < pageInfo.totalPages - 1) {
          nextPage();
          locked = true;
          setTimeout(() => (locked = false), LOCK);
        }
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [readingMode, showSettings, showChapters, showSearch, pageInfo]);

  // Scroll to top on page flip
  useEffect(() => {
    if (readingMode === "paged") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [currentPage, readingMode]);

  // Click on highlight to view note
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains("highlight-item")) {
        const note = target.getAttribute("data-note");
        if (note) {
          setActiveNote(decodeURIComponent(note));
        }
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Highlight rendering for natural paragraphs
  const getHighlightedParagraphs = useCallback(() => {
    if (!pageInfo?.content) return [];

    const pageHighlights = highlights.filter(
      (h) => h.bookId === book.id && h.page === pageInfo.globalPage
    );

    // Split page content into natural paragraphs (joined by \n\n)
    const paragraphs = pageInfo.content.split(/\n\n+/);

    return paragraphs.map((p) => {
      let html = p.trim();
      pageHighlights.forEach((h, idx) => {
        const safeText = h.text.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
        const regex = new RegExp(safeText, "g");
        let baseStyle = "";
        if (h.style === "highlight") {
          baseStyle = `background-color:${h.note ? "#e9b439" : "#fff0d3"};`;
        } else if (h.style === "underline") {
          baseStyle = "text-decoration: underline; text-decoration-color:#fe8589;";
        } else {
          baseStyle = "text-decoration: underline wavy #6b93ca;";
        }

        const noteAttr = h.note ? `data-note="${encodeURIComponent(h.note)}"` : "";

        html = html.replace(
          regex,
          `<span class="highlight-item cursor-pointer" data-idx="${idx}" style="${baseStyle}" ${noteAttr}>$&</span>`
        );
      });
      return html;
    });
  }, [pageInfo, highlights, book.id]);

  const fontFamilyClass =
    {
      crimson: "font-reading",
      merriweather: "font-reading-serif",
      "source-serif": "font-reading-serif",
      inter: "font-reading-sans",
    }[settings.fontFamily] || "font-reading";

  const themeClass =
    {
      light: "",
      dark: "dark",
      sepia: "theme-sepia",
      paper: "theme-paper",
      green: "theme-green",
    }[settings.theme] || "";

  if (!pageInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto" />
          <p className="text-sm font-medium">正在准备阅读界面...</p>
          <p className="text-xs text-muted-foreground">{book.title}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen reading-container",
        themeClass,
        isFullscreen && "fixed inset-0 z-50"
      )}
    >
      {/* Header */}
      {!isFullscreen && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/70">
          <div className="max-w-4xl mx-auto flex items-center justify-between p-3.5 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="font-bold text-xs sm:text-sm truncate">
                  {currentChapterInfo?.title || book.title}
                </h1>
                <p className="text-[11px] text-muted-foreground truncate font-mono">
                  {book.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSearch(true)}
                title="搜索正文"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChapters(true)}
                title="打开书籍目录"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                title="全屏阅读"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Maximize className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                title="阅读设置"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Controls for Fullscreen */}
      {isFullscreen && (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleFullscreen} title="退出全屏">
            <Minimize className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} title="设置">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Content Area */}
      <div className="relative flex-1 pb-24">
        <div
          ref={contentRef}
          className={cn(
            "max-w-4xl mx-auto p-6 sm:p-10 min-h-screen cursor-text",
            fontFamilyClass
          )}
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
            maxWidth: `${settings.pageWidth}px`,
          }}
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentChapterInfo?.id || currentChapterInfo?.filePath || "ch"}_${pageInfo.globalPage}`}
              initial={{
                opacity: 0,
                x: settings.pageTransition === "slide" ? 40 : 0,
                scale: settings.pageTransition === "flip" ? 0.95 : 1,
              }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{
                opacity: settings.pageTransition === "fade" ? 0 : 1,
                x: settings.pageTransition === "slide" ? -40 : 0,
                scale: settings.pageTransition === "flip" ? 0.95 : 1,
              }}
              transition={{ duration: 0.22 }}
              className="prose prose-lg max-w-none dark:prose-invert"
            >
              <div className="mb-6 pb-3 border-b border-border/40">
                <h2 className="text-lg sm:text-xl font-bold font-serif mb-1 leading-snug">
                  {currentChapterInfo?.title || pageInfo.chapterTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground font-mono">
                  {currentChapterInfo?.date && (
                    <>
                      <span>{currentChapterInfo.date}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>第 {pageInfo.pageInChapter + 1} / {pageInfo.totalPagesInChapter} 页</span>
                  {book.chapters && book.chapters.length > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        篇目 {currentChapterIndex >= 0 ? currentChapterIndex + 1 : 1} / {book.chapters.length}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4 sm:space-y-5 text-foreground">
                {getHighlightedParagraphs().map((paraHtml, idx) => (
                  <p
                    key={idx}
                    className="leading-relaxed tracking-normal select-text text-justify"
                    style={{
                      textAlign: "justify",
                      textJustify: "inter-ideograph" as any,
                      textIndent: "2em",
                      lineHeight: settings.lineHeight,
                    }}
                    dangerouslySetInnerHTML={{ __html: paraHtml }}
                  />
                ))}
              </div>

              {activeNote && (
                <div className="fixed right-4 top-1/3 w-64 bg-background border border-border shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in">
                  <h4 className="text-xs font-bold text-amber-600 mb-1">读书笔记批注</h4>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap">{activeNote}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs w-full"
                    onClick={() => setActiveNote(null)}
                  >
                    关闭
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Toolbar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/70 p-3 sm:p-4 z-30">
          <div className="max-w-4xl mx-auto space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {book.chapters && book.chapters.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPrevChapter}
                    disabled={currentChapterIndex <= 0 || isLoadingChapter}
                    title="上一篇"
                    className="text-xs"
                  >
                    <SkipBack className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">上一篇</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevPage}
                  disabled={pageInfo.globalPage === 0}
                  className="text-xs"
                >
                  <ChevronLeft className="h-4 w-4 mr-0.5" />
                  上页
                </Button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant={isReading ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsReading(!isReading)}
                  className="text-xs h-8"
                >
                  {isReading ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
                  <span>{isReading ? "暂停" : "自动翻页"}</span>
                </Button>

                <Button
                  variant={readingMode === "scroll" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReadingMode(readingMode === "paged" ? "scroll" : "paged")}
                  className="text-xs h-8"
                >
                  {readingMode === "scroll" ? "滚动模式" : "分页排版"}
                </Button>

                <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {pageInfo.globalPage + 1} / {pageInfo.totalPages}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextPage}
                  disabled={pageInfo.globalPage === pageInfo.totalPages - 1 && currentChapterIndex >= (book.chapters?.length || 0) - 1}
                  className="text-xs"
                >
                  下页
                  <ChevronRight className="h-4 w-4 ml-0.5" />
                </Button>
                {book.chapters && book.chapters.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextChapter}
                    disabled={
                      currentChapterIndex >= (book.chapters?.length || 0) - 1 ||
                      isLoadingChapter
                    }
                    title="下一篇"
                    className="text-xs"
                  >
                    <span className="hidden sm:inline mr-1">下一篇</span>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Reading progress bar */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-600"
                initial={{ width: 0 }}
                animate={{
                  width: `${((pageInfo.globalPage + 1) / pageInfo.totalPages) * 100}%`,
                }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Extracted Modular Drawers & Modals */}
      <TocDrawer
        isOpen={showChapters}
        onClose={() => setShowChapters(false)}
        bookId={book.id}
        volumes={book.volumes}
        totalChapters={book.chapters?.length}
        currentChapterId={currentChapterInfo?.id}
        currentFilePath={currentChapterInfo?.filePath}
        onSelectChapter={goToChapter}
      />

      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        brightness={brightness}
        setBrightness={setBrightness}
        readingSpeed={readingSpeed}
        setReadingSpeed={setReadingSpeed}
      />

      <SearchDialog
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={(query) => readingEngine.searchText(query)}
        onSelectResult={(globalPage) => setCurrentPage(globalPage)}
      />

      <HighlightMenu
        isOpen={showHighlightMenu}
        onClose={() => setShowHighlightMenu(false)}
        position={highlightMenuPosition}
        selectedText={selectedText}
        bookTitle={book.title}
        bookAuthor={book.author}
        currentPage={pageInfo.globalPage}
        onAddHighlight={createHighlight}
        onSaveNote={handleSaveNote}
      />
    </div>
  );
}
