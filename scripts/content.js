// Loads and validates content/*.json — the single source of truth for both the
// website and the CV. Any entry (or skill category/item, or social link) may
// carry `"only": "web"` or `"only": "cv"` to appear in just one output.

const fs = require('fs');
const path = require('path');

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
  requireFields(profile, ['name', 'fullName', 'tagline', 'email', 'website', 'photo', 'heroImage'], file);
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
