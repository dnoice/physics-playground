/*
✒ Metadata
    - Title: Pages Site Stager (digiSpace Edition - v2.2)
    - File Name: site.mjs
    - Relative Path: tools/site.mjs
    - Artifact Type: javascript
    - Version: 2.2.0
    - Date: 11/09/2026
    - Update: Monday, November 09, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.2.0 (11/09/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      on Dennis's direction to harden the GitHub Pages build: stages the
      runtime files and proves the staged site is complete.

✒ Description:
    Copies the files the browser actually loads into _site/, byte for byte,
    then walks every reference from index.html through the stylesheets and
    modules to prove the staged site is complete. The Pages workflow
    deploys exactly this folder, so a missing file, a case slip or a
    root-absolute path fails here instead of on the live site.

✒ Key Features:
    - Stages index.html, LICENSE, css/, js/ and vendor/katex/ only; tests,
      tools, docs and package files never reach the public site.
    - Follows link and script tags, the import map, CSS url() and @import,
      and static, re-exported and dynamic module imports.
    - Exact-case resolution, so a reference that only works on a
      case-insensitive disk fails here as it would on GitHub Pages.
    - Rejects root-absolute paths, which break under a project path such
      as /physics-playground/.
    - Import map entries must be https and pinned to an exact version.
    - External origins are limited to Google Fonts and jsDelivr, the hosts
      vendor/VENDOR.md documents.
    - KaTeX's .woff and .ttf fallbacks may be absent when the .woff2 face
      they back up is present, as vendor/VENDOR.md records.
    - Staged modules nothing reaches are listed as notes.

✒ Usage Instructions:
    $ npm run site
    Stages into _site/ (ignored by Git, ESLint and the checker). An
    optional argument stages elsewhere: node tools/site.mjs /tmp/pp-site.
    Serve the result to try it as Pages will: node tools/serve.mjs serves
    the project root, so use any static server pointed at _site/.

✒ Other Important Information:
    - Dependencies: Node.js 20.19+ standard library only
    - Compatible platforms: Node.js 20.19+ on Windows, macOS and Linux
    - Exit code 1 lists every problem; 0 means _site/ is ready to deploy.
---------
*/
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = resolve(ROOT, process.argv[2] || '_site');
const STAGE = ['index.html', 'LICENSE', 'css', 'js', 'vendor/katex'];
const HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net']);
const problems = [], notes = [];

/* 1. Stage: a clean copy of the runtime files, nothing else. */
if (OUT === ROOT || ROOT.startsWith(OUT + sep) || STAGE.some(s => OUT === join(ROOT, s) || OUT.startsWith(join(ROOT, s) + sep))) {
  console.log(`FAIL  refusing to stage into ${OUT}: it would overwrite the project`);
  process.exit(1);
}
rmSync(OUT, { recursive: true, force: true });
for (const s of STAGE) {
  mkdirSync(dirname(join(OUT, s)), { recursive: true });
  cpSync(join(ROOT, s), join(OUT, s), { recursive: true });
}

/* 2. Exact-case lookup inside the staged tree, as a case-sensitive host sees it. */
const listing = new Map();
const names = dir => { if (!listing.has(dir)) { try { listing.set(dir, new Set(readdirSync(dir))); } catch { listing.set(dir, new Set()); } } return listing.get(dir); };
function exists(abs) {
  let dir = OUT;
  for (const part of relative(OUT, abs).split(sep)) { if (!names(dir).has(part)) return false; dir = join(dir, part); }
  return statSync(dir).isFile();
}
const rel = abs => relative(OUT, abs).split(sep).join('/');

/* 3. References a file makes, by kind. Comments are dropped first so header examples never count. */
let importMap = {};
function refsOf(file, text) {
  const ext = extname(file), out = [];
  if (ext === '.html') {
    for (const m of text.matchAll(/<(?:link|script|img|source)\b[^>]*?\b(?:href|src)="([^"]+)"/g)) out.push(m[1]);
    const map = text.match(/<script type="importmap">([\s\S]*?)<\/script>/);
    if (map) {
      try { importMap = JSON.parse(map[1]).imports || {}; } catch (e) { problems.push(`${rel(file)}: import map is not valid JSON (${e.message})`); }
      for (const [key, url] of Object.entries(importMap)) {
        if (!/^https:\/\//.test(url)) problems.push(`${rel(file)}: import map "${key}" is not https: ${url}`);
        if (!/@\d+\.\d+\.\d+\//.test(url)) problems.push(`${rel(file)}: import map "${key}" is not pinned to an exact version: ${url}`);
        out.push(url);
      }
    }
  } else if (ext === '.css') {
    const css = text.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) out.push(m[2]);
    for (const m of css.matchAll(/@import\s+['"]([^'"]+)['"]/g)) out.push(m[1]);
  } else if (ext === '.js') {
    const js = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of js.matchAll(/(?:^|[\s;])(?:import|export)\s*(?:[\w*{}\s,$]+?\s*from\s*)?['"]([^'"]+)['"]/gm)) out.push(m[1]);
    for (const m of js.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1]);
    if (/\bimport\(\s*`/.test(js)) notes.push(`${rel(file)}: a template-literal import() cannot be followed; its targets are staged but unchecked`);
  }
  return out;
}

/* 4. Walk from index.html. */
const reached = new Set(), queue = [join(OUT, 'index.html')];
if (!/^<!DOCTYPE html>/i.test(readFileSync(queue[0], 'utf8'))) problems.push('index.html: must begin with <!DOCTYPE html> (the artifact host rejects it otherwise)');
while (queue.length) {
  const file = queue.shift();
  if (reached.has(file)) continue;
  reached.add(file);
  if (!['.html', '.css', '.js'].includes(extname(file))) continue;
  for (const raw of refsOf(file, readFileSync(file, 'utf8'))) {
    const spec = raw.replace(/[?#].*$/, '');
    if (!spec || /^(data|blob|mailto):/.test(raw)) continue;
    if (/^https?:\/\//.test(spec) || spec.startsWith('//')) {
      const host = new URL(spec, 'https://x/').host;
      if (!HOSTS.has(host)) problems.push(`${rel(file)}: loads from ${host}, which vendor/VENDOR.md does not list`);
      continue;
    }
    if (spec.startsWith('/')) { problems.push(`${rel(file)}: root-absolute "${spec}" breaks under a Pages project path; make it relative`); continue; }
    if (extname(file) === '.js' && !/^\.\.?\//.test(spec)) {
      const hit = Object.keys(importMap).some(k => (k.endsWith('/') ? spec.startsWith(k) : spec === k));
      if (!hit) problems.push(`${rel(file)}: bare specifier "${spec}" is not in the import map`);
      continue;
    }
    const target = resolve(dirname(file), spec);
    if (!target.startsWith(OUT + sep)) { problems.push(`${rel(file)}: "${spec}" points outside the site`); continue; }
    if (exists(target)) { queue.push(target); continue; }
    const face = target.replace(/\.(woff|ttf)$/, '.woff2');
    if (face !== target && exists(face)) continue; // An unshipped KaTeX fallback behind a shipped .woff2 face.
    problems.push(`${rel(file)}: "${spec}" does not resolve to a staged file (check the path and its letter case)`);
  }
}

/* 5. Report. */
const all = [];
const walk = dir => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p); else all.push(p); } };
walk(OUT);
const unreached = all.filter(p => ['.js', '.css'].includes(extname(p)) && !reached.has(p)).map(rel);
if (unreached.length) notes.push(`staged but never loaded: ${unreached.join(', ')}`);
const bytes = all.reduce((n, p) => n + statSync(p).size, 0);
for (const n of notes) console.log(`note  ${n}`);
if (problems.length) { for (const m of problems) console.log(`FAIL  ${m}`); console.log(`\n${problems.length} problem(s) in the staged site.`); process.exit(1); }
console.log(`ok    ${relative(ROOT, OUT) || OUT}: ${all.length} files staged (${(bytes / 1048576).toFixed(1)} MB); ${reached.size} reached from index.html and every reference resolves.`);
