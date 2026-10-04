import { replLanguage } from './replConfig';
import type { DefaultPanelPlacement } from './types';

const placements: DefaultPanelPlacement[] = [
  { id: 'tic', initialWidth: 420 },
  { id: 'editor', relativeTo: 'tic', direction: 'right' },
  { id: 'repl', relativeTo: 'editor', direction: 'below', initialHeight: 240 },
];

export const defaultLayout: DefaultPanelPlacement[] = replLanguage
  ? placements
  : placements.filter((placement) => placement.id !== 'repl');
