import { replLanguage } from './replConfig';
import type { DefaultPanelPlacement } from './types';

const placements: DefaultPanelPlacement[] = [
  { id: 'tic', initialWidth: 420 },
  { id: 'editor', relativeTo: 'tic', direction: 'right' },
  // Tabs of the editor's group, behind it: there for whoever looks for them, out of the way of
  // whoever does not.
  { id: 'header', relativeTo: 'editor', direction: 'within', inactive: true },
  { id: 'resources', relativeTo: 'editor', direction: 'within', inactive: true },
  { id: 'repl', relativeTo: 'editor', direction: 'below', initialHeight: 240 },
];

export const defaultLayout: DefaultPanelPlacement[] = replLanguage
  ? placements
  : placements.filter((placement) => placement.id !== 'repl');
