/** SWEETIE-16 default palette (16 colors × 6 hex RGB digits). */
export const SWEETIE16_PALETTE =
  '1a1c2c5d275db13e53ef7d57ffcd75a7f07038b76425717929366f3b5dc941a6f673eff7f4f4f494b0c2566c86333c57';

// A cart is one text file, and TIC-80 reads it as one: the code, with the cart's metadata in
// comments at its top and its assets in comment blocks at its end. The editor shows these three
// parts in three tabs, because a beginner who opens the code should see the code. They are split
// here and joined back here, so everything else (TIC-80, the autosave, "Save Code", the export)
// keeps handling the single file.

export type CartPart = 'header' | 'code' | 'resources';

export interface CartParts {
  /** The comments above the `script:` line: the metadata (title, author, ...). */
  header: string;
  /** The `script:` line and the code. */
  code: string;
  /** The asset sections (`<TILES>`, `<SFX>`, `<PALETTE>`, ...), comment markers included. */
  resources: string;
}

// Sections use the script language's line-comment token: Lua (--), C-style (//), Python and
// Ruby (#), Lisp-likes (;). A bank other than the first carries its number: `<TILES1>`.
const COMMENT = String.raw`(?:--|\/\/|#|;+)`;
// The marker is a line of its own, starting at the margin, which is how TIC-80 writes it. A
// comment in the code that merely mentions one (`  -- <MAP> is drawn here`) is not a section.
const RESOURCE_SECTION = new RegExp(
  String.raw`(?:^|\n)${COMMENT}[ \t]*<(?:PALETTE|TILES|SPRITES|MAP|SFX|MUSIC|WAVES|WAVEFORM|PATTERNS|TRACKS|FLAGS|SCREEN)\d*>[ \t]*(?=\n|$)`,
);

// Only the tags TIC-80 itself reads: any other `# word: ...` at the top of a file is the
// author's own comment, and stays with their code.
const METADATA_LINE = new RegExp(
  String.raw`^[ \t]*${COMMENT}[ \t]*(?:title|author|desc|site|license|version|input|saveid|menu):`,
  'i',
);
const COMMENT_LINE = new RegExp(String.raw`^[ \t]*${COMMENT}`);
const SCRIPT_LINE = new RegExp(String.raw`^[ \t]*${COMMENT}[ \t]*script:`, 'i');

export function splitCart(content: string): CartParts {
  const text = content.replace(/\r\n/g, '\n');
  const match = text.match(RESOURCE_SECTION);
  const body = match?.index === undefined ? text : text.slice(0, match.index);
  const resources = match?.index === undefined ? '' : text.slice(match.index).trim();

  const lines = body.split('\n');

  // The `script:` line is where the code starts: it stays with the code, as it does in TIC-80's
  // own editor, and says which language the lines below are in. The comments above it are the
  // header, whatever they say, so a line of one's own added there (`# my first game`) stays
  // there. What follows it is code, even a comment that reads like metadata.
  let first = 0;
  while (first < lines.length && !SCRIPT_LINE.test(lines[first])) {
    if (lines[first].trim() !== '' && !COMMENT_LINE.test(lines[first])) {
      first = -1;
      break;
    }
    first++;
  }

  if (first < 0 || first === lines.length) {
    // No `script:` line to go by (a Lua cart may omit it): only the tags TIC-80 reads are header.
    first = 0;
    while (first < lines.length && METADATA_LINE.test(lines[first])) {
      first++;
    }
  }

  return {
    header: lines.slice(0, first).join('\n').trim(),
    code: lines.slice(first).join('\n').trimEnd(),
    resources,
  };
}

export function joinCart({ header, code, resources }: CartParts): string {
  const top = header.trim();
  const tail = resources.trim();
  return `${top ? `${top}\n` : ''}${code.trimEnd()}${tail ? `\n\n${tail}\n` : ''}`;
}

export function defaultPaletteBlock(paletteHex: string = SWEETIE16_PALETTE): string {
  return `\n-- <PALETTE>\n-- 000:${paletteHex}\n-- </PALETTE>\n`;
}

const SCRIPT_TAG = /--\s*script:\s*(\w+)/i;

export function parseScriptLanguage(cartText: string): string {
  const match = cartText.match(SCRIPT_TAG);
  return match ? match[1].toLowerCase() : 'lua';
}

// Metadata headers use the script language's line-comment token, so accept
// Lua (--), C-style (//), shell/Python (#) and Lisp/Fennel (;) markers.
const SCRIPT_TAG_ANY = /(?:--|\/\/|#|;+)\s*script:\s*(\w+)/i;
const TITLE_TAG_ANY = /(?:--|\/\/|#|;+)\s*title:\s*(.+)/i;

export function parseScriptLanguageAny(cartText: string): string {
  const match = cartText.match(SCRIPT_TAG_ANY);
  return match ? match[1].toLowerCase() : 'lua';
}

export function parseCartTitle(cartText: string): string {
  const match = cartText.match(TITLE_TAG_ANY);
  return match ? match[1].trim() : '';
}

export function sanitizeFilename(name: string, fallback = 'cart'): string {
  const cleaned = name
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^[._]+|[._]+$/g, '');
  return cleaned || fallback;
}

const EXT_TO_MONACO: Record<string, string> = {
  lua: 'lua',
  py: 'python',
  js: 'javascript',
  rb: 'ruby',
  moon: 'lua',
  fnl: 'lua',
  nut: 'lua',
  wren: 'javascript',
  wasmp: 'lua',
  janet: 'lua',
  scheme: 'scheme',
  squirrel: 'javascript',
};

export function scriptExtToMonacoLanguage(ext: string, cartText?: string): string {
  const normalized = ext.replace(/^\./, '').toLowerCase();
  if (EXT_TO_MONACO[normalized]) {
    return EXT_TO_MONACO[normalized];
  }
  if (cartText) {
    const fromTag = parseScriptLanguage(cartText);
    if (EXT_TO_MONACO[fromTag]) {
      return EXT_TO_MONACO[fromTag];
    }
    if (fromTag === 'python') {
      return 'python';
    }
    if (fromTag === 'javascript' || fromTag === 'js') {
      return 'javascript';
    }
  }
  return 'lua';
}

export function workspaceFilename(ext: string): string {
  const normalized = ext.replace(/^\./, '').toLowerCase() || 'lua';
  return `workspace.${normalized}`;
}
