// Inline markup shared by every text field in content/*.json.
//
//   [text](https://url)    link
//   *text*                 italic
//   **text**               bold
//   [@Key1, @Key2]         citation (BibTeX keys from content/publications/*.bib)
//
// Each output format supplies a small renderer; plain text segments go through
// the format's own escaper, so content files never contain raw HTML or LaTeX.

const TOKEN = /\s*\[@([^\]]+)\]|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

function render(text, fmt) {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    out += fmt.text(text.slice(last, m.index));
    if (m[1]) out += fmt.cite(m[1].split(',').map(k => k.trim().replace(/^@/, '')));
    else if (m[2]) out += fmt.link(render(m[2], fmt), m[3]);
    else if (m[4]) out += fmt.bold(render(m[4], fmt));
    else out += fmt.italic(render(m[5], fmt));
    last = m.index + m[0].length;
  }
  return out + fmt.text(text.slice(last));
}

// ── HTML ────────────────────────────────────────────────────────────────

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const HTML = {
  text: escapeHTML,
  link: (inner, url) =>
    `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`,
  bold: inner => `<strong>${inner}</strong>`,
  italic: inner => `<em>${inner}</em>`,
  cite: () => ''
};

// ── LaTeX ───────────────────────────────────────────────────────────────

const LATEX_SPECIALS = {
  '\\': '\\textbackslash{}',
  '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#', '_': '\\_',
  '{': '\\{', '}': '\\}',
  '~': '\\textasciitilde{}', '^': '\\textasciicircum{}'
};

function escapeLaTeX(str) {
  return String(str)
    .replace(/[\\&%$#_{}~^]/g, c => LATEX_SPECIALS[c])
    .replace(/"([^"]*)"/g, "``$1''")
    .replace(/≈/g, '$\\approx$')
    .replace(/→/g, '$\\rightarrow$')
    .replace(/·/g, '$\\cdot$')
    .replace(/—/g, '---')
    .replace(/–/g, '--')
    .replace(/\bLaTeX\b/g, '\\LaTeX{}');
}

function escapeLaTeXURL(url) {
  return url.replace(/[%#]/g, c => '\\' + c);
}

const LATEX = {
  text: escapeLaTeX,
  link: (inner, url) => `\\href{${escapeLaTeXURL(url)}}{${inner}}`,
  bold: inner => `\\textbf{${inner}}`,
  italic: inner => `\\textit{${inner}}`,
  cite: keys => `~\\cite{${keys.join(',')}}`
};

module.exports = {
  toHTML: text => render(text, HTML),
  toLaTeX: text => render(text, LATEX),
  escapeHTML,
  escapeLaTeX,
  escapeLaTeXURL
};
