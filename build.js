#!/usr/bin/env node
// Single pipeline: content/*.json → CV PDF + static website, both into dist/.
//
//   node build.js            build CV and site (plus build/Jared_Galloway_CV_full.pdf
//                            with phone + references if content/private.json exists)
//   node build.js --cv       build only the CV   (dist/Jared_Galloway_CV.pdf)
//   node build.js --site     build only the site (links to the CV regardless)

const fs = require('fs');
const path = require('path');
const { ROOT, loadContent } = require('./scripts/content');
const { buildCV, CV_FILENAME, BUILD } = require('./scripts/cv');
const { buildSite } = require('./scripts/site');

const DIST = path.join(ROOT, 'dist');

async function build() {
  const args = process.argv.slice(2);
  const wantCV = !args.includes('--site');
  const wantSite = !args.includes('--cv');

  console.log('\n🔨 Building from content/...\n');

  console.log('[1/4] Cleaning dist/...');
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  console.log('[2/4] Validating content...');
  const content = loadContent();
  console.log('    ✓ All content valid');

  console.log(`[3/4] CV${wantCV ? '...' : ' (skipped)'}`);
  if (wantCV) {
    buildCV(content, DIST);
    // Full CV (phone + references) stays in build/, which is never deployed.
    if (content.private) buildCV(content, BUILD, { full: true });
  }

  console.log(`[4/4] Website${wantSite ? '...' : ' (skipped)'}`);
  if (wantSite) await buildSite(content, DIST, CV_FILENAME);

  console.log('\n✅ Build complete → dist/\n');
}

build().catch(err => {
  console.error(`\n❌ Build failed: ${err.message}\n`);
  process.exit(1);
});
