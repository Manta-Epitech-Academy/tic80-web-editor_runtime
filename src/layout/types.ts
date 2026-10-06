import type { FunctionComponent } from 'react';
import type { Direction, DockviewPanelRenderer, IDockviewPanelProps } from 'dockview';
import { replLanguage } from './replConfig';

export const PANEL_IDS = ['tic', 'editor', 'header', 'resources', 'repl'] as const;
export type PanelId = (typeof PANEL_IDS)[number];

// Panels that are put back when closed. The REPL is one of them only when the page has one
// (`?repl=off` turns it off, see replConfig.ts).
export const ESSENTIAL_PANEL_IDS: readonly PanelId[] = replLanguage
  ? ['tic', 'editor', 'header', 'resources', 'repl']
  : ['tic', 'editor', 'header', 'resources'];

export type PanelComponent = FunctionComponent<IDockviewPanelProps>;

export interface PanelDefinition {
  component: PanelComponent;
  title: string;
  renderer?: DockviewPanelRenderer;
}

export interface DefaultPanelPlacement {
  id: PanelId;
  relativeTo?: PanelId;
  direction?: Direction;
  initialWidth?: number;
  initialHeight?: number;
  /** Added as a tab that is not brought to the front. */
  inactive?: boolean;
}

export const LAYOUT_VERSION = 6;
export const LAYOUT_STORAGE_KEY = 'tic80-web-editor-layout';
