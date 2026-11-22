// ─────────────────────────────────────────────
// ShiftUp: Awin Deals API
// GET /api/awin/deals?category=sports_apparel&userId=xxx
// Returns tracked affiliate deals for the mobile app Store & Scratch Card screens.
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import {
  AWIN_MERCHANTS,
  AWIN_CATEGORIES,
  type AwinCategory,
  type AwinDeal,
  type AwinMerchantWithCategory,
  buildAwinLink,
  getMerchantsByCategory,
  pickRandomCategory,
} from '@/lib/awin';

// ── Sample discount codes (replaced by live Awin Product API in production) ──
const SAMPLE_DEALS: { merchantId: string; code: string; discountPct: number; title: string; expiresAt: string | null }[] = [
  { merchantId: '2435',  code: 'JDCLUB10',    discountPct: 10, title: '10% off training wear',          expiresAt: null },
  { merchantId: '11491', code: 'CASTORECR15', discountPct: 15, title: '15% off cricket collection',     expiresAt: null },
  { merchantId: '6461',  code: 'NIKE20RUN',   discountPct: 20, title: '20% off running shoes',          expiresAt: null },
  { merchantId: '6556',  code: 'DECA5OFF',    discountPct: 5,  title: '5% off cricket equipment',       expiresAt: null },
  { merchantId: '15311', code: 'GNBAT10',     discountPct: 10, title: '10% off bats & pads',            expiresAt: null },
  { merchantId: '10498', code: 'SAINS5',      discountPct: 5,  title: '£5 off £40+ grocery shop',       expiresAt: null },
  { merchantId: '9498',  code: 'MYPROTEIN35', discountPct: 35, title: '35% off protein & supplements',  expiresAt: null },
  { merchantId: '3776',  code: 'CURRYS10',    discountPct: 10, title: '10% off fitness trackers',       expiresAt: null },
  { merchantId: '5575',  code: 'AMZFIT15',    discountPct: 15, title: '15% off fitness accessories',    expiresAt: null },
  { merchantId: '14487', code: 'ASOS20',      discountPct: 20, title: '20% off sportswear edit',        expiresAt: null },
  { merchantId: '3022',  code: 'EBAY10OFF',   discountPct: 10, title: '10% off sporting goods',         expiresAt: null },
];

// The deals below are sample data. The route stays dark until AWIN_DEALS_ENABLED=true,
// which should only be set once the advertisers are approved and the codes are real.
function dealsDisabled(): NextResponse | null {
  if (process.env.AWIN_DEALS_ENABLED === 'true') return null;
  return NextResponse.json({ error: 'Deals are not available yet' }, { status: 404 });
}

function merchantById(id: string): AwinMerchantWithCategory | undefined {
  return AWIN_MERCHANTS.find((m) => m.id === id);
}

function buildDealResponse(
  merchantId: string,
  code: string,
  discountPct: number,
  title: string,
  expiresAt: string | null,
  userId?: string
): AwinDeal | null {
  const merchant = merchantById(merchantId);
  if (!merchant) return null;

  return {
    id:           `deal_${merchantId}_${code}`,
    merchantId:   merchant.id,
    merchantName: merchant.name,
    category:     merchant.category,
    title,
    code,
    discountPct,
    deepLink:     userId
      ? buildAwinLink(merchant.id, merchant.deepLink, userId)
      : merchant.deepLink,
    expiresAt,
  };
}

export async function GET(request: NextRequest) {
  const disabled = dealsDisabled();
  if (disabled) return disabled;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as AwinCategory | null;
  const userId   = searchParams.get('userId') ?? undefined;
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50);

  // Validate category if provided
  if (category && !AWIN_CATEGORIES[category]) {
    return NextResponse.json(
      {
        error: 'Invalid category',
        validCategories: Object.keys(AWIN_CATEGORIES),
      },
      { status: 400 }
    );
  }

  // Filter deals by category if specified
  let filteredDeals = SAMPLE_DEALS;
  if (category) {
    const categoryMerchantIds = getMerchantsByCategory(category).map((m) => m.id);
    filteredDeals = SAMPLE_DEALS.filter((d) => categoryMerchantIds.includes(d.merchantId));
  }

  // Build response deals with tracked links
  const deals: AwinDeal[] = filteredDeals
    .slice(0, limit)
    .map((d) => buildDealResponse(d.merchantId, d.code, d.discountPct, d.title, d.expiresAt, userId))
    .filter((d): d is AwinDeal => d !== null);

  return NextResponse.json({
    deals,
    categories: AWIN_CATEGORIES,
    meta: {
      total:    deals.length,
      category: category ?? 'all',
      tracked:  !!userId,
    },
  });
}

/**
 * POST /api/awin/deals
 * Body: { category?: AwinCategory, userId: string }
 * Returns a single random deal for scratch card prize redemption.
 */
export async function POST(request: NextRequest) {
  const disabled = dealsDisabled();
  if (disabled) return disabled;

  try {
    const body = await request.json();
    const { userId, category: requestedCategory } = body as {
      userId: string;
      category?: AwinCategory;
    };

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Pick category — use requested or random weighted
    const category = requestedCategory && AWIN_CATEGORIES[requestedCategory]
      ? requestedCategory
      : pickRandomCategory();

    // Get merchants in this category
    const merchants = getMerchantsByCategory(category);
    if (merchants.length === 0) {
      return NextResponse.json({ error: 'No merchants in category' }, { status: 404 });
    }

    // Pick random merchant + matching deal
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const matchingDeals = SAMPLE_DEALS.filter((d) => d.merchantId === merchant.id);
    const sampleDeal = matchingDeals.length > 0
      ? matchingDeals[Math.floor(Math.random() * matchingDeals.length)]
      : { code: `CP${Math.random().toString(36).slice(2, 8).toUpperCase()}`, discountPct: 10, title: `10% off at ${merchant.name}`, expiresAt: null };

    const deal = buildDealResponse(
      merchant.id,
      sampleDeal.code,
      sampleDeal.discountPct,
      sampleDeal.title,
      sampleDeal.expiresAt,
      userId
    );

    return NextResponse.json({
      deal,
      category: {
        key:   category,
        ...AWIN_CATEGORIES[category],
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
