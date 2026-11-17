// Feature flags. Expo inlines EXPO_PUBLIC_* at build time, so a flag change needs a new build or OTA update.

// The Deals screen shows Awin discount codes. Keep this off until the advertisers are
// approved in Awin and the deals route serves real codes instead of sample data.
export const DEALS_ENABLED = process.env.EXPO_PUBLIC_DEALS_ENABLED === 'true';
