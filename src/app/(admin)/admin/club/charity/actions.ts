'use server';

import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getAllClubCharities, adminGetPendingDonations, adminGetDonationBatches, getCharitySettings } from '@/lib/actions/charity';
import type { ClubCharity, CharitySettings, CharityDonationBatch } from '@/lib/types/charity';
import type { PendingDonationGroup } from '@/lib/actions/charity';
import type { ActionResult } from '@/lib/types/action';

interface AdminCharityPageData {
  clubId: string;
  charities: ClubCharity[];
  pending: PendingDonationGroup[];
  batches: CharityDonationBatch[];
  settings: CharitySettings;
}

export async function getAdminCharityPageData(): Promise<ActionResult<AdminCharityPageData>> {
  try {
    const { clubId } = await requireClubAdminPage();
    const [charitiesRes, pendingRes, batchesRes, settingsRes] = await Promise.all([
      getAllClubCharities(clubId),
      adminGetPendingDonations(clubId),
      adminGetDonationBatches(clubId),
      getCharitySettings(clubId),
    ]);
    return {
      success: true,
      data: {
        clubId,
        charities: charitiesRes.success ? charitiesRes.data : [],
        pending: pendingRes.success ? pendingRes.data : [],
        batches: batchesRes.success ? batchesRes.data : [],
        settings: settingsRes.success ? settingsRes.data : { scores_per_pound: 1000, is_enabled: true },
      },
    };
  } catch {
    return { success: false, error: 'You must be a club admin to access this page.' };
  }
}
