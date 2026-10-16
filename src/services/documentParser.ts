import JSZip from 'jszip';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { decodeTextBuffer } from '../lib/book-parser';

// Initialize PDF.js worker for browser environment
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Extract clean readable content from a Word (.docx) document
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    // Try markdown conversion first
    if (typeof mammoth.convertToMarkdown === 'function') {
      const result = await mammoth.convertToMarkdown({ arrayBuffer: buffer });
      if (result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    }

    // Fallback to HTML conversion
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer: buffer });
    if (htmlResult.value && htmlResult.value.trim().length > 0) {
      return convertHtmlToReadableText(htmlResult.value);
    }

    // Last resort raw text
    const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });
    return textResult.value.trim();
  } catch (err: any) {
    console.error('Failed to parse docx:', err);
    throw new Error(`Word (.docx) 文件解析失败: ${err.message || '未知错误'}`);
  }
}

/**
 * Extract clean readable content from an EPUB (.epub) ebook
 */
export async function parseEpub(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);

    // 1. Find rootfile from META-INF/container.xml
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
      throw new Error('无效的 EPUB 格式: 缺失 container.xml');
    }

    const containerXml = await containerFile.async('text');
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfileNode = containerDoc.querySelector('rootfile');
    const opfPath = rootfileNode?.getAttribute('full-path');

    if (!opfPath) {
      throw new Error('无效的 EPUB 格式: 未找到 content.opf 路径');
    }

    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      throw new Error(`未找到 OPF 文件: ${opfPath}`);
    }

    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
    const opfXml = await opfFile.async('text');
    const opfDoc = parser.parseFromString(opfXml, 'application/xml');

    // 2. Parse metadata
    const bookTitle = opfDoc.querySelector('title')?.textContent || '';
    const bookAuthor = opfDoc.querySelector('creator')?.textContent || '';

    // 3. Build manifest item map (id -> href)
    const manifestItems = new Map<string, string>();
    const itemNodes = opfDoc.querySelectorAll('manifest > item');
    itemNodes.forEach((node) => {
      const id = node.getAttribute('id');
      const href = node.getAttribute('href');
      if (id && href) {
        manifestItems.set(id, href);
      }
    });

    // 4. Follow spine order
    const spineNodes = opfDoc.querySelectorAll('spine > itemref');
    const chapterTexts: string[] = [];

    if (bookTitle) {
      let header = `# ${bookTitle}\n\n`;
      if (bookAuthor) header += `*作者: ${bookAuthor}*\n\n---\n\n`;
      chapterTexts.push(header);
    }

    for (let i = 0; i < spineNodes.length; i++) {
      const idref = spineNodes[i].getAttribute('idref');
      if (!idref) continue;
      const href = manifestItems.get(idref);
      if (!href) continue;

      // Decode URI components in case of percent encoding
      const relativePath = decodeURIComponent(href);
      const fullPath = opfDir + relativePath;

      // Normalize path (handle ../ if any)
      const normalizedPath = normalizePath(fullPath);
      const chapterFile = zip.file(normalizedPath) || zip.file(fullPath);

      if (chapterFile) {
        const xhtml = await chapterFile.async('text');
        const chapterContent = convertHtmlToReadableText(xhtml);
        if (chapterContent.trim()) {
          chapterTexts.push(chapterContent.trim());
        }
      }
    }

    if (chapterTexts.length === 0) {
      throw new Error('未能从 EPUB 中提取到可读章节文本');
    }

    return chapterTexts.join('\n\n---\n\n');
  } catch (err: any) {
    console.error('Failed to parse epub:', err);
    throw new Error(`EPUB 电子书解析失败: ${err.message || '未知错误'}`);
  }
}

/**
 * Extract clean readable content from a PDF (.pdf) document
 */
export async function parsePdf(buffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      let lastY: number | null = null;
      let pageStr = '';

      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 8) {
          pageStr += '\n\n';
        } else if (pageStr && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
          pageStr += ' ';
        }
        pageStr += item.str;
        lastY = item.transform[5];
      }

      const trimmed = pageStr.trim();
      if (trimmed) {
        pageTexts.push(`### 第 ${pageNum} 页\n\n${trimmed}`);
      }
    }

    if (pageTexts.length === 0) {
      throw new Error('未能从 PDF 中提取到文本内容（可能是纯图片扫描件）');
    }

    return pageTexts.join('\n\n---\n\n');
  } catch (err: any) {
    console.error('Failed to parse pdf:', err);
    throw new Error(`PDF 解析失败: ${err.message || '未知错误'}`);
  }
}

/**
 * Convert HTML/XHTML string to clean, readable markdown-like paragraphs
 */
function convertHtmlToReadableText(html: string): string {
  if (typeof DOMParser === 'undefined') {
    // Fallback regex strip
    return html.replace(/<[^>]+>/g, '').trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove scripts, styles, svg
  const unwanted = doc.querySelectorAll('script, style, svg, noscript');
  unwanted.forEach((el) => el.remove());

  const blocks: string[] = [];
  const body = doc.body || doc.documentElement;

  const traverse = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        blocks.push(text);
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        const text = el.textContent?.trim();
        if (text) {
          const level = '#'.repeat(parseInt(tag[1], 10));
          blocks.push(`\n\n${level} ${text}\n\n`);
        }
        return;
      }

      if (tag === 'p' || tag === 'blockquote') {
        const text = el.textContent?.trim();
        if (text) {
          blocks.push(`\n\n${text}\n\n`);
        }
        return;
      }

      if (tag === 'li') {
        const text = el.textContent?.trim();
        if (text) {
          blocks.push(`- ${text}\n`);
        }
        return;
      }

      if (tag === 'br') {
        blocks.push('\n');
        return;
      }

      if (tag === 'hr') {
        blocks.push('\n\n---\n\n');
        return;
      }

      for (let i = 0; i < el.childNodes.length; i++) {
        traverse(el.childNodes[i]);
      }
    }
  };

  traverse(body);

  return blocks
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Normalize relative path (resolving foo/bar/../baz)
 */
function normalizePath(path: string): string {
  const parts = path.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

/**
 * Main dispatcher to parse any supported document buffer based on file extension
 */
export async function parseDocumentBuffer(buffer: ArrayBuffer, filePath: string): Promise<string> {
  const lower = filePath.toLowerCase();

  if (lower.endsWith('.docx')) {
    return parseDocx(buffer);
  }

  if (lower.endsWith('.epub')) {
    return parseEpub(buffer);
  }

  if (lower.endsWith('.pdf')) {
    return parsePdf(buffer);
  }

  // Default to plain text / Markdown decoding
  return decodeTextBuffer(buffer);
}
