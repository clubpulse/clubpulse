'use server';

export async function expressInterest(
  listingId: string,
  clubId: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  // TODO: implement transfer interest submission
  void listingId; void clubId; void message;
  return { success: false, error: 'Transfer marketplace coming soon.' };
}

export async function applyToListing(
  listingId: string,
  coverNote: string,
): Promise<{ success: boolean; error?: string }> {
  // TODO: implement wanted listing application
  void listingId; void coverNote;
  return { success: false, error: 'Transfer marketplace coming soon.' };
}
