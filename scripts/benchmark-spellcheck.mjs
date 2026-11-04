/** Real Chromium timings. Run with: node scripts/benchmark-spellcheck.mjs [baseline git ref]
 * BENCH_RATES=1,4 and BENCH_CASES='[[1,300]]' can limit the run.
 * Includes synchronous layout and Markdown serialization, not paint or IME.
 * Run on an otherwise idle machine; baseline and current share a dictionary.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const temp = await mkdtemp(resolve(root, '.spell-bench-'));
const baselinePath = resolve(root, 'src/lib', `.spell-bench-${basename(temp)}.ts`);
let server, browser;
try {
  await writeFile(baselinePath, execFileSync('git', ['show', `${process.argv[2] ?? 'HEAD'}:src/lib/spellcheck-extension.ts`], { cwd: root }));
  await writeFile(resolve(temp, 'index.html'), '<div id="editor"></div><script type="module" src="./run.js"></script>');
  await writeFile(resolve(temp, 'run.js'), `
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import * as current from '/src/lib/spellcheck-extension.ts';
import * as baseline from '/src/lib/${basename(baselinePath)}';
import { ensureSpellchecker } from '/src/lib/spellcheck.ts';
import '/src/app.css';
const loadStart = performance.now();
await ensureSpellchecker();
window.dictionaryMs = performance.now() - loadStart;
const pause = ms => new Promise(r => setTimeout(r, ms));
const stats = xs => {
  xs.sort((a,b) => a-b);
  return { median: xs[Math.floor(xs.length/2)], p95: xs[Math.floor(xs.length*.95)], max: xs.at(-1) };
};
window.measure = async (variant, blocks, size, slowdown) => {
 const checker = variant === 'baseline' ? baseline : current;
 const paragraph = 'Today I wrote about my diary and walked home. '.repeat(Math.ceil(size/45)).slice(0,size);
 const editor = new Editor({ element: document.querySelector('#editor'),
   extensions: [StarterKit, Markdown.configure({html:false}), ...(variant === 'off' ? [] : [checker.Spellcheck])],
   content: {type:'doc',content:Array.from({length:blocks}, () => ({type:'paragraph',content:[{type:'text',text:paragraph}]}))},
   onUpdate: ({editor}) => { editor.storage.markdown.getMarkdown(); },
 });
 const refreshStart = performance.now();
 if (variant !== 'off') checker.refreshSpellcheck(editor);
 const refreshMs = performance.now() - refreshStart;
 // Edits alternate typo/correction at the middle of the document. Each pair
 // includes a dictionary cache miss and a hit; no warm-up samples are recorded.
 const pos = 1 + Math.floor(blocks/2)*(size+2);
 const samples = [];
 for(let i=0;i<90;i++) {
   const t = performance.now();
   editor.view.dispatch(editor.state.tr.insertText(i%2 ? 'Today' : 'Todyx', pos, pos+5));
   editor.view.dom.getBoundingClientRect();
   if(i>=10) samples.push(performance.now()-t);
   await pause(10);
 }
 // Measure DOM underline latency separately from synchronous edit cost.
 editor.view.dispatch(editor.state.tr.insertText('Today',pos,pos+5));
 await pause(230);
 const t = performance.now();
 editor.view.dispatch(editor.state.tr.insertText('Todyx',pos,pos+5));
 while (![...editor.view.dom.querySelectorAll('.spell-misspelled')].some(n => n.textContent === 'Todyx') && performance.now()-t<2000 && variant!=='off') await pause(1);
 const underlineMs = performance.now()-t;
 const removalStart = performance.now();
 editor.view.dispatch(editor.state.tr.insertText('ay',pos+3,pos+5));
 while ([...editor.view.dom.querySelectorAll('.spell-misspelled')].some(n => { const start = editor.view.posAtDOM(n,0); return start < pos+5 && start + n.textContent.length > pos; }) && performance.now()-removalStart<2000 && variant!=='off') await pause(1);
 const removalMs = performance.now()-removalStart;
 const novelSamples = [];
 for(let i=0;i<30;i++) {
   const word = 'zzq'+String.fromCharCode(97+Math.floor(i/26))+String.fromCharCode(97+i%26);
   const t = performance.now();
   editor.view.dispatch(editor.state.tr.insertText(word,pos,pos+5));
   editor.view.dom.getBoundingClientRect();
   novelSamples.push(performance.now()-t);
   await pause(10);
 }

 const pasteStart = performance.now();
 editor.view.dispatch(editor.state.tr.insertText('A new diary entry with a diery mistake. '.repeat(250),pos));
 editor.view.dom.getBoundingClientRect();
 const pasteMs = performance.now()-pasteStart;
 await pause(230);
 editor.destroy();
 return {variant,blocks,charsPerBlock:size,slowdown,refreshMs,editMs:stats(samples),underlineMs,removalMs,novelEditMs:stats(novelSamples),pasteMs};
};
window.ready = true;
`);
  server = await createServer({ root, configFile: false, server: { host: '127.0.0.1', port: 0, hmr: false, watch: { ignored: ['**/*'] } }, logLevel: 'error' });
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', error => console.error(error));
  await page.goto(`${server.resolvedUrls.local[0]}${basename(temp)}/`);
  await page.waitForFunction(() => window.ready, { timeout: 60000 });
  const results = { browser: browser.version(), baselineRef: process.argv[2] ?? 'HEAD', dictionaryMs: await page.evaluate(() => window.dictionaryMs), cases: [] };
  const cdp = await page.context().newCDPSession(page);
  for (const slowdown of (process.env.BENCH_RATES ?? '1,4').split(',').map(Number)) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: slowdown });
    for (const [blocks,size] of JSON.parse(process.env.BENCH_CASES ?? '[[1,300],[100,300],[1000,300],[1,10000],[1,100000]]')) {
      for (const variant of ['off','baseline','current']) {
        const result = await page.evaluate(args => window.measure(...args), [variant,blocks,size,slowdown]);
        results.cases.push(result);
        console.log(JSON.stringify(result));
      }
    }
  }
  const output = resolve(tmpdir(), process.env.BENCH_OUTPUT ?? 'icarus-spellcheck-benchmark.json');
  await writeFile(output, JSON.stringify(results,null,2));
  console.log('Results:', output, 'Dictionary load:', results.dictionaryMs);
} finally {
  await browser?.close();
  await server?.close();
  await rm(temp,{recursive:true,force:true});
  await rm(baselinePath,{force:true});
}
