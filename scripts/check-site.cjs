const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi)].map(m => m[1]);
assert.ok(scripts.length >= 1, 'No inline application script found');
for (let i = 0; i < scripts.length; i++) {
  new Function(scripts[i]);
}

const ids = [...html.matchAll(/\\bid=["']([^"']+)["']/g)].map(m => m[1]);
const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
assert.deepEqual([...new Set(duplicateIds)], [], 'Duplicate HTML IDs found');

const idSet = new Set(ids);
const selectors = [...html.matchAll(/\\$\\(['"]#([A-Za-z][\\w-]*)['"]\\)/g)].map(m => m[1]);
const missing = [...new Set(selectors.filter(id => !idSet.has(id)))];
assert.deepEqual(missing, [], 'Application code references missing IDs');

const chapterIds = [...new Set([...html.matchAll(/<section\\b[^>]*class=["'][^"']*\\bscene\\b[^"']*["'][^>]*data-scene=["'](\\d+)["']/gi)].map(m => Number(m[1])))].sort((a, b) => a - b);
assert.deepEqual(chapterIds, Array.from({ length: 31 }, (_, i) => i), 'Expected chapters 0 through 30');

const finalStart = html.indexOf('<section class="scene" data-scene="30"');
const viewportEnd = html.indexOf('</main>');
const navStart = html.indexOf('<nav class="bottomNav"');
assert.ok(finalStart >= 0 && finalStart < viewportEnd, 'Final chapter must be inside the scrollable viewport');
assert.ok(navStart > viewportEnd, 'Bottom navigation must be outside the scrollable viewport');
assert.match(html, /\\.scene\\[data-scene=["']30["']\\][^{]*\\{[^}]*overflow-y:auto/s, 'Final chapter must have vertical scrolling');

const app = scripts.join('\\n');
assert.match(app, /\\$\\(['"]#giftBox['"]\\)\\.addEventListener\\(['"]click['"],\\s*openGift\\)/, 'Gift must respond to click');
assert.match(app, /\\$\\(['"]#giftBox['"]\\)\\.addEventListener\\(['"]keydown['"]/, 'Gift must respond to keyboard activation');
assert.match(app, /function go\\(/, 'Chapter navigation handler missing');
assert.match(app, /touchstart[\\s\\S]*touchend/, 'Touch swipe navigation missing');
assert.match(app, /function drawStars\\(/, 'Starfield animation missing');
assert.match(app, /function microWonder\\(/, 'Micro-interaction system missing');

console.log('Static quality checks passed:', {
  chapters: chapterIds.length,
  uniqueIds: idSet.size,
  inlineScripts: scripts.length,
  selectorsChecked: selectors.length,
  finalChapterInsideViewport: true,
  finalGiftClickAndKeyboard: true
});
