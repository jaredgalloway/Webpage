// Loads and validates content/*.json — the single source of truth for both the
// website and the CV. Any entry (or skill category/item, or social link) may
// carry `"only": "web"` or `"only": "cv"` to appear in just one output.

const fs = require('fs');
const path = require('path');
const { parseBib, authorList } = require('./bib');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');

function readJSON(file) {
  const raw = fs.readFileSync(path.join(CONTENT, file), 'utf8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON in content/${file}: ${e.message}`);
  }
}

function requireField(obj, field, file) {
  if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
    throw new Error(`content/${file}: missing required field "${field}"`);
  }
}

function requireFields(obj, fields, file) {
  for (const f of fields) requireField(obj, f, file);
}

function requireURL(url, field, file) {
  try {
    new URL(url);
  } catch {
    throw new Error(`content/${file}: invalid URL in "${field}": ${url}`);
  }
}

function requireArray(arr, what, file) {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(`content/${file}: ${what} must be a non-empty array`);
  }
}

function requireOnly(obj, file) {
  if (obj.only !== undefined && obj.only !== 'web' && obj.only !== 'cv') {
    throw new Error(`content/${file}: "only" must be "web" or "cv", got "${obj.only}"`);
  }
}

function requireDate(value, field, label, file, { allowPresent = false } = {}) {
  if (allowPresent && value === 'Present') return;
  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new Error(`content/${file}: "${label}" ${field} must be YYYY-MM${allowPresent ? ' or "Present"' : ''}`);
  }
}

function validateProfile(profile) {
  const file = 'profile.json';
  requireFields(profile, ['name', 'fullName', 'tagline', 'summary', 'email', 'website', 'photo', 'heroImage'], file);
  requireURL(profile.website, 'website', file);
  requireArray(profile.bio, '"bio"', file);
  requireArray(profile.social, '"social"', file);
  for (const s of profile.social) {
    requireFields(s, ['platform', 'url', 'label', 'handle', 'icon'], file);
    requireURL(s.url, `social[${s.platform}].url`, file);
    requireOnly(s, file);
  }
  for (const img of ['photo', 'heroImage']) {
    if (!fs.existsSync(path.join(CONTENT, profile[img]))) {
      throw new Error(`content/${file}: ${img} file not found: ${profile[img]}`);
    }
  }
}

function validateSkills(skills) {
  const file = 'skills.json';
  requireArray(skills, 'the top level', file);
  for (const cat of skills) {
    requireField(cat, 'category', file);
    requireOnly(cat, file);
    requireArray(cat.items, `category "${cat.category}" items`, file);
    for (const item of cat.items) {
      requireField(item, 'name', file);
      requireOnly(item, file);
    }
  }
}

function validateProjects(projects) {
  const file = 'projects.json';
  requireArray(projects, 'the top level', file);
  for (const p of projects) {
    requireFields(p, ['title', 'summary', 'description'], file);
    requireOnly(p, file);
    requireArray(p.tags, `project "${p.title}" tags`, file);
    requireArray(p.links, `project "${p.title}" links`, file);
    for (const link of p.links) {
      requireFields(link, ['kind', 'label', 'url'], file);
      requireURL(link.url, `links[${link.label}].url`, file);
    }
  }
}

function validateExperience(experience) {
  const file = 'experience.json';
  requireArray(experience, 'the top level', file);
  for (const e of experience) {
    requireFields(e, ['title', 'organization', 'startDate', 'endDate', 'location', 'summary'], file);
    requireOnly(e, file);
    requireDate(e.startDate, 'startDate', e.title, file);
    requireDate(e.endDate, 'endDate', e.title, file, { allowPresent: true });
    requireArray(e.highlights, `"${e.title}" highlights`, file);
    for (const h of e.highlights) requireFields(h, ['title', 'text'], file);
  }
}

function validateEducation(education) {
  const file = 'education.json';
  requireArray(education, 'the top level', file);
  for (const e of education) {
    requireFields(e, ['degree', 'field', 'institution', 'startDate', 'endDate', 'location'], file);
    requireDate(e.startDate, 'startDate', e.degree, file);
    requireDate(e.endDate, 'endDate', e.degree, file, { allowPresent: true });
  }
}

function validateSimpleList(list, fields, file) {
  requireArray(list, 'the top level', file);
  for (const item of list) requireFields(item, fields, file);
}

// content/private.json is gitignored: phone and references never reach the
// public repo or the deployed site. Returns null when absent (e.g. in CI).
function loadPrivate() {
  const file = 'private.json';
  if (!fs.existsSync(path.join(CONTENT, file))) return null;
  const priv = readJSON(file);
  requireField(priv, 'phone', file);
  validateSimpleList(priv.references, ['name', 'role', 'email'], file);
  return priv;
}

const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Resolves content/publications/selected.json against the .bib files (and
// projects.json for code/docs links) into display-ready research cards.
function loadPublications(projects) {
  const file = 'publications/selected.json';
  const selected = readJSON(file);
  requireFields(selected, ['intro', 'outro', 'scholar'], file);
  requireFields(selected.scholar, ['url', 'citations', 'hIndex'], file);
  requireURL(selected.scholar.url, 'scholar.url', file);
  requireArray(selected.papers, '"papers"', file);

  const bib = {};
  for (const name of ['first.bib', 'supporting.bib']) {
    Object.assign(bib, parseBib(fs.readFileSync(path.join(CONTENT, 'publications', name), 'utf8')));
  }

  const papers = selected.papers.map(p => {
    requireFields(p, ['key', 'label', 'role', 'summary'], file);
    const e = bib[p.key];
    if (!e) throw new Error(`content/${file}: no BibTeX entry "${p.key}"`);
    requireFields(e, ['title', 'author', 'journal', 'year'], `publications/*.bib (${p.key})`);
    const url = p.url || (e.doi ? `https://doi.org/${e.doi}` : null);
    if (!url) throw new Error(`content/${file}: "${p.key}" needs a DOI in the .bib or a "url"`);
    requireURL(url, 'url', file);

    const links = [{ label: 'Paper', url }];
    if (p.project) {
      const project = projects.find(x => x.title === p.project);
      if (!project) throw new Error(`content/${file}: "${p.key}" names unknown project "${p.project}"`);
      for (const l of project.links) if (l.kind !== 'paper') links.push({ label: l.label, url: l.url });
    }

    for (const l of p.links || []) {
      requireFields(l, ['label', 'url'], file);
      requireURL(l.url, `${p.key} links`, file);
      links.push({ label: l.label, url: l.url });
    }

    if (p.figure) {
      requireFields(p.figure, ['file', 'alt', 'credit'], file);
      if (!fs.existsSync(path.join(CONTENT, p.figure.file))) {
        throw new Error(`content/${file}: figure not found: ${p.figure.file}`);
      }
    }

    return {
      sortKey: Number(e.year) * 12 + Math.max(0, MONTH_KEYS.indexOf(String(e.month || '').slice(0, 3).toLowerCase())),
      key: p.key, label: p.label, role: p.role, summary: p.summary,
      abstract: p.abstract || null, figure: p.figure ? { ...p.figure } : null,
      title: e.title, authors: authorList(e.author),
      venue: e.journal.replace(/ preprint arXiv:.*/, ''), year: e.year, url, links
    };
  });

  papers.sort((a, b) => b.sortKey - a.sortKey);
  return { intro: selected.intro, outro: selected.outro, scholar: selected.scholar,
    count: Object.keys(bib).length, papers };
}

function loadContent() {
  const content = {
    profile: readJSON('profile.json'),
    skills: readJSON('skills.json'),
    projects: readJSON('projects.json'),
    experience: readJSON('experience.json'),
    education: readJSON('education.json'),
    achievements: readJSON('achievements.json'),
    private: loadPrivate()
  };
  validateProfile(content.profile);
  validateSkills(content.skills);
  validateProjects(content.projects);
  validateExperience(content.experience);
  validateEducation(content.education);
  validateSimpleList(content.achievements, ['title', 'text'], 'achievements.json');
  content.publications = loadPublications(content.projects);
  return content;
}

// Keep only entries meant for `target` ("web" or "cv").
function forTarget(list, target) {
  return list.filter(x => !x.only || x.only === target);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// "2024-01" → "January, 2024"; "Present" passes through.
function formatMonthYear(value) {
  if (value === 'Present') return value;
  const [year, month] = value.split('-');
  return `${MONTHS[Number(month) - 1]}, ${year}`;
}

module.exports = { ROOT, CONTENT, loadContent, forTarget, formatMonthYear };
