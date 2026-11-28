/** Off unless NEXT_PUBLIC_3D_TECHNIQUE_ENABLED is exactly "true". */
export const TECHNIQUE_3D_FLAG = 'NEXT_PUBLIC_3D_TECHNIQUE_ENABLED';

export function technique3dEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env[TECHNIQUE_3D_FLAG] === 'true';
}
