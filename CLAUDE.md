# CLAUDE.md

Jared Galloway's personal site (**jaredgalloway.com**) and **LaTeX CV**,
built from one set of content files. Editing anything in `content/` updates
both. A push to `main` rebuilds and deploys the site with the freshly compiled
CV linked from it.

## Layout

| Path | Role |
|------|------|
| `content/*.json` | **Single source of truth**: profile, experience, projects, skills, education, achievements |
| `content/publications/{first,supporting}.bib` | BibTeX for the CV's two bibliographies |
| `content/images/` | Source photos (`profile.photo`, `profile.heroImage`) |
| `content/private.json` | **Gitignored.** Phone and references (format: `private.example.json`) |
| `cv/template.tex` | CV preamble, macros, and section order; `{{name}}` placeholders |
| `cv/texlive-packages.txt` | TeX Live packages CI installs |
| `site/` | HTML template (`{{name}}` placeholders), CSS, JS, static files |
| `scripts/content.js` | Loads and validates content; `forTarget()`, `formatMonthYear()` |
| `scripts/markup.js` | Shared inline markup → HTML / LaTeX, plus the escapers |
| `scripts/cv.js`, `scripts/site.js` | Renderers/builders for each output |
| `build.js` | Orchestrator → `dist/` (deployed) and `build/` (local scratch) |
| `specs/`, `.specify/` | Historical speckit docs from the original site build; not the source of truth |

## Commands

Node ≥ 18, plus `pdflatex`/`bibtex` (MacTeX) for the CV.

```sh
npm run build        # validate content → CV PDF + site into dist/
npm run build:cv     # CV only
npm run build:site   # site only (no TeX needed)
npm run serve        # preview dist/ at http://localhost:8080
```

Debug a CV failure using the rendered `build/cv/main.tex` and `main.log`.
If `content/private.json` exists, the build also writes
`build/Jared_Galloway_CV_full.pdf`.

## Rules

- **Never put the phone number or reference contact details in tracked files,
  `dist/`, or the website.** They live only in `content/private.json`. The
  public CV prints "Available upon request." The repo is public.
- Edit **wording** in `content/` and **layout** in `cv/template.tex` and `site/`.
  Content files hold plain text and never raw HTML or LaTeX.
- Inline markup in any text field: `[text](url)`, `*italic*`, `**bold**`, and
  `[@BibKey, @Other]` citations (`\cite` on the CV, dropped on the site).
  Characters like `& % " ≈ → · —` are escaped automatically.
- Mark an entry, skill category, skill item, or social link with
  `"only": "cv"` or `"only": "web"` to show it in one output only.
  `"cvPageBreakBefore": true` on an experience entry forces a CV page break.
- Experience gives the site `summary` and the CV `highlights`. Projects give the
  site `summary` and the CV `description`. Dates are `YYYY-MM` or `"Present"`.
- Placeholders in `cv/template.tex` are strict: an unknown `{{x}}` fails the
  build, and so does one written inside a comment.
- Any new `\usepackage` in the CV needs its TeX Live package added to
  `cv/texlive-packages.txt`, or CI fails.
- The CV uses `multibib`. bibtex runs on `prim.aux` and `supp.aux`, not on
  `first`/`supporting`; `scripts/cv.js` handles this.
- The site's CSP is `'self'`-only. Keep assets local and avoid inline scripts.
- After a CV change, check that `pdfinfo dist/Jared_Galloway_CV.pdf` still
  shows a sensible page count (currently 4).

## Deploy

`.github/workflows/deploy.yml` runs on every push to `main`: it installs TeX
Live, runs `npm run build`, and deploys `dist/` to GitHub Pages
(CNAME `jaredgalloway.com`). PRs run the build only and upload the CV PDF as an
artifact. **Pushing to `main` publishes the site.**

The CV used to live in `jgallowa07/Resume-CV`. Don't edit it there; it's
superseded.

<!-- br-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_rust](https://github.com/Dicklesworthstone/beads_rust) (`br`/`bd`) for issue tracking. Issues are stored in `.beads/` and tracked in git.

### Essential Commands

```bash
# View ready issues (unblocked, not deferred)
br ready              # or: bd ready

# List and search
br list --status=open # All open issues
br show <id>          # Full issue details with dependencies
br search "keyword"   # Full-text search

# Create and update
br create --title="..." --description="..." --type=task --priority=2
br update <id> --status=in_progress
br close <id> --reason="Completed"
br close <id1> <id2>  # Close multiple issues at once

# Sync with git
br sync --flush-only  # Export DB to JSONL
br sync --status      # Check sync status
```

### Workflow Pattern

1. **Start**: Run `br ready` to find actionable work
2. **Claim**: Use `br update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `br close <id>`
5. **Sync**: Always run `br sync --flush-only` at session end

### Key Concepts

- **Dependencies**: Issues can block other issues. `br ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers 0-4, not words)
- **Types**: task, bug, feature, epic, chore, docs, question
- **Blocking**: `br dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
br sync --flush-only    # Export beads changes to JSONL
git commit -m "..."     # Commit everything
git push                # Push to remote
```

### Best Practices

- Check `br ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `br create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always sync before ending session

<!-- end-br-agent-instructions -->
