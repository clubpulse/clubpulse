/** Off unless NEXT_PUBLIC_CAMERA_DRILLS_ENABLED is exactly "true". */
export const CAMERA_DRILLS_FLAG = 'NEXT_PUBLIC_CAMERA_DRILLS_ENABLED';

export function cameraDrillsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[CAMERA_DRILLS_FLAG] === 'true';
}
