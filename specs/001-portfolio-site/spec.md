# Feature Specification: Jared Galloway Portfolio Site

**Feature Branch**: `001-portfolio-site`
**Created**: 2026-02-19
**Status**: Draft
**URL**: jaredgalloway.com

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recruiter Evaluates Candidate (Priority: P1)

A recruiter or hiring manager arrives at jaredgalloway.com to assess Jared's background quickly. They want to see who he is, what he has built, where he has worked, and how to contact him — all in a single visit without downloading anything or navigating away.

**Why this priority**: This is the primary use-case driving the entire site's existence. Every other story depends on a solid first impression for professional evaluation.

**Independent Test**: Can be fully tested by visiting the homepage, reading the Hero, About, Skills, Projects, Experience, and Contact sections end-to-end, and confirming all information is present and accurate.

**Acceptance Scenarios**:

1. **Given** a recruiter lands on jaredgalloway.com, **When** the page loads, **Then** Jared's full name, professional tagline, and a clear call-to-action are immediately visible above the fold.
2. **Given** the recruiter scrolls to the About section, **When** they view it, **Then** they see a professional photo of Jared alongside a written bio.
3. **Given** the recruiter scrolls to Experience, **When** they view it, **Then** they see a chronological timeline of Jared's employment history with role titles, organisations, and dates.
4. **Given** the recruiter wants to reach Jared, **When** they scroll to Contact, **Then** they find a working email link and icons linking to his GitHub (https://github.com/jaredgalloway) and LinkedIn (https://www.linkedin.com/in/jared-galloway-707836116/).

---

### User Story 2 - Peer Developer Explores Projects (Priority: P2)

A fellow engineer or open-source collaborator visits the site to browse Jared's public projects. They want to see what he has built, which technologies he used, and how to view the source or live demo.

**Why this priority**: Projects are the primary technical proof-of-work and a key differentiator from a plain CV/résumé.

**Independent Test**: Can be fully tested by navigating to the Projects section, reading at least one project card end-to-end, and following its links.

**Acceptance Scenarios**:

1. **Given** a visitor reaches the Projects section, **When** they view a project card, **Then** they see a title, short description, technology tags, and at least one link (GitHub repo or live demo).
2. **Given** a visitor clicks a project link, **When** the link is activated, **Then** it opens in a new browser tab without leaving jaredgalloway.com.
3. **Given** the Projects section contains multiple projects, **When** viewed at any viewport width, **Then** all cards are readable and no content is clipped or hidden.

---

### User Story 3 - Mobile Visitor Gets Full Experience (Priority: P3)

A visitor on a smartphone encounters the site — perhaps after clicking a link in Jared's email signature or a social profile. They expect the site to be fast, readable, and fully navigable on a small screen.

**Why this priority**: A significant portion of professional link-following happens on mobile; a broken mobile experience undermines credibility.

**Independent Test**: Can be fully tested by loading the site on a 375 px-wide viewport and verifying every section is readable and interactive elements are tappable.

**Acceptance Scenarios**:

1. **Given** a visitor loads the site on a phone, **When** the page finishes loading, **Then** the page is fully usable within 3 seconds on a standard mobile connection.
2. **Given** a mobile visitor uses the light/dark mode toggle, **When** they tap it, **Then** the colour scheme switches immediately and the preference is remembered for the session.
3. **Given** a mobile visitor taps any navigation anchor or contact link, **When** the tap registers, **Then** the target area is at least 44 × 44 CSS pixels and responds correctly.

---

### User Story 4 - Screen Reader User Navigates Accessibly (Priority: P4)

A visitor using a screen reader navigates the site by headings and landmarks to find specific information such as contact details or project listings.

**Why this priority**: Accessibility is a non-negotiable baseline (WCAG 2.1 AA). This story validates the semantic structure required by all other stories.

**Independent Test**: Can be fully tested by navigating the page using only a keyboard and screen reader, confirming all sections are reachable and all images have meaningful text alternatives.

**Acceptance Scenarios**:

1. **Given** a keyboard-only user opens the page, **When** they press Tab, **Then** focus moves logically through interactive elements with a visible focus indicator at every step.
2. **Given** a screen reader user navigates by landmarks, **When** they list page regions, **Then** they can identify nav, main, and footer landmarks.
3. **Given** a screen reader encounters the hero background image and Jared's photo, **When** it reads aloud, **Then** Jared's photo has a descriptive alt text; decorative images have empty alt attributes.

---

### Edge Cases

- What happens when a visitor's browser has JavaScript disabled? — All content MUST be fully readable; JS-dependent enhancements (scroll animations, theme toggle) degrade gracefully without hiding content.
- What happens when the mirror-lake.jpeg hero image fails to load? — The section MUST remain readable using a CSS background-color fallback; no broken-image icon is shown.
- What happens when a visitor's system contrast is set to high-contrast mode? — Colours MUST not override the operating system forced-colours palette.
- What happens when a visitor resizes the browser window during animation? — Animations MUST not cause layout shifts; CLS MUST remain ≤ 0.1.
- What happens if the contact email link is clicked on a device with no mail client? — The `mailto:` link MUST open a compose window or, where unavailable, display the address as plain visible text so the user can copy it.
- What happens when a visitor has JavaScript disabled and the email is obfuscated via JS? — A `<noscript>` fallback or CSS-only obfuscation technique MUST ensure the address is still visible and copyable without JS.

---

## Requirements *(mandatory)*

### Functional Requirements

**Navigation & Structure**

- **FR-001**: The site MUST present all content on a single scrollable page reachable at jaredgalloway.com.
- **FR-002**: The site MUST include a fixed or sticky navigation bar with anchor links to each named section (Hero, About, Skills, Projects, Experience, Contact).
- **FR-003**: Clicking a navigation anchor MUST scroll the viewport smoothly to the corresponding section.
- **FR-003a**: On viewports narrower than 768 px, the navigation bar MUST collapse into a hamburger icon. Tapping the icon MUST reveal a slide-down or overlay menu listing all section anchor links. Tapping a link or the close control MUST dismiss the menu.

**Hero Section**

- **FR-004**: The Hero section MUST display Jared's full name "Jared Galloway" as the primary heading.
- **FR-005**: The Hero section MUST display the tagline "Software Engineer · Computational Biologist" beneath the name.
- **FR-006**: The Hero section MUST include at least one call-to-action element (e.g., "View My Work" or "Get in Touch") that links to another section on the page.
- **FR-007**: The Hero section MUST use the landscape photo `data/mirror-lake.jpeg` as a full-bleed background image with a theme-adaptive gradient overlay. In dark mode the overlay MUST be predominantly dark; in light mode the overlay MUST shift lighter. The overlay MUST ensure text contrast meets FR-027 requirements in both themes.

**About Section**

- **FR-008**: The About section MUST display the photo from `data/me.jpeg` with a descriptive alt text identifying Jared Galloway.
- **FR-009**: The About section MUST include a written biography describing Jared's background, expertise, and professional interests.

**Skills / Technologies Section**

- **FR-010**: The Skills section MUST display Jared's technical skills as a visual grid of named items (with optional icons), organized into named category groups (e.g., "Languages", "Frameworks", "Tools / Infrastructure").
- **FR-010a**: Each category group MUST have a visible heading so visitors can scan by competency area.
- **FR-011**: Each skill item MUST be labelled with visible text so the section remains meaningful when icons fail to load.

**Projects Section**

- **FR-012**: The Projects section MUST display a minimum of one project card; the layout MUST support an arbitrary number of cards in a grid arrangement.
- **FR-013**: Each project card MUST include: a project title, a short description (≤ 3 sentences), at least one technology tag, and at least one external link (repository or live demo).
- **FR-014**: All external project links MUST open in a new browser tab.

**Experience / Timeline Section**

- **FR-015**: The Experience section MUST display employment history in reverse-chronological order (most recent first).
- **FR-016**: Each experience entry MUST include: role title, organisation name, date range, and a brief description of responsibilities or achievements.

**Contact Section**

- **FR-017**: The Contact section MUST include a usable email contact for jaredgalloway07@gmail.com. The address MUST be obfuscated in the page source so that automated scrapers cannot harvest it as plain text (e.g., CSS-reversed display, character-entity encoding, or JS assembly at click-time). When JavaScript is unavailable, the address MUST still be readable by the human visitor (e.g., rendered as visible text via a `<noscript>` element or CSS-only technique).
- **FR-018**: The Contact section MUST include icon links to GitHub (https://github.com/jaredgalloway) and LinkedIn (https://www.linkedin.com/in/jared-galloway-707836116/).
- **FR-019**: All social/contact links MUST open in a new browser tab and include accessible labels (not icon-only without text alternative).

**Theme Toggle**

- **FR-020**: The site MUST default to dark mode and provide a clearly labelled toggle control to switch to light mode.
- **FR-021**: The selected theme preference MUST persist for the duration of the browser session.
- **FR-022**: The site MUST respect the visitor's operating-system colour-scheme preference (`prefers-color-scheme`) as the initial default when no session preference is stored.

**Scroll Animations**

- **FR-023**: Sections below the fold MUST animate into view (e.g., fade-in or slide-up) as the visitor scrolls down.
- **FR-024**: Scroll animations MUST be disabled for visitors who have enabled `prefers-reduced-motion`.

**Accessibility**

- **FR-025**: The site MUST meet WCAG 2.1 Level AA across all sections.
- **FR-026**: All interactive elements MUST be keyboard-navigable with a visible focus indicator.
- **FR-027**: Colour contrast ratios MUST meet 4.5:1 for body text and 3:1 for large text in both dark and light themes.

**Analytics**

- **FR-033**: The site MUST include Google Analytics (gtag.js) to track page views and visitor behaviour.
- **FR-034**: The Content Security Policy MUST explicitly permit Google Analytics script and data collection origins (`https://www.googletagmanager.com`, `https://www.google-analytics.com`).
- **FR-035**: The Google Analytics Measurement ID (GA4 `G-XXXXXXXXXX`) MUST be stored as a build-time constant and never hardcoded as a magic string in logic code; it MUST NOT be treated as a secret (it is a public identifier).
- **FR-036**: The analytics integration MUST be documented in the plan with its stated purpose ("measure visitor traffic and project link engagement") and privacy implication ("IP anonymisation enabled by default in GA4; no personally identifiable information is collected beyond what GA4 captures by default").

**Performance & SEO**

- **FR-028**: The page MUST achieve a Lighthouse score of ≥ 95 in Performance, Accessibility, Best Practices, and SEO categories.
- **FR-029**: The page MUST include a `<title>`, `<meta name="description">`, canonical link, Open Graph tags, and JSON-LD Person structured data.
- **FR-030**: A `sitemap.xml` and `robots.txt` MUST be present at the domain root.
- **FR-031**: A `CNAME` file containing `jaredgalloway.com` MUST be present in the repository root for GitHub Pages custom domain routing.
- **FR-032**: A `404.html` page MUST exist and provide a navigation link back to the homepage.

### Key Entities

- **Page**: The single HTML document served at jaredgalloway.com; contains all sections and metadata.
- **Section**: A named, anchor-linked division of the page (Hero, About, Skills, Projects, Experience, Contact); each independently navigable.
- **Project Card**: A self-contained content block representing one project; attributes: title, description, tags (array of strings), links (array of {label, url}).
- **Experience Entry**: A self-contained content block representing one role; attributes: title, organisation, start date, end date (or "Present"), description.
- **Skill Item**: A labelled entry in the skills grid; attributes: name, optional icon reference.
- **Theme**: A named colour-scheme variant (dark | light); toggled by the visitor and defaulting to system preference.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify Jared's name, profession, and primary contact method within 10 seconds of the page loading.
- **SC-002**: The page achieves a Lighthouse score of ≥ 95 in all four categories (Performance, Accessibility, Best Practices, SEO) on both mobile and desktop audits.
- **SC-003**: The page loads and is fully interactive within 3 seconds on a mid-range mobile device on a standard mobile connection.
- **SC-004**: Zero WCAG 2.1 Level AA violations are reported by an automated accessibility checker against the live page.
- **SC-005**: The page renders correctly and all content is readable at viewport widths of 320 px, 768 px, and 1280 px without horizontal scrolling.
- **SC-006**: The theme toggle switches the colour scheme in under 100 ms as perceived by the visitor, with no flash of unstyled content.
- **SC-007**: All navigation anchor links reach their target section within a single smooth scroll action, with zero broken anchors.
- **SC-008**: The HTML passes W3C validation with zero errors.

---

## Clarifications

### Session 2026-02-20

- Q: What is Jared's contact email address? → A: jaredgalloway07@gmail.com
- Q: Should the email address be protected from bot harvesting? → A: Yes — obfuscate so bots cannot scrape it; must still be usable when JavaScript is disabled.
- Q: Should Google Analytics or other third-party analytics be included? → A: Yes — Google Analytics (via gtag.js); CSP must permit it; privacy implications documented.
- Q: What is Jared's professional tagline for the Hero section? → A: "Software Engineer · Computational Biologist"
- Q: How should navigation behave on mobile viewports? → A: Hamburger icon that opens a slide-down/overlay menu with all section links.
- Q: Should the skills grid be grouped by category or displayed as a flat list? → A: Grouped by category (e.g., Languages, Frameworks, Tools/Infrastructure).
- Q: How should the hero background image interact with the text overlay? → A: Full-bleed image with a theme-adaptive gradient overlay (darker in dark mode, lighter in light mode).
- Q: Should resume content (projects, experience, skills, bio) be stored in a structured data file or hardcoded in HTML? → A: Structured JSON file(s) in `data/` — build step or JS injects into HTML template.
- Q: What level of build tooling is acceptable? → A: Minimal build — a small Node.js script that renders JSON into HTML template, optimizes images, minifies CSS/JS.

---

## Assumptions

- Jared's email address, tagline, biography text, skill list, project details, and experience entries MUST be stored in structured JSON file(s) under `data/` (e.g., `data/resume.json` or per-section files). A build step or client-side JS will inject this data into the HTML template. Placeholder values may be used in the initial build.
- The `data/me.jpeg` and `data/mirror-lake.jpeg` images are already present in the repository; the build pipeline is responsible for optimising them to WebP/AVIF.
- Twitter/X is intentionally excluded from the Contact section based on the supplied social links (GitHub + LinkedIn only).
- The build toolchain MUST be a minimal Node.js script (no full SSG framework). It MUST render JSON data into an HTML template, optimise images (WebP/AVIF), and minify CSS/JS. The exact script design is deferred to `/speckit.plan`.
- The site is English-only; no internationalisation is required.
- No contact form with server-side handling is needed; a `mailto:` link is sufficient.
