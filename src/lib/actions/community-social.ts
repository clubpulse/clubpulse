'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, saveProfile, answerPerson, report, block } from '@/lib/community/service';
import { setFollow, saveClubProfile, parentCancelRequest, parentBlock, parentReport } from '@/lib/community/social';

type R = { success: boolean; error?: string; message?: string };
const CLOSED: R = { success: false, error: 'The Community is not open yet.' };
const done = (r: { success: boolean; error?: string }, message: string, path: string): R => {
  if (!r.success) return { success: false, error: r.error };
  revalidatePath(path);
  return { success: true, message };
};

export async function saveMyProfileAction(input: unknown): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  const r = await saveProfile(u.id, input);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath('/community/profile');
  return { success: true, message: r.data.status === 'held' ? (r.data.tell ?? 'Your profile is being checked before it shows.') : 'Saved.' };
}

export async function followAction(subject: string, subjectId: string, on: boolean): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await setFollow(u.id, subject, subjectId, on), on ? 'Following.' : 'Unfollowed.', subject === 'club' ? `/community/clubs/${subjectId}` : `/community/people/${subjectId}`);
}

export async function connectAction(userId: string, yes: boolean): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await answerPerson(u.id, userId, yes), yes ? 'Done.' : 'Not now.', '/community/connections');
}

export async function reportProfileAction(userId: string, reason: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await report(u.id, { kind: 'profile', targetId: userId, reason }), 'Thank you. We will look at this.', '/community/connections');
}

export async function blockAction(userId: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await block(u.id, userId), 'Blocked.', '/community/connections');
}

export async function saveClubProfileAction(clubId: string, input: unknown): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  const r = await saveClubProfile(u.id, clubId, input);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath(`/community/clubs/${clubId}`);
  return { success: true, message: r.data.status === 'held' ? (r.data.tell ?? 'Being checked before it shows.') : 'Saved.' };
}

export async function parentCancelAction(childId: string, connectionId: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await parentCancelRequest(u.id, childId, connectionId), 'Request cancelled.', '/parent/community');
}
export async function parentBlockAction(childId: string, otherId: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await parentBlock(u.id, childId, otherId), 'Blocked on your child’s behalf.', '/parent/community');
}
export async function parentReportAction(childId: string, kind: string, targetId: string, reason: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await parentReport(u.id, childId, { kind, targetId, reason }), 'Thank you. We will look at this.', '/parent/community');
}
