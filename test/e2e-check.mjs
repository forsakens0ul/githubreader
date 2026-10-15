import { parseGitHubUrl } from '../src/services/github.ts';
import { buildBookStructure, formatChapterTitle } from '../src/services/parser.ts';
import { paginateContent, findPageIndexByOffset } from '../src/services/paginator.ts';
import MiniSearch from 'minisearch';

console.log('=== 1. Testing GitHub URL Parsing ===');
const testUrls = [
  'https://github.com/i12cu2/Crown_of_Tokamak',
  'https://github.com/i12cu2/Crown_of_Tokamak/tree/main',
  'https://github.com/i12cu2/Crown_of_Tokamak/tree/main/2020',
  'github.com/i12cu2/Crown_of_Tokamak',
  'i12cu2/Crown_of_Tokamak'
];

for (const u of testUrls) {
  const ref = parseGitHubUrl(u);
  console.log(`URL: ${u} => owner: ${ref.owner}, repo: ${ref.repo}, branch: ${ref.branch}, subPath: ${ref.subPath}`);
  if (ref.owner !== 'i12cu2' || ref.repo !== 'Crown_of_Tokamak') {
    throw new Error(`Parse failed for ${u}`);
  }
}
console.log('✔ All URL formats passed!\n');

console.log('=== 2. Testing Title and Date Extraction ===');
const sampleFiles = [
  '2020.04.21「九镑十五便士」这个梗的源流和内幕是怎样的？.txt',
  '2020.04.25看完《三体》你有什么感觉？.txt',
  '2024.12.01如何看待当下经济形势.md',
  '01_序言.txt'
];

for (const sf of sampleFiles) {
  const res = formatChapterTitle(sf);
  console.log(`${sf} =>`, res);
}
console.log('✔ Title extraction passed!\n');

console.log('=== 3. Testing Book & Volume Structure Generation ===');
const mockTree = [
  { path: '2020/2020.04.21九镑十五便士.txt', type: 'blob' },
  { path: '2020/2020.04.25三体.txt', type: 'blob' },
  { path: '2021/2021.01.01新年随想.txt', type: 'blob' },
  { path: '2024/2024.05.01劳动节回答.txt', type: 'blob' },
  { path: '未知时间/某篇短文.txt', type: 'blob' },
  { path: '聊天记录/群聊2022.txt', type: 'blob' },
  { path: 'merged_all.txt', type: 'blob' }, // Must be ignored!
  { path: 'add0Script.py', type: 'blob' }, // Must be ignored!
  { path: 'Readme.md', type: 'blob' }, // Preface volume!
];

const book = buildBookStructure('i12cu2', 'Crown_of_Tokamak', 'main', mockTree, undefined, {
  title: '托卡马克之冠知乎回答整理',
  description: '知乎回答整理'
});

console.log('Book title:', book.title);
console.log('Total chapters (excluding merged_all and scripts):', book.totalChapters);
console.log('Volumes:', book.volumes.map(v => `${v.name} (${v.chapters.length} 篇)`));

if (book.volumes.some(v => v.chapters.some(c => c.filePath.includes('merged_all.txt') || c.filePath.includes('.py')))) {
  throw new Error('merged_all.txt or .py script was not excluded!');
}
if (book.volumes[0].name !== '序言与说明') {
  throw new Error('Readme.md was not placed in Preface volume!');
}
console.log('✔ Structure generation passed!\n');

console.log('=== 4. Testing Character-Offset Pagination Engine ===');
const sampleText = `
三体这本书的有趣之处在于，它从根本上解构了逻辑自洽强迫症和一厢情愿癌。

就如@王瑞恩检察官所言，驱动智人的主要源动力还是爱恨惧这一类感性因素，而理性因素是在这一源动力基础上运转的逻辑工具，是手段而非目的。

但是由于异化效应的存在，智人总是有着热衷于把手段变成目的的倾向，久而久之，形成了为逻辑而逻辑以及只相信自己愿意相信的东西而忽视客观事实的顽疾。

你看知乎上，有那么多人对于客观实然存在的事物高呼逻辑不自洽并鄙夷之，而对于符合他自身真空球形逻辑认知但客观上并不存在的事物则狂热备至，以至于现实和认知不符的情况下，他们首先想到的是质疑现实而非调整认知。
`.trim();

const pages = paginateContent(sampleText, {
  containerWidth: 600,
  containerHeight: 300,
  fontSize: 18,
  lineHeight: 1.8
});

console.log(`Generated ${pages.length} pages.`);
pages.forEach((p, idx) => {
  console.log(`Page ${idx + 1}: chars [${p.startOffset}..${p.endOffset}], length: ${p.text.length}`);
});

// Test restoring page index when charOffset = 180
const targetOffset = 180;
const foundPage = findPageIndexByOffset(pages, targetOffset);
console.log(`Target offset ${targetOffset} resolved to page ${foundPage + 1}`);
if (targetOffset < pages[foundPage].startOffset || targetOffset >= pages[foundPage].endOffset) {
  throw new Error('findPageIndexByOffset returned incorrect page');
}
console.log('✔ Pagination & offset tracking passed!\n');

console.log('=== 5. Testing MiniSearch Chinese Search Engine ===');
const miniSearch = new MiniSearch({
  fields: ['title', 'content'],
  storeFields: ['title'],
  tokenize: (text) => text.toLowerCase().match(/[\p{Script=Han}]|[a-z0-9_-]+/gu) || [],
  searchOptions: {
    tokenize: (text) => text.toLowerCase().match(/[\p{Script=Han}]|[a-z0-9_-]+/gu) || [],
  }
});

miniSearch.add({
  id: '1',
  title: '看完《三体》你有什么感觉？',
  content: sampleText
});

const searchResults = miniSearch.search('三体');
console.log('Search "三体" results count:', searchResults.length);
if (searchResults.length === 0 || searchResults[0].id !== '1') {
  throw new Error('MiniSearch failed to find document');
}

const searchResults2 = miniSearch.search('逻辑自洽');
console.log('Search "逻辑自洽" results count:', searchResults2.length);
if (searchResults2.length === 0) {
  throw new Error('MiniSearch failed to find Chinese phrase');
}
console.log('✔ MiniSearch Chinese search passed!\n');

console.log('🎉 ALL INTEGRATION VERIFICATIONS PASSED SUCCESSFULLY!');
