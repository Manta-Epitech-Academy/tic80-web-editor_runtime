import { useCallback } from 'react';
import { DockviewReact, type DockviewReadyEvent, type SerializedDockview } from 'dockview-react';
import 'dockview/dist/styles/dockview.css';
import { applyDefaultLayout, openPanel } from './layout/layoutUtils';
import { Toolbar } from './components/Toolbar';
import { PanelTab } from './layout/PanelTab';
import { useLayoutApi } from './layout/LayoutContext';
import { dockviewComponents, panelRegistry } from './layout/panelRegistry';
import { replLanguage } from './layout/replConfig';
import { ESSENTIAL_PANEL_IDS, LAYOUT_STORAGE_KEY, LAYOUT_VERSION, type PanelId } from './layout/types';

interface StoredLayout {
  version: number;
  layout: SerializedDockview;
}

function loadStoredLayout(): StoredLayout | null {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredLayout;
    if (parsed.version !== LAYOUT_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveLayout(api: DockviewReadyEvent['api']): void {
  const payload: StoredLayout = {
    version: LAYOUT_VERSION,
    layout: api.toJSON(),
  };
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
}

// The stored layout is shared by every page of this origin, so it may have been saved by a page
// with another REPL setting: with the REPL off its panel is removed, and with another language
// the panel keeps its place and takes the title of the language it now holds.
function reconcileReplPanel(api: DockviewReadyEvent['api']): void {
  const panel = api.getPanel('repl');
  if (!panel) {
    return;
  }
  if (!replLanguage) {
    panel.api.close();
  } else if (panel.title !== panelRegistry.repl.title) {
    panel.api.setTitle(panelRegistry.repl.title);
  }
}

function ensureEssentialPanels(api: DockviewReadyEvent['api']): void {
  for (const id of ESSENTIAL_PANEL_IDS) {
    if (!api.getPanel(id)) {
      openPanel(api, id);
    }
  }
}

export function AppShell() {
  const { setApi } = useLayoutApi();

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      setApi(event.api);

      const stored = loadStoredLayout();
      if (stored) {
        event.api.fromJSON(stored.layout);
      } else {
        applyDefaultLayout(event.api);
      }

      reconcileReplPanel(event.api);
      ensureEssentialPanels(event.api);
      // The stored layout remembers which tab was in front. Of the cart's three it is the code
      // one comes back for, and the code the host means when it focuses "the editor".
      event.api.getPanel('editor')?.api.setActive();

      event.api.onDidRemovePanel((panel) => {
        const id = panel.id as PanelId;
        if ((ESSENTIAL_PANEL_IDS as readonly PanelId[]).includes(id)) {
          openPanel(event.api, id);
        }
      });

      window.addEventListener('beforeunload', () => saveLayout(event.api));
    },
    [setApi],
  );

  return (
    <div className="app-shell dockview-theme-dark">
      <Toolbar />
      <DockviewReact
        className="dockview-host"
        components={dockviewComponents}
        defaultTabComponent={PanelTab}
        getTabContextMenuItems={() => []}
        onReady={onReady}
      />
    </div>
  );
}
