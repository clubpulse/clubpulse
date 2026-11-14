import { createAdminClient } from '@/lib/supabase/admin';
import { haversineDistance } from '@/lib/utils/geo';
import { isFiniteNumber, isIsoDate } from '@/lib/utils/validate';
import { awardVolunteerSessionIfEligible } from '@/lib/volunteer/approve';
import { GPS_RADIUS_METRES, VOLUNTEER_ROLES, type VolunteerRole } from '@/lib/types/volunteer';
import type { ActionResult } from '@/lib/types/action';

export type CheckInInput = {
  userId:      string;   // verified by the caller
  clubId:      string;   // verified membership by the caller
  role:        string;
  sessionDate: string;   // YYYY-MM-DD
  lat:         number;
  lng:         number;
  clubLat:     number;
  clubLng:     number;
};

export type CheckInResult = {
  sessionId:      string;
  gpsConfirmed:   boolean;
  distanceMetres: number;
  scoresAwarded:   number;
};

const utcDate = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

// The GPS position comes from the client, so a determined user can spoof it: the club admin's
// approval is the real control. A check-in outside the ground radius is still recorded
// (gps_confirmed = false) so an admin can review it, but it can never pay out.
export async function checkInVolunteer(input: CheckInInput): Promise<ActionResult<CheckInResult>> {
  if (!(VOLUNTEER_ROLES as readonly string[]).includes(input.role)) {
    return { success: false, error: `Role must be one of: ${VOLUNTEER_ROLES.join(', ')}` };
  }
  if (!isIsoDate(input.sessionDate) || input.sessionDate > utcDate() || input.sessionDate < utcDate(-1)) {
    return { success: false, error: 'Session date must be today or yesterday' };
  }
  if (
    !isFiniteNumber(input.lat) || Math.abs(input.lat) > 90 ||
    !isFiniteNumber(input.lng) || Math.abs(input.lng) > 180
  ) {
    return { success: false, error: 'Invalid location' };
  }

  const distanceMetres = Math.round(haversineDistance(input.lat, input.lng, input.clubLat, input.clubLng));
  const gpsConfirmed = distanceMetres <= GPS_RADIUS_METRES;

  const { data: session, error } = await createAdminClient()
    .from('volunteer_sessions')
    .insert({
      user_id:       input.userId,
      club_id:       input.clubId,
      role:          input.role as VolunteerRole,
      session_date:  input.sessionDate,
      gps_lat:       input.lat,
      gps_lng:       input.lng,
      gps_confirmed: gpsConfirmed,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You have already checked in for this role on that day' };
    }
    return { success: false, error: 'Could not record check-in' };
  }

  // Pays out only if the club has already confirmed (normally false at check-in)
  const award = await awardVolunteerSessionIfEligible(session.id);

  return {
    success: true,
    data: {
      sessionId: session.id,
      gpsConfirmed,
      distanceMetres,
      scoresAwarded: award.success ? award.data.scoresAwarded : 0,
    },
  };
}
