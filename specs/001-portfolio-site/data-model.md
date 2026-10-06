# Data Model: Portfolio Site

**Feature**: 001-portfolio-site | **Date**: 2026-02-20

## Overview

All resume/portfolio content is stored in JSON files under `data/`. The build script reads these files and injects the content into the HTML template. No database or API — pure static data.

## Entities

### Profile (`data/profile.json`)

Top-level personal information used across Hero, About, and Contact sections.

```json
{
  "name": "Jared Galloway",
  "tagline": "Software Engineer · Computational Biologist",
  "bio": "Multi-paragraph biography string...",
  "email": "jaredgalloway07@gmail.com",
  "photo": "me.jpeg",
  "heroImage": "mirror-lake.jpeg",
  "social": [
    {
      "platform": "github",
      "url": "https://github.com/jaredgalloway",
      "label": "GitHub"
    },
    {
      "platform": "linkedin",
      "url": "https://www.linkedin.com/in/jared-galloway-707836116/",
      "label": "LinkedIn"
    }
  ]
}
```

**Validation rules**:
- `name`: Required, non-empty string
- `tagline`: Required, non-empty string
- `bio`: Required, non-empty string (may contain line breaks for paragraphs)
- `email`: Required, valid email format
- `photo`: Required, must reference a file in `data/`
- `heroImage`: Required, must reference a file in `data/`
- `social[].platform`: Required, one of `github` | `linkedin`
- `social[].url`: Required, valid URL
- `social[].label`: Required, non-empty string (used for accessible link text)

### Skill Category (`data/skills.json`)

Skills organized by category group per FR-010.

```json
[
  {
    "category": "Languages",
    "items": [
      { "name": "Python", "icon": "python" },
      { "name": "Rust", "icon": "rust" },
      { "name": "JavaScript", "icon": "javascript" }
    ]
  },
  {
    "category": "Frameworks & Libraries",
    "items": [
      { "name": "React", "icon": "react" }
    ]
  },
  {
    "category": "Tools & Infrastructure",
    "items": [
      { "name": "Docker", "icon": "docker" },
      { "name": "Git", "icon": "git" }
    ]
  }
]
```

**Validation rules**:
- Array must contain ≥ 1 category
- `category`: Required, non-empty string (used as visible heading per FR-010a)
- `items`: Required, array with ≥ 1 item
- `items[].name`: Required, non-empty string (visible text per FR-011)
- `items[].icon`: Optional string (icon identifier; layout must not depend on icon loading)

### Project (`data/projects.json`)

Project cards per FR-012/FR-013.

```json
[
  {
    "title": "Project Name",
    "description": "A short description in ≤ 3 sentences.",
    "tags": ["Python", "Snakemake", "Bioinformatics"],
    "links": [
      { "label": "GitHub", "url": "https://github.com/jaredgalloway/project" },
      { "label": "Live Demo", "url": "https://example.com" }
    ]
  }
]
```

**Validation rules**:
- Array must contain ≥ 1 project (FR-012)
- `title`: Required, non-empty string
- `description`: Required, non-empty string, ≤ 3 sentences
- `tags`: Required, array with ≥ 1 string (technology tag)
- `links`: Required, array with ≥ 1 link (FR-013)
- `links[].label`: Required, non-empty string
- `links[].url`: Required, valid URL (opens in new tab per FR-014)

### Experience Entry (`data/experience.json`)

Employment history per FR-015/FR-016. Array ordered reverse-chronologically (most recent first).

```json
[
  {
    "title": "Software Engineer",
    "organization": "Company Name",
    "startDate": "2023-01",
    "endDate": "Present",
    "description": "Brief description of responsibilities or achievements."
  }
]
```

**Validation rules**:
- Array must contain ≥ 1 entry
- `title`: Required, non-empty string
- `organization`: Required, non-empty string
- `startDate`: Required, format `YYYY-MM`
- `endDate`: Required, either `YYYY-MM` format or the literal string `"Present"`
- `description`: Required, non-empty string
- Array order: first entry must have the most recent `startDate` (build script should validate reverse-chronological order)

## Relationships

```
Profile 1──* Social Link
Skill Category 1──* Skill Item
Project 1──* Tag (string)
Project 1──* Project Link
```

All relationships are embedded (nested arrays) — no foreign keys or joins needed for static JSON.

## File Layout

```
data/
├── profile.json       # Hero, About, Contact content
├── skills.json        # Skills section content
├── projects.json      # Projects section content
├── experience.json    # Experience section content
├── me.jpeg            # Profile photo (source)
└── mirror-lake.jpeg   # Hero background (source)
```

## Build-Time Validation

The build script MUST validate all JSON files against the rules above before generating HTML. On validation failure, the script MUST exit non-zero with a clear diagnostic message identifying the file, field, and rule violated (Constitution Principle III: Fail-Fast).
