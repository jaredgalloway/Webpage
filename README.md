# jaredgalloway.com + CV

One repository, one source of truth. Everything about me lives in `content/`;
a single build turns it into both the website and the LaTeX CV, and CI
deploys the site (with the freshly compiled CV linked from it).

```
content/*.json ──┬──▶ scripts/site.js ──▶ dist/index.html, images, …  ─┐
content/images/  │                                                    ├─▶ GitHub Pages
content/publications/*.bib ──▶ scripts/cv.js ──▶ dist/Jared_Galloway_CV.pdf ─┘
```

## Editing content

| File | Used by | What's in it |
|------|---------|--------------|
| `content/profile.json` | site + CV | name, tagline, bio paragraphs, contact, social links |
| `content/experience.json` | site + CV | jobs: `summary` (site timeline) and `highlights` (CV bullets) |
| `content/projects.json` | site + CV | projects: `summary` (site card), `description` (CV), links |
| `content/skills.json` | site + CV | skill categories; `note` shows in parentheses on the CV |
| `content/education.json` | CV | degrees |
| `content/private.json` | local full CV only | phone + references — **gitignored**, never deployed |
| `content/achievements.json` | CV | theses, side projects, service |
| `content/publications/first.bib`, `supporting.bib` | CV | BibTeX — first/co-first and supporting author papers |

**Inline markup** (any text field): `[text](https://url)` link, `*italic*`,
`**bold**`, `[@BibKey, @OtherKey]` citation (rendered as `\cite` on the CV,
dropped on the site). Write plain characters — `&`, `%`, `"quotes"`, `≈`, `→`,
`·`, `—` are escaped/converted for LaTeX automatically.

**Targeting:** add `"only": "cv"` or `"only": "web"` to any entry, skill
category, skill item, or social link to show it in just one output.
`"cvPageBreakBefore": true` on an experience entry forces a CV page break.

Layout lives elsewhere: `cv/template.tex` (CV preamble + section order) and
`site/` (HTML template, CSS, JS).

## Private details

Your phone number and references never go into git or onto the website. Keep
them in `content/private.json` (gitignored; template:
`content/private.example.json`). When that file exists, `npm run build` also
writes `build/Jared_Galloway_CV_full.pdf` with them included. The public
`dist/` CV omits the phone and says references are "available upon request".

## Building

Requires Node ≥ 18 and a TeX distribution with `pdflatex` + `bibtex`
(MacTeX on macOS, TeX Live on Linux).

```sh
npm ci
npm run build        # CV + site → dist/
npm run build:cv     # CV only   → dist/Jared_Galloway_CV.pdf
npm run build:site   # site only (no TeX needed; CV link will 404 locally)
npm run serve        # preview dist/ at http://localhost:8080
```

The rendered `main.tex` and LaTeX logs are kept in `build/cv/` for debugging.
The CV uses `multibib`, so the build runs
`pdflatex → bibtex prim → bibtex supp → pdflatex → pdflatex`.

## Deploying

Push to `main`. `.github/workflows/deploy.yml` installs the TeX packages in
`cv/texlive-packages.txt`, runs `npm run build`, and publishes `dist/` to
GitHub Pages. Pull requests run the same build (and upload the CV PDF as an
artifact) without deploying.

## History

The CV previously lived in `jgallowa07/Resume-CV`, which keeps its own
history. It was imported here as a single commit so that older versions
(which contained private contact details) aren't republished.
