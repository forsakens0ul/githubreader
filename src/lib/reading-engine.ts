import { create } from "zustand";
import { ParsedBook } from "./book-parser";
import { Chapter } from "./store";

export interface PageInfo {
  content: string;
  chapterId: string;
  chapterTitle: string;
  pageInChapter: number;
  totalPagesInChapter: number;
  globalPage: number;
  totalPages: number;
}

// 阅读引擎类
export class ReadingEngine {
  private book: ParsedBook;
  private pages: string[] = [];
  private currentPage = 0;
  private currentChapter = 0;
  private fontSize = 18;
  private fontFamily = "Georgia, serif";
  private lineHeight = 1.5;

  constructor(book: ParsedBook) {
    this.book = book;
    this.pages = this.splitIntoPages(book.content);
  }

  // 获取总页数
  getTotalPages(): number {
    return this.pages.length;
  }

  // 获取页面信息
  getPageInfo(pageIndex: number): PageInfo {
    if (pageIndex < 0 || pageIndex >= this.pages.length) {
      return {
        content: "No content available",
        chapterId: "unknown",
        chapterTitle: "Unknown",
        pageInChapter: 0,
        totalPagesInChapter: 0,
        globalPage: pageIndex,
        totalPages: this.pages.length,
      };
    }

    // 查找当前页面所在的章节
    const chapter = this.book.chapters.find(
      (ch) => pageIndex >= ch.startPage - 1 && pageIndex < ch.endPage
    );

    if (!chapter) {
      return {
        content: this.pages[pageIndex],
        chapterId: "unknown",
        chapterTitle: "Unknown",
        pageInChapter: 0,
        totalPagesInChapter: 0,
        globalPage: pageIndex,
        totalPages: this.pages.length,
      };
    }

    return {
      content: this.pages[pageIndex],
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      pageInChapter: pageIndex - (chapter.startPage - 1),
      totalPagesInChapter: chapter.endPage - chapter.startPage + 1,
      globalPage: pageIndex,
      totalPages: this.pages.length,
    };
  }

  // 重新分页
  repaginate(options: any): void {
    this.fontSize = options.fontSize || this.fontSize;
    this.fontFamily = options.fontFamily || this.fontFamily;
    this.lineHeight = options.lineHeight || this.lineHeight;

    this.pages = this.splitIntoPages(this.book.content, options);
  }

  // 更新内容
  updateContent(content: string): void {
    if (content && content.trim() !== "") {
      this.book.content = content;
      // 重新分页
      this.pages = this.splitIntoPages(content);
      console.log(`内容已更新，新页数: ${this.pages.length}`);
    } else {
      console.error("尝试更新内容为空，操作被取消");
    }
  }

  // 获取章节
  getChapters(): Chapter[] {
    return this.book.chapters || [];
  }

  // 获取章节第一页
  getChapterFirstPage(chapterId: string): number {
    const chapter = this.book.chapters.find((ch) => ch.id === chapterId);
    if (chapter) {
      return Math.max(0, chapter.startPage - 1);
    }
    return 0;
  }

  // 搜索文本
  /**
   * 在整本书的分页内容中搜索指定关键字。
   * 返回包含上下文、全局页码以及章节标题等信息的结果，
   * 以便在 UI 层可以直接使用。
   */
  searchText(query: string): Array<{
    context: string;
    globalPage: number;
    chapterId: string;
    chapterTitle: string;
  }> {
    if (!query || !this.book.content) return [];

    const results: Array<{
      context: string;
      globalPage: number;
      chapterId: string;
      chapterTitle: string;
    }> = [];

    const queryLower = query.toLowerCase();

    for (let i = 0; i < this.pages.length; i++) {
      const pageContent = this.pages[i];

      if (pageContent.toLowerCase().includes(queryLower)) {
        // 提取匹配上下文，前后各取 20 个字符，避免过长
        const index = pageContent.toLowerCase().indexOf(queryLower);
        const start = Math.max(0, index - 20);
        const end = Math.min(pageContent.length, index + query.length + 20);
        const contextText = pageContent.substring(start, end);

        // 获取该页所在章节信息
        const pageInfo = this.getPageInfo(i);

        results.push({
          context: `...${contextText}...`,
          globalPage: i,
          chapterId: pageInfo.chapterId,
          chapterTitle: pageInfo.chapterTitle,
        });
      }
    }

    return results;
  }

  // 分页算法
  private splitIntoPages(content: string, options: any = {}): string[] {
    const finalOptions = {
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      lineHeight: this.lineHeight,
      pageWidth: 800,
      pageHeight: 600,
      padding: 40,
      ...options,
    };

    return smartPagination(content, finalOptions);
  }
}

interface ReadingEngineState {
  currentBook: ParsedBook | null;
  currentPage: number;
  currentChapter: number;
  pages: string[];

  // 阅读设置
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: "light" | "dark" | "sepia";

  // 阅读统计
  timeSpent: number;
  lastReadTimestamp: number;

  // 操作方法
  setBook: (book: ParsedBook) => void;
  setPage: (page: number) => void;
  setChapter: (chapter: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  updateReadingPreference: (
    prefs: Partial<{
      fontSize: number;
      fontFamily: string;
      lineHeight: number;
      theme: "light" | "dark" | "sepia";
    }>
  ) => void;
  getPageContent: () => string;
  splitIntoPages: (
    content: string,
    options?: Partial<{
      fontSize: number;
      fontFamily: string;
      lineHeight: number;
      pageWidth: number;
      pageHeight: number;
      padding: number;
    }>
  ) => string[];
  trackReadingTime: () => void;
  resetEngine: () => void;
}

const useReadingEngine = create<ReadingEngineState>((set, get) => ({
  currentBook: null,
  currentPage: 1,
  currentChapter: 0,
  pages: [],

  // 默认阅读设置
  fontSize: 18,
  fontFamily: "Georgia, serif",
  lineHeight: 1.5,
  theme: "light",

  // 阅读统计
  timeSpent: 0,
  lastReadTimestamp: 0,

  setBook: (book: ParsedBook) => {
    if (!book || !book.content) {
      console.error("无效的书籍内容");
      return;
    }

    const { fontSize, fontFamily, lineHeight } = get();
    const options = { fontSize, fontFamily, lineHeight };

    // 先分割全部内容为页面
    const pages = get().splitIntoPages(book.content, options);

    set({
      currentBook: book,
      currentPage: 1,
      currentChapter: 0,
      pages,
      lastReadTimestamp: Date.now(),
    });

    console.log(`书籍已加载: ${book.title}, 总页数: ${pages.length}`);
  },

  setPage: (page: number) => {
    const { pages, currentPage } = get();

    if (page < 1 || page > pages.length) {
      console.warn(`页码超出范围: ${page}, 有效范围: 1-${pages.length}`);
      return;
    }

    if (page !== currentPage) {
      set({ currentPage: page });
      get().trackReadingTime();

      // 更新当前章节
      const { currentBook } = get();
      if (currentBook) {
        const newChapter = currentBook.chapters.findIndex(
          (chapter) => page >= chapter.startPage && page <= chapter.endPage
        );

        if (newChapter !== -1 && newChapter !== get().currentChapter) {
          set({ currentChapter: newChapter });
        }
      }
    }
  },

  setChapter: (chapter: number) => {
    const { currentBook } = get();

    if (!currentBook || chapter < 0 || chapter >= currentBook.chapters.length) {
      console.warn("无效的章节索引");
      return;
    }

    const startPage = currentBook.chapters[chapter].startPage;
    set({ currentChapter: chapter });
    get().setPage(startPage);
  },

  nextPage: () => {
    const { currentPage, pages } = get();

    if (currentPage < pages.length) {
      get().setPage(currentPage + 1);
    }
  },

  prevPage: () => {
    const { currentPage } = get();

    if (currentPage > 1) {
      get().setPage(currentPage - 1);
    }
  },

  updateReadingPreference: (prefs) => {
    const currentPrefs = {
      fontSize: get().fontSize,
      fontFamily: get().fontFamily,
      lineHeight: get().lineHeight,
      theme: get().theme,
    };

    const newPrefs = { ...currentPrefs, ...prefs };
    set(newPrefs);

    // 如果文本排版相关设置有变化，需要重新分页
    if (
      prefs.fontSize !== undefined ||
      prefs.fontFamily !== undefined ||
      prefs.lineHeight !== undefined
    ) {
      const { currentBook } = get();
      if (currentBook) {
        const currentPageProgress = get().currentPage / get().pages.length;
        const pages = get().splitIntoPages(currentBook.content, newPrefs);
        const newPage = Math.max(
          1,
          Math.min(Math.round(currentPageProgress * pages.length), pages.length)
        );

        set({ pages, currentPage: newPage });
      }
    }
  },

  getPageContent: () => {
    const { pages, currentPage } = get();

    if (currentPage < 1 || currentPage > pages.length) {
      return "无内容";
    }

    return pages[currentPage - 1];
  },

  splitIntoPages: (content: string, options = {}) => {
    // 获取当前设置并合并新的选项
    const defaultOptions = {
      fontSize: get().fontSize,
      fontFamily: get().fontFamily,
      lineHeight: get().lineHeight,
      pageWidth: 800, // 默认页面宽度
      pageHeight: 600, // 默认页面高度
      padding: 40, // 内边距
    };

    const finalOptions = { ...defaultOptions, ...options };

    return smartPagination(content, finalOptions);
  },

  trackReadingTime: () => {
    const now = Date.now();
    const { lastReadTimestamp, timeSpent } = get();

    if (lastReadTimestamp > 0) {
      // 计算本次阅读时间（上限为30分钟，防止用户离开但未关闭页面）
      const sessionTime = Math.min(now - lastReadTimestamp, 30 * 60 * 1000);
      set({
        timeSpent: timeSpent + sessionTime,
        lastReadTimestamp: now,
      });
    } else {
      set({ lastReadTimestamp: now });
    }
  },

  resetEngine: () => {
    set({
      currentBook: null,
      currentPage: 1,
      currentChapter: 0,
      pages: [],
      lastReadTimestamp: 0,
    });
  },
}));

/**
 * 智能自适应正文分页排版算法
 * 核心设计：
 * 1. 绝对不向段落内硬插入 \n（彻底解决断句断行、乱截断问题）
 * 2. 保持中文/西文自然段落语义完整性，段落之间以 \n\n 区分
 * 3. 超长段落（超过约一页容量）仅在句号、问号、感叹号等自然标点处优雅跨页
 * 4. 动态根据实际渲染容器的可用宽高、字号、行距自适应计算最佳容量
 */
export function smartPagination(
  content: string,
  options: {
    fontSize: number;
    fontFamily?: string;
    lineHeight: number;
    pageWidth: number;
    pageHeight: number;
    padding: number;
  }
): string[] {
  if (!content || !content.trim()) {
    return [''];
  }

  const effectiveWidth = Math.max(280, options.pageWidth - 2 * options.padding);
  const effectiveHeight = Math.max(380, options.pageHeight - 2 * options.padding);

  // 中文字符标准排版参数：汉字宽度 + 间距约占用 1.05 * fontSize 像素
  const charsPerLine = Math.max(16, Math.floor(effectiveWidth / (options.fontSize * 1.05)));
  const lineHeightPx = options.fontSize * options.lineHeight;
  const linesPerPage = Math.max(8, Math.floor(effectiveHeight / lineHeightPx));

  // 原始文本按自然段落切分（兼容 \r\n 和多重回车）
  const rawParagraphs = content.split(/\r?\n+/);
  const paragraphs: string[] = [];

  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    // 单页大致容纳字数
    const maxPageChars = charsPerLine * linesPerPage;

    // 如果单个段落异常巨大（超过 1.2 页的容量），将其按自然标点优雅切分为句子
    if (trimmed.length > maxPageChars * 1.2) {
      const sentences = trimmed.split(/(?<=[。！？!?；;])/);
      let curr = '';
      for (const s of sentences) {
        if ((curr + s).length > maxPageChars && curr) {
          paragraphs.push(curr.trim());
          curr = s;
        } else {
          curr += s;
        }
      }
      if (curr.trim()) paragraphs.push(curr.trim());
    } else {
      paragraphs.push(trimmed);
    }
  }

  if (paragraphs.length === 0) {
    return [content.trim()];
  }

  const pages: string[] = [];
  let currentPageParagraphs: string[] = [];
  let currentUsedLines = 0;

  for (const para of paragraphs) {
    // 估算该段落在屏幕上渲染占用的视觉行数：
    // 每行约 charsPerLine 字符 + 段落间距相当于约 0.8 行
    const paraLines = Math.ceil(para.length / charsPerLine) + 0.8;

    if (currentUsedLines + paraLines > linesPerPage && currentPageParagraphs.length > 0) {
      // 当前页已满，生成新页面
      pages.push(currentPageParagraphs.join('\n\n'));
      currentPageParagraphs = [para];
      currentUsedLines = paraLines;
    } else {
      currentPageParagraphs.push(para);
      currentUsedLines += paraLines;
    }
  }

  if (currentPageParagraphs.length > 0) {
    pages.push(currentPageParagraphs.join('\n\n'));
  }

  return pages;
}


export default useReadingEngine;
