// POST /api/stripe/webhook
//
// The address the Stripe dashboard is set to call. The handler lives at /api/club/stripe/webhook;
// this is the same handler at the shorter address, so both work. Until this file existed Stripe
// was calling an address that was not there, and every event failed.

export { POST } from '@/app/api/club/stripe/webhook/route';
