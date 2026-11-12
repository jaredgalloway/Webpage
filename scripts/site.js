// Renders the static site from content/*.json into dist/: a home page plus
// research, experience, and skills pages, all sharing site/template.html.
// Also optimizes images, minifies assets, and writes sitemap.xml.

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const CleanCSS = require('clean-css');
const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS } = require('terser');
const { ROOT, CONTENT, forTarget } = require('./content');
const { toHTML, escapeHTML } = require('./markup');

const SRC = path.join(ROOT, 'site');

const IMAGE_WIDTHS = [480, 768, 1280, 1920];
const FIGURE_WIDTHS = [640, 1280, 1920];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Section pages, in nav order. `file` is relative to dist/.
const SECTIONS = [
  { id: 'research', title: 'Research', file: 'research/index.html' },
  { id: 'experience', title: 'Experience', file: 'experience/index.html' },
  { id: 'skills', title: 'Skills', file: 'skills/index.html' }
];

// ── Small helpers ───────────────────────────────────────────────────────

function imageBase(file) {
  return path.parse(file).name;
}

function srcset(base, format, widths = IMAGE_WIDTHS) {
  return widths.map(w => `/images/${base}-${w}.${format} ${w}w`).join(', ');
}

// "2024-01" → "Jan 2024"; "Present" passes through.
function shortDate(value) {
  if (value === 'Present') return value;
  const [year, month] = value.split('-');
  return `${SHORT_MONTHS[Number(month) - 1]} ${year}`;
}

function dateRange(e) {
  return `${shortDate(e.startDate)} – ${shortDate(e.endDate)}`;
}

// Fills {token} placeholders in content copy; unknown tokens fail the build.
function fill(text, vars) {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    if (!(key in vars)) throw new Error(`Unknown placeholder ${match} in: ${text}`);
    return vars[key];
  });
}

// Whole years between the earliest start and the latest end of `roles`.
function yearsOfExperience(roles) {
  const months = d => {
    const [y, m] = (d === 'Present' ? new Date().toISOString().slice(0, 7) : d).split('-').map(Number);
    return y * 12 + m;
  };
  const start = Math.min(...roles.map(r => months(r.startDate)));
  const end = Math.max(...roles.map(r => months(r.endDate)));
  return Math.floor((end - start) / 12);
}

// Authors up to and including Galloway (bolded), then "et al." if more follow.
function renderAuthors(authors) {
  const me = authors.indexOf('Galloway');
  const shown = me === -1 ? authors.slice(0, 3) : authors.slice(0, me + 1);
  const html = shown.map(a => a === 'Galloway' ? `<strong>${escapeHTML(a)}</strong>` : escapeHTML(a));
  return html.join(', ') + (authors.length > shown.length ? ', et al.' : '');
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function pageTitle(cmd, title) {
  return `<header class="page-head">
        <p class="page-head__cmd">$ ${escapeHTML(cmd)}</p>
        <h1 class="page-head__title">${escapeHTML(title)}</h1>
      </header>`;
}

// ── Home ────────────────────────────────────────────────────────────────

function renderHero(profile, files) {
  const bg = imageBase(profile.heroImage);
  const sizes = '(max-width: 60em) 100vw, 60em';
  return `<section class="hero">
      <p class="hero__cmd">$ whoami</p>
      <h1 class="hero__name">${escapeHTML(profile.name)}</h1>
      <p class="hero__tagline">${escapeHTML(profile.tagline)}</p>
      <div class="hero__actions">
        <a href="/${files.resume}" class="btn btn-primary" target="_blank" rel="noopener">Résumé (PDF)</a>
        <a href="/${files.cv}" class="btn btn-primary btn-ghost" target="_blank" rel="noopener">Full CV (PDF)</a>
      </div>
      <picture class="hero__banner">
        <source srcset="${srcset(bg, 'avif')}" type="image/avif" sizes="${sizes}">
        <source srcset="${srcset(bg, 'webp')}" type="image/webp" sizes="${sizes}">
        <img src="/images/${bg}-1280.jpeg" srcset="${srcset(bg, 'jpeg')}" sizes="${sizes}" alt="" class="hero__banner-img" fetchpriority="high">
      </picture>
    </section>`;
}

function renderAbout(profile) {
  const me = imageBase(profile.photo);
  const paragraphs = profile.bio.map(p => `<p>${toHTML(p)}</p>`).join('\n          ');
  return `<section id="about" class="about">
      <h2 class="md-h2">About</h2>
      <div class="about__inner">
        <picture class="about__photo-wrap">
          <source srcset="${srcset(me, 'avif')}" type="image/avif">
          <source srcset="${srcset(me, 'webp')}" type="image/webp">
          <img src="/images/${me}-768.jpeg" srcset="${srcset(me, 'jpeg')}" sizes="(max-width: 768px) 100vw, 240px" alt="${escapeHTML(profile.name)}" class="about__photo" loading="lazy" width="240" height="240">
        </picture>
        <div class="about__text">
          ${paragraphs}
        </div>
      </div>
    </section>`;
}

// The home page's map of the site, styled as `ls -l ~`.
function renderExplore(content, files) {
  const { profile, publications, experience } = content;
  const vars = {
    publications: publications.count,
    citations: publications.scholar.citations,
    years: yearsOfExperience(forTarget(experience, 'web'))
  };
  const dir = (href, name, desc) => ({ mode: 'drwxr-xr-x', href, name, desc, external: false });
  const file = (href, name, desc) => ({ mode: '-rw-r--r--', href, name, desc, external: true });
  const rows = [
    ...SECTIONS.map(s => dir(`/${s.id}/`, `${s.id}/`, profile.explore[s.id])),
    file(`/${files.resume}`, 'resume.pdf', profile.explore.resume),
    file(`/${files.cv}`, 'cv.pdf', profile.explore.cv)
  ].map(r => `<li class="ls__row">
          <span class="ls__mode" aria-hidden="true">${r.mode}</span>
          <a class="ls__name" href="${r.href}"${r.external ? ' target="_blank" rel="noopener"' : ''}>${escapeHTML(r.name)}</a>
          <span class="ls__desc">${toHTML(fill(r.desc, vars))}</span>
        </li>`).join('\n        ');

  return `<section id="explore" class="explore">
      <h2 class="cmd-h2">ls -l ~</h2>
      <ul class="ls">
        ${rows}
      </ul>
    </section>`;
}

function renderContact(profile, files) {
  const reversed = profile.email.split('').reverse().join('');
  const links = forTarget(profile.social, 'web').map(s =>
    `<a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-default btn-ghost btn-small">${escapeHTML(s.label)}</a>`
  );
  return `<section id="contact" class="contact">
      <h2 class="md-h2">Contact</h2>
      <p class="contact__email-wrap">
        <a href="#" class="contact__email" data-email aria-label="Send email to ${escapeHTML(profile.name.split(' ')[0])}"><span class="contact__email-text" dir="rtl">${escapeHTML(reversed)}</span></a>
      </p>
      <div class="contact__social">
        ${links.join('\n        ')}
      </div>
    </section>`;
}

function renderHome(content, files) {
  return [
    renderHero(content.profile, files),
    renderAbout(content.profile),
    renderExplore(content, files),
    renderContact(content.profile, files)
  ].join('\n    ');
}

// ── Research ────────────────────────────────────────────────────────────

function renderFigure(fig) {
  const base = `fig-${imageBase(fig.file)}`;
  const widths = fig.widths;
  const largest = widths[widths.length - 1];
  return `<figure class="paper__figure">
            <a href="/images/${base}-${largest}.webp" class="paper__figure-link" target="_blank" rel="noopener" aria-label="Open full-size figure">
              <picture>
                <source srcset="${srcset(base, 'webp', widths)}" type="image/webp" sizes="(max-width: 60em) 100vw, 56em">
                <img src="/images/${base}-${widths[Math.min(1, widths.length - 1)]}.jpeg" alt="${escapeHTML(fig.alt)}" loading="lazy" width="${fig.width}" height="${fig.height}">
              </picture>
            </a>
            <figcaption>${toHTML(fig.credit)}</figcaption>
          </figure>`;
}

function renderPaper(p) {
  const links = p.links.map(l =>
    `<a href="${escapeHTML(l.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-ghost btn-small">${escapeHTML(l.label)}<span class="visually-hidden">: ${escapeHTML(p.label)}</span></a>`
  ).join('\n            ');
  const abstract = p.abstract
    ? `<details class="paper__abstract">
            <summary>Abstract</summary>
            ${p.abstract.split(/\n\n+/).map(par => `<p>${toHTML(par)}</p>`).join('\n            ')}
          </details>`
    : '';
  // Wide figures span the card; squarer ones sit beside the text on desktop.
  const layout = !p.figure ? 'paper--text' : p.figure.width / p.figure.height > 1.6 ? 'paper--wide' : 'paper--side';
  return `<article class="terminal-card paper ${layout}" id="${escapeHTML(slug(p.label))}">
        <header>${escapeHTML(p.label)}</header>
        <div>
          <h2 class="paper__title"><a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.title)}</a></h2>
          <p class="paper__cite">${renderAuthors(p.authors)} (${escapeHTML(p.year)}). <em>${escapeHTML(p.venue)}</em>.</p>
          <div class="paper__body">
          ${p.figure ? renderFigure(p.figure) : ''}
          <div class="paper__text">
          <p class="paper__role"><span class="paper__role-label">My role:</span> ${toHTML(p.role)}</p>
          <p class="paper__summary">${toHTML(p.summary)}</p>
          ${abstract}
          <div class="paper__links">
            ${links}
          </div>
          </div>
          </div>
        </div>
      </article>`;
}

function renderResearch(content, files) {
  const { publications } = content;
  const vars = {
    publications: publications.count,
    citations: publications.scholar.citations,
    hIndex: publications.scholar.hIndex,
    scholar: publications.scholar.url,
    cv: `/${files.cv}`,
    selected: publications.papers.length
  };
  return `${pageTitle('cd ~/research', 'Research')}
    <p class="page-intro">${toHTML(fill(publications.intro, vars))}</p>
    <div class="papers">
      ${publications.papers.map(renderPaper).join('\n      ')}
    </div>
    <p class="page-outro">${toHTML(fill(publications.outro, vars))}</p>`;
}

// ── Experience ──────────────────────────────────────────────────────────

function renderExperiencePage(content) {
  const roles = forTarget(content.experience, 'web').map(e => {
    const items = e.highlights.map(h =>
      `<li><strong>${toHTML(h.title)}.</strong> ${toHTML(h.text)}</li>`
    ).join('\n              ');
    return `<article class="terminal-card role" id="${slug(`${e.organization}-${e.title}`)}">
          <header><h2 class="role__title">${escapeHTML(e.title)}</h2></header>
          <div>
            <p class="role__meta"><span class="role__org">${escapeHTML(e.organization)}</span> <time class="role__date">${escapeHTML(dateRange(e))}</time></p>
            <p class="role__where">${escapeHTML([e.details, e.location].filter(Boolean).join(', '))}</p>
            <ul class="role__highlights">
              ${items}
            </ul>
          </div>
        </article>`;
  }).join('\n        ');

  const education = content.education.map(e => `<li>
          <strong>${escapeHTML(`${e.degree}, ${e.field}`)}</strong>, ${escapeHTML(e.institution)}
          <span class="muted">(${escapeHTML(dateRange(e))})</span><br>
          <span class="muted">${escapeHTML(e.details || '')}</span>
        </li>`).join('\n        ');

  const also = content.achievements.map(a =>
    `<li><strong>${toHTML(a.title)}.</strong> ${toHTML(a.text)}</li>`
  ).join('\n        ');

  return `${pageTitle('cd ~/experience', 'Experience')}
    <div class="terminal-timeline">
        ${roles}
    </div>
    <section class="sub-section">
      <h2 class="md-h2">Education</h2>
      <ul class="plain-list">
        ${education}
      </ul>
    </section>
    <section class="sub-section">
      <h2 class="md-h2">Also</h2>
      <ul class="plain-list">
        ${also}
      </ul>
    </section>`;
}

// ── Skills ──────────────────────────────────────────────────────────────

function renderSkillsPage(content) {
  // The in-depth page lists the full (CV) skill set; the resume keeps the short one.
  const groups = forTarget(content.skills, 'cv').map(cat => {
    const items = forTarget(cat.items, 'cv').map(i =>
      `<li>${escapeHTML(i.name)}${i.note ? ` <span class="muted">(${escapeHTML(i.note)})</span>` : ''}</li>`
    ).join('\n            ');
    return `<section class="skill-group">
          <h2 class="md-h2">${escapeHTML(cat.category)}</h2>
          ${cat.summary ? `<p class="skill-group__summary">${toHTML(cat.summary)}</p>` : ''}
          <ul class="skills__list">
            ${items}
          </ul>
        </section>`;
  }).join('\n        ');

  return `${pageTitle('cd ~/skills', 'Skills')}
    <div class="skill-groups">
        ${groups}
    </div>`;
}

// ── Layout ──────────────────────────────────────────────────────────────

function renderNav(active, files) {
  const sections = SECTIONS.map(s => {
    const current = s.id === active;
    return `<li><a href="/${s.id}/" class="menu-item${current ? ' active' : ''}"${current ? ' aria-current="page"' : ''}>${s.id}</a></li>`;
  });
  const pdfs = [
    `<li><a href="/${files.resume}" class="menu-item" target="_blank" rel="noopener">résumé</a></li>`,
    `<li><a href="/${files.cv}" class="menu-item" target="_blank" rel="noopener">cv</a></li>`
  ];
  return sections.concat(pdfs).join('\n              ');
}

function renderJSONLD(profile) {
  return `<script type="application/ld+json">
    ${JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profile.name,
      jobTitle: profile.tagline,
      url: profile.website,
      sameAs: profile.social.map(s => s.url).filter(u => u !== profile.website)
    })}
    </script>`;
}

// Same-site links written as absolute URLs in content (so they also work in
// the PDFs) become relative links that open in the same tab.
function localizeLinks(html, website) {
  const origin = website.replace(/\/$/, '');
  const escaped = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(
    new RegExp(`<a href="${escaped}(/[^"]*)" target="_blank" rel="noopener noreferrer">`, 'g'),
    '<a href="$1">'
  );
}

function renderPage(template, content, { path: urlPath, title, description, active, main, jsonld }, files) {
  const { profile } = content;
  const url = new URL(urlPath, profile.website).href;
  const meta = `<meta name="description" content="${escapeHTML(description)}">
    <link rel="canonical" href="${url}">
    <meta property="og:title" content="${escapeHTML(title)}">
    <meta property="og:description" content="${escapeHTML(description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="website">
    <meta property="og:image" content="${new URL(`images/${imageBase(profile.heroImage)}-1280.webp`, profile.website).href}">`;

  const html = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const values = {
      title: escapeHTML(title),
      seo_meta: meta,
      seo_jsonld: jsonld || '',
      brand: escapeHTML(new URL(profile.website).hostname),
      nav_links: renderNav(active, files),
      main,
      footer: `&copy; ${new Date().getFullYear()} ${escapeHTML(profile.name)}`
    };
    if (!(key in values)) throw new Error(`site/template.html: unknown placeholder ${match}`);
    return values[key];
  });
  return localizeLinks(html, profile.website);
}

function renderPages(content, dist, files) {
  const template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
  const { profile } = content;
  const pages = [
    {
      file: 'index.html', path: '/', active: null,
      title: `${profile.name} — ${profile.tagline}`,
      description: profile.summary,
      main: renderHome(content, files),
      jsonld: renderJSONLD(profile)
    },
    {
      file: 'research/index.html', path: '/research/', active: 'research',
      title: `Research — ${profile.name}`,
      description: `Selected publications by ${profile.name}, with figures, code, and documentation.`,
      main: renderResearch(content, files)
    },
    {
      file: 'experience/index.html', path: '/experience/', active: 'experience',
      title: `Experience — ${profile.name}`,
      description: `${profile.name}'s roles, highlights, and education.`,
      main: renderExperiencePage(content)
    },
    {
      file: 'skills/index.html', path: '/skills/', active: 'skills',
      title: `Skills — ${profile.name}`,
      description: `${profile.name}'s technical skills and where they've been applied.`,
      main: renderSkillsPage(content)
    }
  ];

  for (const page of pages) {
    const out = path.join(dist, page.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, renderPage(template, content, page, files), 'utf8');
  }

  const urls = pages.map(p => `  <url>
    <loc>${new URL(p.path, profile.website).href}</loc>
    <changefreq>monthly</changefreq>
  </url>`).join('\n');
  fs.writeFileSync(path.join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, 'utf8');

  console.log(`    ✓ ${pages.length} pages rendered`);
  return pages.map(p => p.file);
}

// ── Images ──────────────────────────────────────────────────────────────

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

// Paper figures are mostly line art and text: no AVIF (it smears small type),
// higher quality, and a white background behind any transparency.
async function optimizeFigure(fig, outDir) {
  const input = path.join(CONTENT, fig.file);
  const base = `fig-${imageBase(fig.file)}`;
  const { width } = await sharp(input).metadata();
  for (const w of fig.widths) {
    const resized = sharp(input).flatten({ background: '#ffffff' }).resize(Math.min(w, width));
    await resized.clone().webp({ quality: 88 }).toFile(path.join(outDir, `${base}-${w}.webp`));
    await resized.clone().jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(outDir, `${base}-${w}.jpeg`));
  }
}

// Fills in each figure's output widths and intrinsic size before rendering.
async function measureFigures(publications) {
  for (const p of publications.papers) {
    if (!p.figure) continue;
    const { width, height } = await sharp(path.join(CONTENT, p.figure.file)).metadata();
    const widths = FIGURE_WIDTHS.filter(w => w <= width);
    p.figure.widths = widths.length ? widths : [width];
    p.figure.width = width;
    p.figure.height = height;
  }
}

async function optimizeImages(content, dist) {
  const outDir = path.join(dist, 'images');
  fs.mkdirSync(outDir, { recursive: true });
  const { profile, publications } = content;
  for (const file of [profile.photo, profile.heroImage]) {
    await optimizeImage(path.join(CONTENT, file), outDir);
  }
  const figures = publications.papers.filter(p => p.figure).map(p => p.figure);
  for (const fig of figures) await optimizeFigure(fig, outDir);
  console.log(`    ✓ Images optimized (2 photos, ${figures.length} figures)`);
}

// ── Assets ──────────────────────────────────────────────────────────────

async function minifyAssets(dist) {
  const cssInput = fs.readFileSync(require.resolve('terminal.css/dist/terminal.css'), 'utf8') +
    '\n' + fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
  const cssResult = new CleanCSS({ level: 2 }).minify(cssInput);
  if (cssResult.errors.length > 0) {
    throw new Error(`CSS minification failed: ${cssResult.errors.join(', ')}`);
  }
  fs.writeFileSync(path.join(dist, 'styles.css'), cssResult.styles, 'utf8');

  for (const file of ['main.js', 'analytics.js']) {
    const sources = file === 'main.js' ? ['constants.js', 'main.js'] : [file];
    const js = sources.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
    const result = await minifyJS(js, { compress: true, mangle: true });
    fs.writeFileSync(path.join(dist, file), result.code, 'utf8');
  }
  console.log('    ✓ CSS/JS minified');
}

function copyStaticFiles(profile, dist) {
  fs.writeFileSync(path.join(dist, 'CNAME'), new URL(profile.website).hostname, 'utf8');
  for (const file of ['robots.txt', '404.html']) {
    fs.copyFileSync(path.join(SRC, file), path.join(dist, file));
  }
  console.log('    ✓ Static files copied');
}

async function minifyPages(dist, files) {
  for (const f of files) {
    const file = path.join(dist, f);
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
  }
  console.log('    ✓ HTML minified');
}

// Builds the site into `dist`. `files` maps { cv, resume } to PDF paths
// relative to the site root.
async function buildSite(content, dist, files) {
  fs.mkdirSync(dist, { recursive: true });
  await measureFigures(content.publications);
  const pages = renderPages(content, dist, files);
  await optimizeImages(content, dist);
  await minifyAssets(dist);
  copyStaticFiles(content.profile, dist);
  await minifyPages(dist, pages);
}

module.exports = { buildSite };
