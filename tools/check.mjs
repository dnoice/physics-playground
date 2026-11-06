/*
✒ Metadata
    - Title: Project Checker (digiSpace Edition - v2.0)
    - File Name: check.mjs
    - Relative Path: tools/check.mjs
    - Artifact Type: javascript
    - Version: 2.0.0
    - Date: 11/05/2026
    - Update: Thursday, November 05, 2026
    - Author: Dennis 'dendogg' Smaltz
    - A.I. Acknowledgement: Anthropic - Claude Opus 5.5
    - Signature: ︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!

✒ Changelog:
    - 2.0.0 (11/05/2026) [dendogg + Anthropic - Claude Opus 5.5] — Created
      for v2.0 on Dennis's direction: a formal stack.

✒ Description:
    Checks the project before a release: every own file carries the ✒ header
    and exact signature, shipped headers respect the changelog bound, the
    icon font subset covers every glyph, and every module parses.

✒ Key Features:
    - Header, signature and Relative Path check on every own file.
    - Changelog bound on shipped files: three entries, 40 lines,
      CHANGELOG.md pointer.
    - Material Symbols subset ⊇ glyphs used, sorted as Google Fonts
      requires; unused glyphs are noted.
    - node --check on every module.

✒ Usage Instructions:
    $ npm run check

✒ Other Important Information:
    - Dependencies: Node.js 18+ standard library only
    - Compatible platforms: Node.js 18+ on Windows, macOS and Linux
    - Exit code 1 lists every problem; 0 means the project is ready to
      publish.
---------
*/
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SIGNATURE = '︻デ═─── ✦ ✦ ✦ | Aim Twice, Shoot Once!';
// vendor/katex holds third-party files kept exactly as published; vendor/VENDOR.md is ours.
const SKIP_DIRS = new Set(['node_modules', 'katex', '.git', 'shots', '__pycache__']);
const OWN_EXT = new Set(['.js', '.mjs', '.css', '.html', '.md', '.py', '.jsonc']);
const SHIPPED_EXT = new Set(['.js', '.css', '.html']);
const problems = [], notes = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!SKIP_DIRS.has(name)) walk(p, out); } else out.push(p);
  }
  return out;
}
const files = walk(ROOT).filter(p => OWN_EXT.has(extname(p)) || ['.gitignore'].includes(relative(ROOT, p)));
const rel = p => relative(ROOT, p).split('\\').join('/');

/* 1. Every own file carries the ✒ header and the byte-exact signature. */
for (const p of files) {
  const s = readFileSync(p, 'utf8'), r = rel(p);
  if (!s.includes('✒ Metadata')) { problems.push(`${r}: no ✒ Metadata header`); continue; }
  if (!s.includes(SIGNATURE)) problems.push(`${r}: signature missing or not byte-exact`);
  if (!s.includes(`- Relative Path: ${r}`)) problems.push(`${r}: Relative Path does not match the file's location`);
  /* 2. Shipped files keep at most three changelog entries in 40 lines. */
  if (SHIPPED_EXT.has(extname(p)) && (r === 'index.html' || r.startsWith('js/') || r.startsWith('css/'))) {
    const m = s.match(/✒ Changelog:[^\n]*\n([\s\S]*?)\n\s*\n/);
    if (!m) { problems.push(`${r}: shipped header has no Changelog section`); continue; }
    const body = m[1].split('\n'), entries = body.filter(l => /^\s*- \d+\.\d+\.\d+ \(/.test(l)).length;
    if (entries > 3) problems.push(`${r}: ${entries} changelog entries in a shipped header (max 3)`);
    if (body.length > 40) problems.push(`${r}: changelog runs ${body.length} lines (max 40)`);
    if (!/Earlier entries: see CHANGELOG\.md/.test(s)) problems.push(`${r}: shipped header lacks the CHANGELOG.md pointer`);
  }
}

/* 3. The Material Symbols subset in index.html covers every glyph the code uses. */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const subsetMatch = html.match(/icon_names=([^&"]+)/);
if (!subsetMatch) problems.push('index.html: Material Symbols link has no icon_names subset');
else {
  const subset = subsetMatch[1].split(','), have = new Set(subset), used = new Set();
  if (subset.join(',') !== [...subset].sort().join(',')) problems.push('index.html: icon_names must be sorted alphabetically');
  for (const m of html.matchAll(/class="ms[^"]*"[^>]*>([a-z0-9_]+)</g)) used.add(m[1]);
  for (const p of files.filter(f => extname(f) === '.js')) {
    const s = readFileSync(p, 'utf8');
    for (const call of s.matchAll(/\bms(?:El)?\(([^)]*)\)/g)) for (const q of call[1].matchAll(/'([a-z0-9_]+)'/g)) used.add(q[1]);
  }
  const icons = readFileSync(join(ROOT, 'js/core/icons.js'), 'utf8');
  const block = name => (icons.match(new RegExp(`export const ${name} = ([\\s\\S]*?);\\n`)) || [, ''])[1];
  for (const m of block('ICON').matchAll(/:\s*'([a-z0-9_]+)'/g)) used.add(m[1]);
  for (const m of block('LAB_ICON').matchAll(/\['([a-z0-9_]+)'/g)) used.add(m[1]);
  for (const m of block('SWAPPED_GLYPHS').matchAll(/'([a-z0-9_]+)'/g)) used.add(m[1]);
  const missing = [...used].filter(g => !have.has(g)).sort(), unused = subset.filter(g => !used.has(g));
  if (missing.length) problems.push(`index.html: icon_names lacks ${missing.join(', ')}`);
  if (unused.length) notes.push(`icon_names carries glyphs no code uses: ${unused.join(', ')}`);
  notes.push(`${used.size} glyphs used, ${subset.length} in the font subset`);
}

/* 4. Every module parses as ES module source. */
for (const p of files.filter(f => ['.js', '.mjs'].includes(extname(f)))) {
  try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); }
  catch (e) { problems.push(`${rel(p)}: syntax error\n${String(e.stderr || e.message).trim()}`); }
}

for (const n of notes) console.log(`note  ${n}`);
if (problems.length) { for (const m of problems) console.log(`FAIL  ${m}`); console.log(`\n${problems.length} problem(s) in ${files.length} files.`); process.exit(1); }
console.log(`ok    ${files.length} files: headers, signature, changelog bounds, icon subset and syntax all check out.`);
