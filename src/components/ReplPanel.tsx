import type { IDockviewPanelProps } from 'dockview';
import { REPL_LANGUAGES, replLanguage } from '../layout/replConfig';

// The REPL is a separate app (kevin-cazal/repl_runtime) vendored into public/repl/ at build time
// by scripts/fetch-repl.mjs. An iframe keeps its workers and styles apart from the editor, and
// its keyboard away from TIC-80. Which of its routes is shown is the page's `?repl=` setting
// (layout/replConfig.ts); with `?repl=off` the layout never creates this panel.
const REPL = REPL_LANGUAGES[replLanguage ?? 'lua'];
const REPL_URL = `${import.meta.env.BASE_URL}repl/${REPL.route}/`;

export function ReplPanel(_props: IDockviewPanelProps) {
  return (
    <div className="panel-fill repl-panel">
      <iframe className="repl-frame" src={REPL_URL} title={REPL.title} />
    </div>
  );
}
