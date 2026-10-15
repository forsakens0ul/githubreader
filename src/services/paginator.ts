export interface PageSlice {
  pageIndex: number; // 0-based
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface PaginatorOptions {
  containerWidth: number;
  containerHeight: number;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing?: number; // default ~0.8em
}

/**
 * Split text into pages based on dimensions and typography settings.
 * Ensures character offset stability across window resizing and font changes.
 */
export function paginateContent(
  text: string,
  options: PaginatorOptions
): PageSlice[] {
  if (!text || text.length === 0) {
    return [{ pageIndex: 0, startOffset: 0, endOffset: 0, text: '' }];
  }

  const {
    containerWidth,
    containerHeight,
    fontSize,
    lineHeight,
  } = options;

  // Safe minimum bounds
  const validWidth = Math.max(containerWidth, 260);
  const validHeight = Math.max(containerHeight, 320);

  // Line height in pixels
  const linePx = fontSize * lineHeight;
  // Available lines per page (leaving comfortable bottom margin)
  const maxLinesPerPage = Math.max(Math.floor((validHeight - 20) / linePx), 6);

  // Approximate characters per line for CJK text (average ~1em per char)
  // For mixed text or mobile, safe average factor ~0.95
  const charsPerLine = Math.max(Math.floor(validWidth / (fontSize * 0.95)), 15);

  const paragraphs = text.split('\n');
  const pages: PageSlice[] = [];

  let currentPageText: string[] = [];
  let currentPageLines = 0;
  let pageStartOffset = 0;
  let currentOffset = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraLen = para.length;
    const isLastPara = i === paragraphs.length - 1;

    // Estimate lines for this paragraph
    // Empty line counts as 0.7 line
    const paraLines = paraLen === 0 ? 0.8 : Math.max(Math.ceil(paraLen / charsPerLine), 1);

    // If paragraph is larger than an entire page, split it across multiple pages
    if (paraLines > maxLinesPerPage) {
      // First flush existing lines if any
      if (currentPageLines > 0) {
        const pageContent = currentPageText.join('\n');
        pages.push({
          pageIndex: pages.length,
          startOffset: pageStartOffset,
          endOffset: currentOffset,
          text: pageContent,
        });
        currentPageText = [];
        currentPageLines = 0;
        pageStartOffset = currentOffset;
      }

      // Chunk the huge paragraph
      const chunkSize = charsPerLine * (maxLinesPerPage - 1);
      let paraSubOffset = 0;

      while (paraSubOffset < paraLen) {
        const nextSub = Math.min(paraSubOffset + chunkSize, paraLen);
        const chunk = para.slice(paraSubOffset, nextSub);
        const chunkStart = currentOffset + paraSubOffset;
        const chunkEnd = currentOffset + nextSub;

        pages.push({
          pageIndex: pages.length,
          startOffset: chunkStart,
          endOffset: chunkEnd,
          text: chunk,
        });

        paraSubOffset = nextSub;
      }

      currentOffset += paraLen + (isLastPara ? 0 : 1);
      pageStartOffset = currentOffset;
      continue;
    }

    // Check if adding this paragraph exceeds page height
    if (currentPageLines + paraLines > maxLinesPerPage && currentPageLines > 0) {
      const pageContent = currentPageText.join('\n');
      pages.push({
        pageIndex: pages.length,
        startOffset: pageStartOffset,
        endOffset: currentOffset,
        text: pageContent,
      });

      currentPageText = [para];
      currentPageLines = paraLines + 0.3; // +0.3 paragraph spacing
      pageStartOffset = currentOffset;
    } else {
      currentPageText.push(para);
      currentPageLines += paraLines + 0.3;
    }

    currentOffset += paraLen + (isLastPara ? 0 : 1);
  }

  // Push final page
  if (currentPageText.length > 0 || pages.length === 0) {
    pages.push({
      pageIndex: pages.length,
      startOffset: pageStartOffset,
      endOffset: text.length,
      text: currentPageText.join('\n'),
    });
  }

  return pages;
}

/**
 * Given a character offset in the chapter, find the page index that contains it.
 */
export function findPageIndexByOffset(pages: PageSlice[], offset: number): number {
  if (!pages || pages.length === 0) return 0;
  if (offset <= 0) return 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (offset >= page.startOffset && offset < page.endOffset) {
      return i;
    }
  }

  return pages.length - 1;
}
