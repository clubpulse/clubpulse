/**
 * World landmarks are the player's own estimate. A coach, a club admin, or anyone else does not
 * receive them. A junior's row follows the same rule: only that account can read it.
 */
export function canReadTechniquePose(viewerId: string | null | undefined, ownerId: string): boolean {
  return typeof viewerId === 'string' && viewerId.length > 0 && viewerId === ownerId;
}
