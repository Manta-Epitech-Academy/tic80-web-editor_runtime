// Which REPL the third panel holds, or none. Chosen by whoever embeds the editor, with `?repl=`
// in the address:
//
//   ?repl=lua   the Lua REPL (the default, and what an address with no `repl` gets)
//   ?repl=py    Python
//   ?repl=js    JavaScript
//   ?repl=off   no REPL panel at all
//
// Read once, at start-up, and from the address rather than from a message: the layout is built
// when the app mounts, so a setting that arrived later would show a panel and then take it away,
// after its interpreter had started loading. The address is also what makes this work with no
// host at all: open the editor with `?repl=py` and that is what you get.
//
// The three languages are the routes repl_runtime serves (scripts/fetch-repl.mjs vendors all of
// them). An unknown value is not an error a participant can do anything about, so it falls back
// to the default rather than to a broken panel.

export const REPL_LANGUAGES = {
  lua: { route: 'lua', title: 'Lua REPL' },
  py: { route: 'py', title: 'Python REPL' },
  js: { route: 'js', title: 'JavaScript REPL' },
} as const;

export type ReplLanguage = keyof typeof REPL_LANGUAGES;

const DEFAULT_REPL: ReplLanguage = 'lua';
const OFF = ['off', 'none', 'false', '0', 'no'];
const ALIASES: Record<string, ReplLanguage> = { python: 'py', javascript: 'js' };

export function parseRepl(search: string): ReplLanguage | null {
  const raw = new URLSearchParams(search).get('repl');
  if (raw === null) {
    return DEFAULT_REPL;
  }
  const value = raw.trim().toLowerCase();
  if (OFF.includes(value)) {
    return null;
  }
  // Own keys only: `constructor` is "in" every object, and is not a language.
  if (Object.hasOwn(REPL_LANGUAGES, value)) {
    return value as ReplLanguage;
  }
  return Object.hasOwn(ALIASES, value) ? ALIASES[value] : DEFAULT_REPL;
}

/** The REPL this page was opened with; `null` when it was opened with none. */
export const replLanguage: ReplLanguage | null = parseRepl(window.location.search);
