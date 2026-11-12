// Renders cv/resume.tex — the short resume — from the same content as the CV
// and site. It uses the site's ("web") selection of roles and skills, each
// role's `summary` split into bullets, and the selected publications.

const fs = require('fs');
const path = require('path');
const { ROOT, forTarget } = require('./content');
const { toLaTeX, escapeLaTeX, escapeLaTeXURL } = require('./markup');
const { run, BUILD } = require('./cv');

const RESUME_FILENAME = 'Jared_Galloway_Resume.pdf';
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(value) {
  if (value === 'Present') return value;
  const [year, month] = value.split('-');
  return `${SHORT_MONTHS[Number(month) - 1]} ${year}`;
}

function href(url, inner) {
  return `\\href{${escapeLaTeXURL(url)}}{${inner}}`;
}

// Splits a summary into sentences, one bullet each.
function sentences(text) {
  return text.split(/(?<=[.!?])\s+(?=[A-Z*[])/).map(s => s.trim()).filter(Boolean);
}

function renderHeader(profile) {
  const links = forTarget(profile.social, 'cv').map(s => {
    const label = s.platform === 'website' ? new URL(s.url).hostname : s.label;
    return href(s.url, `\\${s.icon}\\ ${escapeLaTeX(label)}`);
  });
  const contact = [escapeLaTeX(profile.email), escapeLaTeX(profile.location), ...links].join(' \\quad ');
  return `\\begin{center}
{\\LARGE\\bfseries ${escapeLaTeX(profile.fullName)}}\\\\[3pt]
{\\large ${escapeLaTeX(profile.tagline)}}\\\\[5pt]
{\\small ${contact}}
\\end{center}
\\vspace{-8pt}`;
}

// The three most recent roles get every summary sentence; older ones get one.
function renderExperience(experience) {
  return forTarget(experience, 'web').map((e, i) => {
    const all = sentences(e.summary);
    const bullets = (i < 3 ? all : all.slice(0, 1)).map(s => `  \\item ${toLaTeX(s)}`).join('\n');
    return `\\role{${escapeLaTeX(e.title)}}{${escapeLaTeX(e.organization)}}{${shortDate(e.startDate)} -- ${shortDate(e.endDate)}}
\\begin{itemize}
${bullets}
\\end{itemize}`;
  }).join('\n');
}

function renderPublications(publications) {
  const items = publications.papers.map(p => {
    const me = p.authors.indexOf('Galloway');
    const shown = me === -1 ? p.authors.slice(0, 3) : p.authors.slice(0, me + 1);
    const authors = shown.map(a => a === 'Galloway' ? '\\textbf{Galloway}' : escapeLaTeX(a)).join(', ') +
      (p.authors.length > shown.length ? ', et al.' : '');
    return `  \\item ${authors} (${escapeLaTeX(p.year)}). ${href(p.url, escapeLaTeX(p.title))}. \\textit{${escapeLaTeX(p.venue)}}.`;
  }).join('\n');
  const total = `${publications.count} publications, ${publications.scholar.citations} citations, h-index ${publications.scholar.hIndex}`;
  return `${href(publications.scholar.url, escapeLaTeX(total))} (Google Scholar).
\\begin{itemize}
${items}
\\end{itemize}`;
}

function renderSkills(skills) {
  return forTarget(skills, 'web').map(cat => {
    const items = forTarget(cat.items, 'web').map(i => escapeLaTeX(i.name)).join(', ');
    return `\\textbf{${escapeLaTeX(cat.category)}:} ${items}`;
  }).join('\\\\\n');
}

function renderEducation(education) {
  return education.map(e =>
    `\\textbf{${escapeLaTeX(`${e.degree}, ${e.field}`)}}, ${escapeLaTeX(e.institution)} \\hfill {\\color{muted}${e.endDate.slice(0, 4)}}`
  ).join('\\\\\n');
}

function renderResumeTeX(content) {
  const sections = {
    header: renderHeader(content.profile),
    summary: toLaTeX(content.profile.summary),
    experience: renderExperience(content.experience),
    publications: renderPublications(content.publications),
    skills: renderSkills(content.skills),
    education: renderEducation(content.education)
  };
  const template = fs.readFileSync(path.join(ROOT, 'cv', 'resume.tex'), 'utf8');
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in sections)) throw new Error(`cv/resume.tex: unknown placeholder ${match}`);
    return sections[key];
  });
}

// Builds the resume PDF into `outDir`; returns its path.
function buildResume(content, outDir) {
  const work = path.join(BUILD, 'resume');
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  fs.writeFileSync(path.join(work, 'main.tex'), renderResumeTeX(content), 'utf8');
  run('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'main.tex'], work);

  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, RESUME_FILENAME);
  fs.copyFileSync(path.join(work, 'main.pdf'), out);
  console.log(`    ✓ ${path.relative(ROOT, out)} compiled`);
  return out;
}

module.exports = { buildResume, RESUME_FILENAME };
