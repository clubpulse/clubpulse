'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, saveProfile, answerPerson, report, block } from '@/lib/community/service';
import { setFollow, saveClubProfile, parentCancelRequest, parentBlock, parentReport } from '@/lib/community/social';
import { createPost, toggleLike, addComment, getComments } from '@/lib/community/service';
import { requireAdmin } from '@/lib/auth/admin';
import { resolveItem } from '@/lib/community/review';
import { createSession, joinSession, cancelSession } from '@/lib/community/sessions';

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

// ── Feed ──

export async function postAction(body: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  const r = await createPost(u.id, body);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath('/community/feed');
  return r.data.status === 'held' ? { success: false, error: r.data.tell ?? 'Not posted.', message: r.data.tell ?? undefined } : { success: true, message: 'Posted.' };
}
export async function likeAction(postId: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await toggleLike(u.id, postId), 'Done.', '/community/feed');
}
export async function commentAction(postId: string, body: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  const r = await addComment(u.id, postId, body);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath('/community/feed');
  return r.data.status === 'held' ? { success: false, error: r.data.tell ?? 'Not posted.' } : { success: true, message: 'Replied.' };
}
export async function loadCommentsAction(postId: string) {
  const u = await requireUser(); if (!communityOpen()) return [];
  const r = await getComments(u.id, postId);
  return r.success ? r.data : [];
}
export async function reportContentAction(kind: string, targetId: string, reason: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await report(u.id, { kind, targetId, reason }), 'Thank you. We will look at this.', '/community/feed');
}
export async function moderateAction(action: string, kind: string, targetId: string, reportId: string | null): Promise<R> {
  const staff = await requireAdmin();
  const r = await resolveItem(staff.id, { action, kind, targetId, reportId });
  return done(r, 'Done.', '/admin/community/reports');
}

// ── Nets and pick-up games ──

export async function createSessionAction(input: Record<string, unknown>): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  const r = await createSession(u.id, input as never);
  if (!r.success) return { success: false, error: r.error };
  if (r.data.held) return { success: false, error: r.data.tell ?? 'Not created.' };
  revalidatePath('/community/near');
  return { success: true, message: 'Session created.' };
}
export async function joinSessionAction(sessionId: string, on: boolean): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await joinSession(u.id, sessionId, on), on ? 'You are in.' : 'You have left.', '/community/near');
}
export async function cancelSessionAction(sessionId: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await cancelSession(u.id, sessionId), 'Cancelled.', '/community/near');
}
