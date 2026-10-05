import { EditorPanel, HeaderPanel, ResourcesPanel } from '../components/EditorPanel';
import { ReplPanel } from '../components/ReplPanel';
import { TicPanel } from '../components/TicPanel';
import { REPL_LANGUAGES, replLanguage } from './replConfig';
import type { PanelDefinition, PanelId } from './types';

export const panelRegistry: Record<PanelId, PanelDefinition> = {
  tic: {
    component: TicPanel,
    title: 'TIC-80',
  },
  editor: {
    component: EditorPanel,
    title: 'Editor',
  },
  // The two other parts of the cart file (see bridge/cartFormat.ts), as tabs behind the editor.
  header: {
    component: HeaderPanel,
    title: 'Header',
  },
  resources: {
    component: ResourcesPanel,
    title: 'Assets',
  },
  repl: {
    component: ReplPanel,
    title: REPL_LANGUAGES[replLanguage ?? 'lua'].title,
    // Keep the iframe mounted while its tab is hidden: unmounting it would restart the interpreter
    // and lose every variable.
    renderer: 'always',
  },
};

export const dockviewComponents = Object.fromEntries(
  Object.entries(panelRegistry).map(([id, def]) => [id, def.component]),
) as Record<PanelId, PanelDefinition['component']>;
