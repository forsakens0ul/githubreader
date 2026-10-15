import MiniSearch from 'minisearch';
import type { SearchResultItem } from '../types';
import { db } from '../db';

interface SearchDoc {
  id: string; // `${filePath}`
  title: string;
  volume: string;
  content: string;
  filePath: string;
  bookId: string;
}

const intlAny = typeof Intl !== 'undefined' ? (Intl as unknown as { Segmenter?: new (lang: string, opt: { granularity: string }) => { segment: (text: string) => Iterable<{ segment: string }> } }) : null;

const segmenter = intlAny?.Segmenter ? new intlAny.Segmenter('zh-Hans', { granularity: 'word' }) : null;

function chineseTokenizer(text: string): string[] {
  if (!text) return [];
  if (segmenter) {
    const tokens: string[] = [];
    for (const seg of segmenter.segment(text)) {
      const term = seg.segment.trim().toLowerCase();
      if (term && term.length > 0 && !/^[\p{P}\p{S}\s]+$/u.test(term)) {
        tokens.push(term);
      }
    }
    return tokens;
  }
  // Fallback: regex for Chinese characters or Latin words
  return text.toLowerCase().match(/[\p{Script=Han}]|[a-z0-9_-]+/gu) || [];
}

class SearchService {
  private miniSearch: MiniSearch<SearchDoc>;
  private indexedBookId: string | null = null;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['title', 'content'],
      storeFields: ['title', 'volume', 'filePath', 'bookId'],
      tokenize: chineseTokenizer,
      searchOptions: {
        tokenize: chineseTokenizer,
        boost: { title: 3 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  /**
   * Reset index for another book
   */
  reset() {
    this.miniSearch.removeAll();
    this.indexedBookId = null;
  }

  /**
   * Index a single chapter document
   */
  async indexChapter(
    bookId: string,
    filePath: string,
    title: string,
    volume: string,
    content: string
  ) {
    const docId = filePath;
    const doc: SearchDoc = {
      id: docId,
      bookId,
      filePath,
      title,
      volume,
      content,
    };

    if (this.miniSearch.has(docId)) {
      this.miniSearch.discard(docId);
    }
    this.miniSearch.add(doc);

    // Save to indexedDocs in Dexie
    await db.indexedDocs.put({
      id: `${bookId}:${filePath}`,
      bookId,
      filePath,
      title,
      volume,
      content,
      indexedAt: Date.now(),
    });
  }

  /**
   * Load existing index from DB for a book
   */
  async loadBookIndex(bookId: string) {
    if (this.indexedBookId === bookId && this.miniSearch.documentCount > 0) {
      return;
    }
    this.reset();
    this.indexedBookId = bookId;

    const docs = await db.indexedDocs.where('bookId').equals(bookId).toArray();
    if (docs.length > 0) {
      this.miniSearch.addAll(
        docs.map((d) => ({
          id: d.filePath,
          bookId: d.bookId,
          filePath: d.filePath,
          title: d.title,
          volume: d.volume,
          content: d.content,
        }))
      );
    }
  }

  /**
   * Perform search
   */
  async search(bookId: string, query: string, maxResults = 30): Promise<SearchResultItem[]> {
    if (!query || !query.trim()) return [];
    const trimmed = query.trim();

    await this.loadBookIndex(bookId);

    const rawResults = this.miniSearch.search(trimmed);
    const results: SearchResultItem[] = [];

    for (const item of rawResults.slice(0, maxResults)) {
      // Find content snippet
      const cached = await db.indexedDocs.get(`${bookId}:${item.id}`);
      const content = cached?.content || '';

      const matchIdx = content.toLowerCase().indexOf(trimmed.toLowerCase());
      let snippet = '';
      let matchOffset = 0;

      if (matchIdx !== -1) {
        matchOffset = matchIdx;
        const start = Math.max(0, matchIdx - 35);
        const end = Math.min(content.length, matchIdx + trimmed.length + 55);
        snippet = (start > 0 ? '...' : '') + content.substring(start, end).replace(/\n+/g, ' ') + (end < content.length ? '...' : '');
      } else {
        snippet = content.substring(0, 90).replace(/\n+/g, ' ') + '...';
      }

      results.push({
        id: item.id,
        bookId,
        filePath: item.filePath,
        chapterTitle: item.title,
        volume: item.volume,
        snippet,
        matchOffset,
      });
    }

    return results;
  }

  getDocumentCount(): number {
    return this.miniSearch.documentCount;
  }
}

export const searchService = new SearchService();
