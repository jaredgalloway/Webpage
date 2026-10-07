// Renders site/template.html from content/*.json, optimizes images, minifies
// assets, and writes the static site into dist/.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const CleanCSS = require('clean-css');
const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS } = require('terser');
const { ROOT, CONTENT, forTarget } = require('./content');
const { toHTML, escapeHTML } = require('./markup');

const SRC = path.join(ROOT, 'site');

function imageBase(file) {
  return path.parse(file).name;
}

function srcset(base, format) {
  return IMAGE_WIDTHS.map(w => `images/${base}-${w}.${format} ${w}w`).join(', ');
}

// ── Template Rendering ──────────────────────────────────────────────────

function reverseString(str) {
  return str.split('').reverse().join('');
}

function renderHero(profile, cvFile) {
  const bg = imageBase(profile.heroImage);
  return `<section id="hero" class="hero">
      <picture class="hero__bg">
        <source srcset="${srcset(bg, 'avif')}" type="image/avif" sizes="100vw">
        <source srcset="${srcset(bg, 'webp')}" type="image/webp" sizes="100vw">
        <img src="images/${bg}-1280.jpeg" srcset="${srcset(bg, 'jpeg')}" sizes="100vw" alt="" class="hero__bg-img" fetchpriority="high">
      </picture>
      <div class="hero__overlay"></div>
      <div class="hero__content">
        <h1 class="hero__name">${escapeHTML(profile.name)}</h1>
        <p class="hero__tagline">${escapeHTML(profile.tagline)}</p>
        <div class="hero__actions">
          <a href="#projects" class="hero__cta">View My Work</a>
          <a href="${cvFile}" class="hero__cta hero__cta--secondary" target="_blank" rel="noopener">Download CV</a>
        </div>
      </div>
    </section>`;
}

function renderAbout(profile) {
  const me = imageBase(profile.photo);
  const paragraphs = profile.bio
    .map(p => `<p>${toHTML(p)}</p>`)
    .join('\n          ');

  return `<section id="about" class="about">
      <div class="about__inner">
        <div class="about__photo-wrap">
          <picture>
            <source srcset="${srcset(me, 'avif')}" type="image/avif">
            <source srcset="${srcset(me, 'webp')}" type="image/webp">
            <img src="images/${me}-768.jpeg" srcset="${srcset(me, 'jpeg')}" sizes="(max-width: 768px) 100vw, 400px" alt="${escapeHTML(profile.name)}, software engineer and computational biologist" class="about__photo" loading="lazy" width="400" height="400">
          </picture>
        </div>
        <div class="about__text">
          <h2>About</h2>
          ${paragraphs}
        </div>
      </div>
    </section>`;
}

function renderSkills(skills) {
  const groups = forTarget(skills, 'web').map(cat => {
    const items = forTarget(cat.items, 'web').map(item =>
      `<li class="skills__item"><span class="skills__name">${escapeHTML(item.name)}</span></li>`
    ).join('\n            ');
    return `<div class="skills__group">
          <h3>${escapeHTML(cat.category)}</h3>
          <ul class="skills__grid">
            ${items}
          </ul>
        </div>`;
  }).join('\n        ');

  return `<section id="skills" class="skills">
      <h2>Skills</h2>
      <div class="skills__categories">
        ${groups}
      </div>
    </section>`;
}

function renderProjects(projects) {
  const cards = forTarget(projects, 'web').map(p => {
    const tags = p.tags.map(t =>
      `<span class="project__tag">${escapeHTML(t)}</span>`
    ).join(' ');
    const links = p.links.map(l =>
      `<a href="${escapeHTML(l.url)}" target="_blank" rel="noopener noreferrer" class="project__link">${escapeHTML(l.label)} — ${escapeHTML(p.title)}</a>`
    ).join(' ');
    return `<article class="project__card">
          <h3 class="project__title">${escapeHTML(p.title)}</h3>
          <p class="project__desc">${toHTML(p.summary)}</p>
          <div class="project__tags">${tags}</div>
          <div class="project__links">${links}</div>
        </article>`;
  }).join('\n        ');

  return `<section id="projects" class="projects">
      <h2>Projects</h2>
      <div class="projects__grid">
        ${cards}
      </div>
    </section>`;
}

function renderExperience(experience) {
  const entries = forTarget(experience, 'web').map(e => {
    const dateRange = `${e.startDate} – ${e.endDate}`;
    return `<div class="timeline__entry">
          <div class="timeline__dot"></div>
          <div class="timeline__content">
            <h3 class="timeline__title">${escapeHTML(e.title)}</h3>
            <p class="timeline__org">${escapeHTML(e.organization)}</p>
            <time class="timeline__date">${escapeHTML(dateRange)}</time>
            <p class="timeline__desc">${toHTML(e.summary)}</p>
          </div>
        </div>`;
  }).join('\n        ');

  return `<section id="experience" class="experience">
      <h2>Experience</h2>
      <div class="timeline">
        ${entries}
      </div>
    </section>`;
}

function renderContact(profile, cvFile) {
  const reversed = reverseString(profile.email);
  const socialLinks = forTarget(profile.social, 'web').map(s =>
    `<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(s.label)}" class="contact__social-link contact__social-link--${escapeHTML(s.platform)}">${escapeHTML(s.label)}</a>`
  );
  socialLinks.push(
    `<a href="${cvFile}" target="_blank" rel="noopener" aria-label="Curriculum vitae (PDF)" class="contact__social-link contact__social-link--cv">CV (PDF)</a>`
  );

  return `<section id="contact" class="contact">
      <h2>Contact</h2>
      <div class="contact__inner">
        <p class="contact__email-wrap">
          <a href="#" class="contact__email" data-email aria-label="Send email to ${escapeHTML(profile.name.split(' ')[0])}"><span class="contact__email-text" dir="rtl">${escapeHTML(reversed)}</span></a>
          <noscript><span class="contact__email-text" dir="rtl">${escapeHTML(reversed)}</span></noscript>
        </p>
        <div class="contact__social">
          ${socialLinks.join('\n          ')}
        </div>
      </div>
    </section>`;
}

function renderSEO(profile) {
  const title = `${profile.name} — ${profile.tagline}`;
  const description = `Portfolio of ${profile.name}, ${profile.tagline}. View projects, skills, and experience.`;
  const url = profile.website;

  return {
    title,
    meta: `<meta name="description" content="${escapeHTML(description)}">
    <link rel="canonical" href="${url}">
    <meta property="og:title" content="${escapeHTML(title)}">
    <meta property="og:description" content="${escapeHTML(description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="website">
    <meta property="og:image" content="${url}images/${imageBase(profile.heroImage)}-1280.webp">`,
    jsonld: `<script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      "name": profile.name,
      "jobTitle": profile.tagline,
      "url": url,
      "sameAs": profile.social.map(s => s.url).filter(u => u !== url)
    })}
    </script>`
  };
}

function renderTemplate(content, dist, cvFile) {
  let template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
  const { profile, skills, projects, experience } = content;
  const seo = renderSEO(profile);
  const navLinks = ['Hero', 'About', 'Skills', 'Projects', 'Experience', 'Contact']
    .map(s => `<a href="#${s.toLowerCase()}" class="nav__link">${s}</a>`)
    .concat(`<a href="${cvFile}" class="nav__link" target="_blank" rel="noopener">CV</a>`)
    .join('\n          ');

  template = template
    .replace('{{title}}', escapeHTML(seo.title))
    .replace('{{seo_meta}}', seo.meta)
    .replace('{{seo_jsonld}}', seo.jsonld)
    .replace('{{hero}}', renderHero(profile, cvFile))
    .replace('{{about}}', renderAbout(profile))
    .replace('{{skills}}', renderSkills(skills))
    .replace('{{projects}}', renderProjects(projects))
    .replace('{{experience}}', renderExperience(experience))
    .replace('{{contact}}', renderContact(profile, cvFile))
    .replace('{{footer}}', `&copy; ${new Date().getFullYear()} ${escapeHTML(profile.name)}`)
    .replaceAll('{{nav_links}}', navLinks);

  fs.writeFileSync(path.join(dist, 'index.html'), template, 'utf8');
  console.log('    ✓ Template rendered');
}

// ── Image Optimization ──────────────────────────────────────────────────

const IMAGE_WIDTHS = [480, 768, 1280, 1920];

async function optimizeImage(inputPath, outDir) {
  const baseName = imageBase(inputPath);
  const metadata = await sharp(inputPath).metadata();

  for (const width of IMAGE_WIDTHS) {
    if (width > metadata.width) continue;
    const resized = sharp(inputPath).resize(width);

    await resized.clone().webp({ quality: 80 })
      .toFile(path.join(outDir, `${baseName}-${width}.webp`));
    await resized.clone().avif({ quality: 65 })
      .toFile(path.join(outDir, `${baseName}-${width}.avif`));
    await resized.clone().jpeg({ quality: 80, mozjpeg: true })
      .toFile(path.join(outDir, `${baseName}-${width}.jpeg`));
  }
}

async function optimizeImages(profile, dist) {
  const outDir = path.join(dist, 'images');
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of [profile.photo, profile.heroImage]) {
    await optimizeImage(path.join(CONTENT, file), outDir);
    console.log(`    ✓ ${file} → WebP/AVIF/JPEG at ${IMAGE_WIDTHS.join('/')}`);
  }
}

// ── Minification ────────────────────────────────────────────────────────

async function minifyAssets(dist) {
  const cssInput = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
  const cssResult = new CleanCSS({ level: 2 }).minify(cssInput);
  if (cssResult.errors.length > 0) {
    throw new Error(`CSS minification failed: ${cssResult.errors.join(', ')}`);
  }
  fs.writeFileSync(path.join(dist, 'styles.css'), cssResult.styles, 'utf8');

  const constantsJS = fs.readFileSync(path.join(SRC, 'constants.js'), 'utf8');
  const mainJS = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');
  const jsResult = await minifyJS(constantsJS + '\n' + mainJS, { compress: true, mangle: true });
  fs.writeFileSync(path.join(dist, 'main.js'), jsResult.code, 'utf8');

  const analyticsJS = fs.readFileSync(path.join(SRC, 'analytics.js'), 'utf8');
  const analyticsResult = await minifyJS(analyticsJS, { compress: true, mangle: true });
  fs.writeFileSync(path.join(dist, 'analytics.js'), analyticsResult.code, 'utf8');

  console.log('    ✓ CSS/JS minified');
}

function copyStaticFiles(profile, dist) {
  fs.writeFileSync(path.join(dist, 'CNAME'), new URL(profile.website).hostname, 'utf8');
  for (const file of ['robots.txt', 'sitemap.xml', '404.html']) {
    const srcPath = path.join(SRC, file);
    if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, path.join(dist, file));
  }
  console.log('    ✓ Static files copied');
}

async function minifyFinalHTML(dist) {
  const file = path.join(dist, 'index.html');
  const result = await minifyHTML(fs.readFileSync(file, 'utf8'), {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true
  });
  fs.writeFileSync(file, result, 'utf8');
  console.log('    ✓ HTML minified');
}

// Builds the site into `dist`; `cvFile` is the CV's path relative to the site root.
async function buildSite(content, dist, cvFile) {
  fs.mkdirSync(dist, { recursive: true });
  renderTemplate(content, dist, cvFile);
  await optimizeImages(content.profile, dist);
  await minifyAssets(dist);
  copyStaticFiles(content.profile, dist);
  await minifyFinalHTML(dist);
}

module.exports = { buildSite };
