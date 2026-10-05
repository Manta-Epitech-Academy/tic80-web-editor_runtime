import { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import type { IDockviewPanelProps } from 'dockview';
import type { CartPart } from '../bridge/cartFormat';
import { useAppServices } from '../providers/AppServicesProvider';
import { registerTicCompletions } from '../monaco/ticCompletions';
import { buildEditorOptions, editorHelpersEnabled } from '../monaco/editorAssist';

// One editor per part of the cart (see cartFormat.ts): the code, and next to it the header and
// the assets, which TIC-80 needs in the file but which are not what a beginner came to read.
function CartPartEditor({ part }: { part: CartPart }) {
  const { bridge, ready } = useAppServices();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('lua');
  const [cartLoaded, setCartLoaded] = useState(false);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const helpersEnabled = useMemo(() => editorHelpersEnabled(), []);
  const editorOptions = useMemo(() => buildEditorOptions(helpersEnabled), [helpersEnabled]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    setCode(bridge.getPart(part));
    setLanguage(bridge.getScriptLanguage());
    setCartLoaded(bridge.isCartLoaded());

    const unsubs = [
      bridge.onPartsChange(() => {
        // Only feed the editor when the change genuinely differs from what it
        // already shows. Skipping equal pushes (the user's own keystrokes
        // round-tripping back) keeps the controlled `value` from lagging the
        // live model and flushing the cursor to the bottom while typing.
        const pushed = bridge.getPart(part);
        const live = editorRef.current?.getValue() ?? null;
        if (live === null || pushed !== live) {
          setCode(pushed);
        }
      }),
      bridge.onLanguageChange(setLanguage),
      bridge.onCartLoadedChange(setCartLoaded),
    ];

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [bridge, ready, part]);

  return (
    <div className="panel-fill">
      {!ready ? (
        <div className="panel-message">Starting editor...</div>
      ) : !cartLoaded ? (
        <div className="panel-message">Click TIC-80 to boot, then the active cart will appear here.</div>
      ) : (
        <Editor
          // A model of its own for each part: the tabs must not end up editing the same text.
          path={`cart-${part}`}
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => {
            // Do not push the typed value back into the controlled `value`;
            // the editor already holds it. Round-tripping it through React state
            // makes the `value` prop lag the live model during fast typing,
            // which forces a full-model replace that flushes the cursor. The
            // bridge is the source of truth for the code content.
            bridge.syncPart(part, value ?? '');
          }}
          beforeMount={helpersEnabled ? registerTicCompletions : undefined}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          options={editorOptions}
        />
      )}
    </div>
  );
}

export function EditorPanel(_props: IDockviewPanelProps) {
  return <CartPartEditor part="code" />;
}

export function HeaderPanel(_props: IDockviewPanelProps) {
  return <CartPartEditor part="header" />;
}

export function ResourcesPanel(_props: IDockviewPanelProps) {
  return <CartPartEditor part="resources" />;
}
