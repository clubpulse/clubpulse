// Feature flags. Expo inlines EXPO_PUBLIC_* at build time, so a flag change needs a new build or OTA update.

// The Deals screen shows Awin discount codes. Keep this off until the advertisers are
// approved in Awin and the deals route serves real codes instead of sample data.
export const DEALS_ENABLED = process.env.EXPO_PUBLIC_DEALS_ENABLED === 'true';

// The Store and scratch cards. Keep this off until purchases go through Apple's in-app
// purchase, the draw happens on the server, and the prize codes are real: today the cards
// open for free, the buy buttons do nothing, and the brand codes are samples.
export const STORE_ENABLED = process.env.EXPO_PUBLIC_STORE_ENABLED === 'true';

// Legal pages, opened in the in-app browser. Apple and Google both require the privacy policy
// to be reachable from inside the app. They live on the website at /privacy and /terms; the
// two variables are only for pointing somewhere else.
const SITE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'https://clubpulse.co';
export const PRIVACY_URL: string | null = process.env.EXPO_PUBLIC_PRIVACY_URL || `${SITE}/privacy`;
export const TERMS_URL: string | null = process.env.EXPO_PUBLIC_TERMS_URL || `${SITE}/terms`;
