import http from 'node:http';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
const compile = file => ts.transpileModule(read(file), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
const routes = {
  '/': ['text/html', '<!doctype html><html lang="en"><meta charset="utf-8"><title>Slicer browser checks</title><h1>Real Canvas export regression checks</h1><p>Local fixtures only. No AI, billing or production APIs.</p><pre></pre><script src="/jszip.min.js"></script><script type="module" src="/test.js"></script></html>'],
  '/test.js': ['text/javascript', read('tests/slicer.browser.mjs')],
  '/jszip.min.js': ['text/javascript', fs.readFileSync(require.resolve('jszip/dist/jszip.min.js'), 'utf8')],
  '/jszip.js': ['text/javascript', 'export default window.JSZip;'],
  '/grid.js': ['text/javascript', compile('src/lib/slicer/grid.ts')],
  '/sticker-processor.js': ['text/javascript', compile('src/lib/slicer/sticker-processor.ts').replace('from "jszip"', 'from "./jszip.js"').replace('from "./grid"', 'from "./grid.js"')],
};
const port = Number(process.env.SLICER_TEST_PORT || 4318);
http.createServer((req, res) => {
  const route = routes[req.url];
  if (!route) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': route[0], 'Cache-Control': 'no-store' });
  res.end(route[1]);
}).listen(port, '127.0.0.1', () => console.log(`Open http://127.0.0.1:${port} in a browser; all checks must show PASS. Ctrl+C stops the server.`));
