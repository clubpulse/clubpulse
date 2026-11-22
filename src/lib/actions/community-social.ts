'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, saveProfile, answerPerson, report, block, sendMessage } from '@/lib/community/service';
import { setFollow, saveClubProfile, parentCancelRequest, parentBlock, parentReport } from '@/lib/community/social';
import { createPost, toggleLike, addComment, getComments } from '@/lib/community/service';
import { requireAdmin } from '@/lib/auth/admin';
import { resolveItem } from '@/lib/community/review';
import { createAdminClient } from '@/lib/supabase/admin';
import { markRead } from '@/lib/community/notify';
import { requestJunior, decideAsParent, endContact } from '@/lib/community/guardian';
import { postShortage, replyToShortage, closeShortage, getReplies, type ShortageReply } from '@/lib/community/shortages';
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

/** Yes or "not now" on a card, returning whether it became a connection. */
export async function connectAnswerAction(userId: string, yes: boolean): Promise<R & { link?: 'requested' | 'connected' | 'passed' }> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  const r = await answerPerson(u.id, userId, yes);
  if (!r.success) return { success: false, error: r.error };
  revalidatePath('/community/connections');
  return { success: true, link: r.data.link };
}

export async function markNotificationsReadAction(): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  await markRead(createAdminClient(), u.id);
  revalidatePath('/community/notifications');
  return { success: true };
}

export async function askParentAction(juniorId: string, note: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await requestJunior(u.id, juniorId, note), 'Sent to their parent. Nothing happens unless they approve.', `/community/people/${juniorId}`);
}

export async function decideRequestAction(requestId: string, approve: boolean): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await decideAsParent(u.id, requestId, approve), approve ? 'Approved. Your child will be asked next.' : 'Declined.', '/parent/community');
}

export async function endContactAction(requestId: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await endContact(u.id, requestId), 'Ended.', '/parent/community');
}

export async function postShortageAction(input: Record<string, unknown>): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await postShortage(u.id, input as never), 'Posted. People nearby can now say they can play.', '/community/shortages');
}
export async function replyShortageAction(shortageId: string, on: boolean): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await replyToShortage(u.id, shortageId, on), on ? 'Sent. They will see your name.' : 'Taken back.', '/community/shortages');
}
export async function closeShortageAction(shortageId: string, status: 'filled' | 'cancelled'): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await closeShortage(u.id, shortageId, status), status === 'filled' ? 'Marked as filled.' : 'Cancelled.', '/community/shortages');
}
export async function shortageRepliesAction(shortageId: string): Promise<{ success: boolean; error?: string; replies?: ShortageReply[] }> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  const r = await getReplies(u.id, shortageId);
  return r.success ? { success: true, replies: r.data } : { success: false, error: r.error };
}

export async function reportProfileAction(userId: string, reason: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await report(u.id, { kind: 'profile', targetId: userId, reason }), 'Thank you. We will look at this.', '/community/connections');
}

/** Send a private message. Delivered at once if the safety check passes; otherwise the sender is told why it was not. */
export async function sendMessageAction(connectionId: string, body: string): Promise<R & { delivered?: boolean }> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  const r = await sendMessage(u.id, connectionId, body);
  if (!r.success) return { success: false, error: r.error };
  if (r.data.status === 'live') { revalidatePath(`/community/messages/${connectionId}`); return { success: true, delivered: true }; }
  return { success: true, delivered: false, message: r.data.tell ?? 'This was not delivered.' };
}

export async function reportMessageAction(messageId: string, reason: string): Promise<R> {
  const u = await requireUser(); if (!communityOpen()) return CLOSED;
  return done(await report(u.id, { kind: 'message', targetId: messageId, reason }), 'Thank you. We will look at this.', '/community/connections');
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
