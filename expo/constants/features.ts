// Feature flags. Expo inlines EXPO_PUBLIC_* at build time, so a flag change needs a new build or OTA update.

// The Deals screen shows Awin discount codes. Keep this off until the advertisers are
// approved in Awin and the deals route serves real codes instead of sample data.
export const DEALS_ENABLED = process.env.EXPO_PUBLIC_DEALS_ENABLED === 'true';

// The Store and scratch cards. Keep this off until purchases go through Apple's in-app
// purchase, the draw happens on the server, and the prize codes are real: today the cards
// open for free, the buy buttons do nothing, and the brand codes are samples.
export const STORE_ENABLED = process.env.EXPO_PUBLIC_STORE_ENABLED === 'true';

// Legal pages, opened in the in-app browser. Apple and Google both require the privacy policy
// to be reachable from inside the app. The links are hidden until these are set, so the app
// never shows a link to a page that doesn't exist yet.
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || null;
export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || null;
