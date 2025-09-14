// tools/check-public.js
// Scant je repo op public/ assets, verkeerde pad-verwijzingen en missende files.
// Run met: node tools/check-public.js

import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');

const extsToScan = ['.html', '.htm', '.js', '.ts', '.tsx', '.jsx', '.css', '.json'];
const ignoreDirs = new Set(['.git', 'node_modules', '.vercel', '.next', 'dist', 'build', '.cache', '.output']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function isTextFile(p) {
  return extsToScan.includes(path.extname(p).toLowerCase());
}

function loadText(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

// heuristiek: vind src/href/url() verwijzingen
const SRC_HREF_REGEX = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
const CSS_URL_REGEX = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
const IMPORT_REGEX = /\bimport\s+.*?from\s+["']([^"']+)["']|import\(["']([^"']+)["']\)/g;

function collectReferences(filePath, content) {
  const refs = new Set();
  let m;
  if (/\.(html?|jsx?|tsx?)$/i.test(filePath)) {
    while ((m = SRC_HREF_REGEX.exec(content))) refs.add(m[1]);
    while ((m = IMPORT_REGEX.exec(content))) refs.add(m[1] || m[2]);
  }
  if (/\.css$/i.test(filePath) || /\.html?$/i.test(filePath)) {
    while ((m = CSS_URL_REGEX.exec(content))) refs.add(m[1]);
  }
  return [...refs].filter(Boolean);
}

function normalize(p) {
  // verwijder query/hash
  return p.split('?')[0].split('#')[0];
}

// check: bestaat asset op filesystem?
function existsAsset(assetPath) {
  if (!assetPath.startsWith('/')) {
    // relative import: resolve tegen bestand
    return false; // relative is niet public-root; we checken elders
  }
  // assets in /public worden vanaf root geserveerd, dus '/x' hoort bij 'public/x'
  const fsPath = path.join(publicDir, assetPath.replace(/^\//, ''));
  return fs.existsSync(fsPath) ? fsPath : '';
}

function hasPublicPrefix(assetPath) {
  // fout patroon: '/public/foo.png' gebruikt
  return assetPath.startsWith('/public/');
}

function caseMismatch(fsPath) {
  // check of pad exact dezelfde case heeft als op disk
  const parts = fsPath.split(path.sep);
  let cur = path.isAbsolute(fsPath) ? path.sep : '';
  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i];
    cur = i === 0 && cur === path.sep ? path.join(cur, segment) : path.join(cur, segment);
    const dir = path.dirname(cur);
    const name = path.basename(cur);
    if (!fs.existsSync(cur) && fs.existsSync(dir)) {
      const listing = fs.readdirSync(dir);
      const same = listing.find((n) => n.toLowerCase() === name.toLowerCase());
      if (same) return { expected: same, got: name };
    }
  }
  return null;
}

function main() {
  const problems = {
    publicMissing: [],
    wrongPublicPrefix: [],
    missingAssets: [],
    caseIssues: [],
  };

  if (!fs.existsSync(publicDir)) {
    console.log('⚠️  Geen /public map gevonden op', publicDir);
  } else {
    const files = walk(repoRoot).filter(isTextFile);
    const publicFiles = walk(publicDir);

    console.log(`🔎 Scannen…`);
    console.log(`- Repo root: ${repoRoot}`);
    console.log(`- public: ${publicDir}`);
    console.log(`- Aantal code/text files: ${files.length}`);
    console.log(`- Aantal assets in public: ${publicFiles.length}`);

    for (const file of files) {
      const rel = path.relative(repoRoot, file);
      const content = loadText(file);
      if (!content) continue;

      // detect directe /public/ prefix in verwijzingen (fout)
      let match;
      const publicPrefixRegex = /["'](\/public\/[^"']+)["']/g;
      while ((match = publicPrefixRegex.exec(content))) {
        problems.wrongPublicPrefix.push({ file: rel, ref: match[1] });
      }

      // vind alle refs en check bestaan
      const refs = collectReferences(file, content);
      for (const r of refs) {
        const ref = normalize(r);
        if (!ref || ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('data:')) continue;

        // Alleen absolute paden checken tegen /public
        if (ref.startsWith('/')) {
          const fsPath = existsAsset(ref);
          if (!fsPath) {
            problems.missingAssets.push({ file: rel, ref });
          } else {
            const cm = caseMismatch(fsPath);
            if (cm) problems.caseIssues.push({ file: rel, ref, onDisk: cm.expected });
          }
        }
      }
    }

    if (publicFiles.length === 0) {
      problems.publicMissing.push('public/ lijkt leeg — verwacht minimaal index.html en js/css assets.');
    }
  }

  console.log('\n== RAPPORT ==');

  const out = (title, arr) => {
    console.log(`\n${title} (${arr.length})`);
    if (!arr.length) return;
    for (const it of arr) console.log(' -', JSON.stringify(it));
  };

  out('❌ Verwijzingen met foutieve "/public/" prefix', problems.wrongPublicPrefix);
  out('❌ Missende assets die via "/" verwacht worden', problems.missingAssets);
  out('⚠️ Case-sensitivity issues (Vercel is case-sensitive)', problems.caseIssues);
  out('ℹ️ Overige public-waarschuwingen', problems.publicMissing);

  // Exit code 1 als er echte problemen zijn
  if (problems.wrongPublicPrefix.length || problems.missingAssets.length) {
    process.exitCode = 1;
  }
}

main();
