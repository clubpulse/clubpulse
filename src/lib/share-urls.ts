// Public share links. Kept out of the 'use server' action files, which may only export async functions.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clubpulse.co';

export function getCVShareUrl(slug: string): string {
  return `${APP_URL}/cv/${slug}`;
}

export function getScoutShareUrl(shareToken: string): string {
  return `${APP_URL}/scout/${shareToken}`;
}

export function getScorecardShareUrl(shareToken: string): string {
  return `${APP_URL}/live/${shareToken}`;
}
