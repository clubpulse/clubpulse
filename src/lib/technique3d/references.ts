import type { TechniqueMode, TechniqueReference } from './types';
import fastBowling from './references/fast-bowling.json';
import inswingingYorker from './references/inswinging-yorker.json';
import frontFootDrive from './references/front-foot-drive.json';
import backFootDefence from './references/back-foot-defence.json';

export const TECHNIQUE_REFERENCES = [
  fastBowling,
  inswingingYorker,
  frontFootDrive,
  backFootDefence,
] as TechniqueReference[];

export function referencesFor(mode: TechniqueMode): TechniqueReference[] {
  return TECHNIQUE_REFERENCES.filter((reference) => reference.mode === mode);
}

export function referenceById(id: string): TechniqueReference | null {
  return TECHNIQUE_REFERENCES.find((reference) => reference.id === id) ?? null;
}

/** The phase marker that the playhead has reached. */
export function phaseLabel(reference: TechniqueReference, frame: number | null): string | null {
  if (frame == null) return null;
  const markers = [...reference.alignEvents].sort((a, b) => a.frame - b.frame);
  let label: string | null = null;
  for (const marker of markers) if (frame >= marker.frame) label = marker.label;
  return label;
}
