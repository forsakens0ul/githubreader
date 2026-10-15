export interface ParsedBook {
  id?: string;
  title: string;
  author: string;
  content: string;
  chapters: Array<{
    id: string;
    title: string;
    startPage: number;
    endPage: number;
    content: string;
    href?: string;
  }>;
  wordCount: number;
  totalPages: number;
  cover?: string;
  metadata?: any;
}

/**
 * Intelligent encoding detection and decoding for text buffers using native Web TextDecoder API.
 * 100% browser native, zero Node.js Buffer dependencies.
 */
export function decodeTextBuffer(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // 1. First attempt UTF-8
  try {
    const utf8Decoder = new TextDecoder('utf-8');
    const text = utf8Decoder.decode(bytes);

    // Detect UTF-8 replacement characters (\ufffd)
    const invalidCharCount = (text.match(/\ufffd/g) || []).length;
    const invalidRatio = text.length > 0 ? invalidCharCount / text.length : 0;

    // If UTF-8 looks clean (< 2% replacement chars and <= 5 occurrences), use it
    if (invalidRatio < 0.02 && invalidCharCount <= 5) {
      return text;
    }
  } catch {
    // UTF-8 decode failed
  }

  // 2. Try GB18030 / GBK / Big5 using browser native TextDecoder
  const encodings = ['gb18030', 'gbk', 'big5'];
  let bestText = '';
  let minInvalidCount = Infinity;

  for (const enc of encodings) {
    try {
      const decoder = new TextDecoder(enc);
      const decoded = decoder.decode(bytes);
      const invalidCount = (decoded.match(/\ufffd|\?/g) || []).length;
      if (invalidCount < minInvalidCount) {
        minInvalidCount = invalidCount;
        bestText = decoded;
      }
    } catch {
      // Continue next encoding
    }
  }

  if (bestText) {
    return bestText;
  }

  // Final fallback: standard UTF-8 lossy
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}
