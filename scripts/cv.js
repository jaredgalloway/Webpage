// Renders cv/template.tex from content/*.json and compiles it to a PDF.
//
// The CV uses `multibib` with two bibliographies declared via \newcites{prim}
// and \newcites{supp}. multibib writes their citation data to prim.aux and
// supp.aux (NOT first.aux / supporting.aux), so bibtex runs against those —
// hence the pdflatex → bibtex prim → bibtex supp → pdflatex → pdflatex sequence.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT, CONTENT, forTarget, formatMonthYear } = require('./content');
const { toLaTeX, escapeLaTeX, escapeLaTeXURL } = require('./markup');

const CV_SRC = path.join(ROOT, 'cv');
const BUILD = path.join(ROOT, 'build');
const CV_FILENAME = 'Jared_Galloway_CV.pdf';
const FULL_CV_FILENAME = 'Jared_Galloway_CV_full.pdf';

const LINK_ICONS = { docs: 'faGlobe', paper: 'faNewspaper', code: 'faCode' };

function href(url, inner) {
  return `\\href{${escapeLaTeXURL(url)}}{${inner}}`;
}

// `phone` is only passed for the private, local-only full CV.
function renderHeader(profile, phone) {
  const social = forTarget(profile.social, 'cv');
  const cols = social.map(() => '>{\\centering\\arraybackslash}X').join(' ');
  const row = cell => social.map(cell).join(' &\n    ');
  const table = cells => `\\begin{center}
\\begin{tabularx}{0.83\\textwidth}{${cols}}
    ${cells}
\\end{tabularx}
\\end{center}`;

  const contact = [profile.email, phone, profile.location].filter(Boolean).map(escapeLaTeX);
  const left = [`\\textbf{\\Large ${escapeLaTeX(profile.fullName)}}`, '\\textit{Curriculum vitae}'];
  const rows = contact.map((c, i) => `  ${left[i] || ''} & ${c} \\\\`).join('\n');

  return `\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
${rows}
\\end{tabular*}

${table(row(s => href(s.url, `\\${s.icon}`)))}

\\vspace{-19pt}

${table(row(s => href(s.url, `\\small{${escapeLaTeX(s.handle)}}`)))}`;
}

function renderStatement(profile) {
  return `\\personalstatement{\n${profile.bio.map(toLaTeX).join(' ')}\n}`;
}

function subheading(title, org, start, end, location, details) {
  return `    \\resumeSubheading
        {${title}}
        {${org}}
        {${formatMonthYear(start)}}
        {${formatMonthYear(end)}}
        {${location}}
        {${details}}`;
}

function list(items) {
  return `\\resumeSubHeadingListStart\n${items.join('\n')}\n\\resumeSubHeadingListEnd`;
}

function renderEducation(education) {
  return list(education.map(e => subheading(
    escapeLaTeX(`${e.degree} · ${e.field}`), escapeLaTeX(e.institution),
    e.startDate, e.endDate, escapeLaTeX(e.location), escapeLaTeX(e.details || '')
  )));
}

function renderSkills(skills) {
  return list(forTarget(skills, 'cv').map(cat => {
    const items = forTarget(cat.items, 'cv')
      .map(i => escapeLaTeX(i.note ? `${i.name} (${i.note})` : i.name))
      .join(', ');
    return `    \\resumeSubItem{${escapeLaTeX(cat.category)}}{${items}}`;
  }));
}

function renderExperience(experience) {
  return list(forTarget(experience, 'cv').map(e => {
    const items = e.highlights
      .map(h => `            \\resumeItem{${toLaTeX(h.title)}}\n                {${toLaTeX(h.text)}}`)
      .join('\n');
    return `${e.cvPageBreakBefore ? '    \\newpage\n' : ''}${subheading(
      escapeLaTeX(e.title), escapeLaTeX(e.organization), e.startDate, e.endDate,
      escapeLaTeX(e.location), escapeLaTeX(e.details || '')
    )}
        \\resumeItemListStart
${items}
        \\resumeItemListEnd`;
  }));
}

function renderProjects(projects) {
  return list(forTarget(projects, 'cv').map(p => {
    const icons = p.links
      .map(l => `\\oldhref{${escapeLaTeXURL(l.url)}}{\\${LINK_ICONS[l.kind] || 'faLink'}}`)
      .join('\n        ');
    return `    \\resumeSoftwareSubheading{${escapeLaTeX(p.title)}}
        {
        ${icons}
        }
        {${toLaTeX(p.description)}}`;
  }));
}

function renderReferences(references) {
  if (!references) {
    return '\\section{Professional References}\n\\personalstatement{Available upon request.}';
  }
  return `\\section{Professional References}\n${list(references.map(r =>
    `    \\resumeSubItem{${escapeLaTeX(r.name)}}{${escapeLaTeX(`${r.role} - ${r.email}`)}}`
  ))}`;
}

function renderAchievements(achievements) {
  return list(achievements.map(a =>
    `    \\resumeSubItem{${toLaTeX(a.title)}}{${toLaTeX(a.text)}}`
  ));
}

function renderTeX(content, { full = false } = {}) {
  const priv = full ? content.private : null;
  const sections = {
    header: renderHeader(content.profile, priv && priv.phone),
    statement: renderStatement(content.profile),
    education: renderEducation(content.education),
    skills: renderSkills(content.skills),
    experience: renderExperience(content.experience),
    projects: renderProjects(content.projects),
    references: renderReferences(priv && priv.references),
    achievements: renderAchievements(content.achievements)
  };
  const template = fs.readFileSync(path.join(CV_SRC, 'template.tex'), 'utf8');
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in sections)) throw new Error(`cv/template.tex: unknown placeholder ${match}`);
    return sections[key];
  });
}

function run(cmd, args, work) {
  try {
    execFileSync(cmd, args, { cwd: work, stdio: 'pipe' });
  } catch (e) {
    const log = path.join(work, 'main.log');
    const tail = fs.existsSync(log)
      ? fs.readFileSync(log, 'utf8').split('\n').slice(-30).join('\n')
      : String(e.stdout || e.message);
    throw new Error(`${cmd} ${args.join(' ')} failed (see ${path.relative(ROOT, work)}/):\n${tail}`);
  }
}

// Builds the CV into `outDir`; returns the output PDF path. `full` adds the
// phone number and references from content/private.json — never deploy it.
function buildCV(content, outDir, { full = false } = {}) {
  const work = path.join(BUILD, full ? 'cv-full' : 'cv');
  const filename = full ? FULL_CV_FILENAME : CV_FILENAME;
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });

  fs.writeFileSync(path.join(work, 'main.tex'), renderTeX(content, { full }), 'utf8');
  fs.copyFileSync(path.join(CV_SRC, 'unsrt_abbrv_custom.bst'), path.join(work, 'unsrt_abbrv_custom.bst'));
  for (const bib of ['first.bib', 'supporting.bib']) {
    fs.copyFileSync(path.join(CONTENT, 'publications', bib), path.join(work, bib));
  }
  console.log(`    ✓ main.tex rendered → ${path.relative(ROOT, work)}/`);

  const pdflatex = ['-interaction=nonstopmode', '-halt-on-error', 'main.tex'];
  run('pdflatex', pdflatex, work);
  run('bibtex', ['prim'], work);
  run('bibtex', ['supp'], work);
  run('pdflatex', pdflatex, work);
  run('pdflatex', pdflatex, work);

  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, filename);
  fs.copyFileSync(path.join(work, 'main.pdf'), out);
  console.log(`    ✓ ${path.relative(ROOT, out)} compiled`);
  return out;
}

module.exports = { buildCV, renderTeX, CV_FILENAME, BUILD };
