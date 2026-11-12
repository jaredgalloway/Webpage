// Minimal BibTeX reader: enough to pull title/author/journal/year/doi out of
// content/publications/*.bib for the website. The CV still uses real bibtex.

const ACCENTS = { "'": '́', '`': '̀', '^': '̂', '"': '̈', '~': '̃' };

// Strip TeX braces and the few macros that appear in our .bib files.
function cleanTeX(s) {
  return s
    .replace(/\{\\(['`^"~])\{?([A-Za-z])\}?\}/g, (_, a, c) => (c + ACCENTS[a]).normalize('NFC'))
    .replace(/\$\\vert\$/g, '|')
    .replace(/\\&/g, '&')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Reads one field value starting at `i` ({...}, "...", or a bare word).
function readValue(text, i) {
  if (text[i] === '{') {
    let depth = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}' && --depth === 0) return [text.slice(i + 1, j), j + 1];
    }
    throw new Error('Unbalanced braces in .bib file');
  }
  if (text[i] === '"') {
    const j = text.indexOf('"', i + 1);
    return [text.slice(i + 1, j), j + 1];
  }
  const m = /^[^,}\s]+/.exec(text.slice(i));
  return [m[0], i + m[0].length];
}

// → { key: { type, title, author, journal, year, doi, ... } } with cleaned values.
function parseBib(text) {
  const entries = {};
  const head = /@(\w+)\s*\{\s*([^,\s]+)\s*,/g;
  let m;
  while ((m = head.exec(text))) {
    const entry = { type: m[1].toLowerCase() };
    let i = head.lastIndex;
    const field = /\s*([A-Za-z_-]+)\s*=\s*/y;
    for (;;) {
      field.lastIndex = i;
      const f = field.exec(text);
      if (!f) break;
      const [value, end] = readValue(text, field.lastIndex);
      entry[f[1].toLowerCase()] = cleanTeX(value);
      i = end;
      const sep = /\s*,?/y;
      sep.lastIndex = i;
      sep.exec(text);
      i = sep.lastIndex;
    }
    entries[m[2]] = entry;
    head.lastIndex = i;
  }
  return entries;
}

const SUFFIXES = new Set(['Jr.', 'Jr', 'Sr.', 'II', 'III', 'IV']);

// "Galloway, Jared G." or "Jared G Galloway" → "Galloway"
function lastName(name) {
  const parts = (name.includes(',') ? name.split(',')[0] : name).trim().split(/\s+/);
  let last = parts.pop();
  if (SUFFIXES.has(last) && parts.length) last = parts.pop();
  return last;
}

// Author last names, without the trailing "others" placeholder.
function authorList(author) {
  return author.split(/\s+and\s+/).map(a => a.trim()).filter(a => a && a !== 'others').map(lastName);
}

module.exports = { parseBib, authorList };
