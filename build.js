#!/usr/bin/env node
// Single pipeline: content/*.json → CV PDF + static website, both into dist/.
//
//   node build.js            build CV, resume, and site (plus build/Jared_Galloway_CV_full.pdf
//                            with phone + references if content/private.json exists)
//   node build.js --cv       build only the CV and resume PDFs
//   node build.js --site     build only the site (links to the PDFs regardless)

const fs = require('fs');
const path = require('path');
const { ROOT, loadContent } = require('./scripts/content');
const { buildCV, CV_FILENAME, BUILD } = require('./scripts/cv');
const { buildResume, RESUME_FILENAME } = require('./scripts/resume');
const { buildSite } = require('./scripts/site');

const DIST = path.join(ROOT, 'dist');

async function build() {
  const args = process.argv.slice(2);
  const wantCV = !args.includes('--site');
  const wantSite = !args.includes('--cv');

  console.log('\n🔨 Building from content/...\n');

  // A partial build keeps the other half's output: --site keeps the PDFs,
  // --cv keeps the site.
  console.log('[1/4] Cleaning dist/...');
  fs.mkdirSync(DIST, { recursive: true });
  for (const entry of fs.readdirSync(DIST)) {
    const isPDF = entry.endsWith('.pdf');
    if ((wantCV && isPDF) || (wantSite && !isPDF)) {
      fs.rmSync(path.join(DIST, entry), { recursive: true, force: true });
    }
  }

  console.log('[2/4] Validating content...');
  const content = loadContent();
  console.log('    ✓ All content valid');

  console.log(`[3/4] CV + resume${wantCV ? '...' : ' (skipped)'}`);
  if (wantCV) {
    buildCV(content, DIST);
    buildResume(content, DIST);
    // Full CV (phone + references) stays in build/, which is never deployed.
    if (content.private) buildCV(content, BUILD, { full: true });
  }

  console.log(`[4/4] Website${wantSite ? '...' : ' (skipped)'}`);
  if (wantSite) await buildSite(content, DIST, { cv: CV_FILENAME, resume: RESUME_FILENAME });

  console.log('\n✅ Build complete → dist/\n');
}

build().catch(err => {
  console.error(`\n❌ Build failed: ${err.message}\n`);
  process.exit(1);
});
