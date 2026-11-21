import type { AvailabilityStatus } from '@/lib/types/availability';

export const MAX_XI = 11;

export type XICheck = {
  ok: boolean;
  /** Hard problems: the XI cannot be saved. */
  errors: string[];
  /** Soft problems: the XI can be saved, but the picker should see them. */
  warnings: string[];
};

/**
 * Check a proposed XI.
 * Hard errors: more than 11, duplicates, or a twelfth man who is also in the XI.
 * Warnings: fewer than 11 named, or someone who said they are unavailable.
 */
export function checkXI(input: {
  players: string[];
  twelfthMan: string | null;
  statusOf: (userId: string) => AvailabilityStatus | undefined;
  nameOf?: (userId: string) => string;
}): XICheck {
  const { players, twelfthMan, statusOf, nameOf = (id) => id } = input;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (players.length > MAX_XI) errors.push(`An XI can have at most ${MAX_XI} players (you picked ${players.length}).`);
  if (new Set(players).size !== players.length) errors.push('A player is picked twice.');
  if (twelfthMan && players.includes(twelfthMan)) errors.push('The twelfth man is already in the XI.');

  if (players.length > 0 && players.length < MAX_XI) {
    warnings.push(`Only ${players.length} named. A full side is ${MAX_XI}.`);
  }
  const unavailable = [...players, ...(twelfthMan ? [twelfthMan] : [])].filter((id) => statusOf(id) === 'unavailable');
  if (unavailable.length > 0) {
    warnings.push(`${unavailable.map(nameOf).join(', ')} said they can't play.`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

export type MyXIState = 'in' | 'twelfth' | 'out' | 'pending';

/** What a player sees: are they in, on the bench, left out, or is the team not yet named. */
export function myXIState(
  selection: { selected_players: string[]; twelfth_man: string | null } | null | undefined,
  userId: string,
): MyXIState {
  if (!selection) return 'pending';
  if (selection.selected_players.includes(userId)) return 'in';
  if (selection.twelfth_man === userId) return 'twelfth';
  return 'out';
}
