import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, display_name, primary_sport, created_at')
    .eq('id', userId)
    .maybeSingle();

  const fullName    = profile?.full_name    ?? 'New Player';
  const displayName = profile?.display_name ?? fullName;
  const sport       = profile?.primary_sport ?? 'Cricket';
  const debutYear   = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();
  const cardNumber  = userId.replace(/-/g, '').slice(0, 4).toUpperCase();

  const nameParts = displayName.split(' ');
  const nameLine1 = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ');
  const nameLine2 = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f2318;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a3326;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#fbbf24;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="400" height="560" fill="url(#bgGrad)" rx="16"/>

  <!-- Gold border outer -->
  <rect x="6" y="6" width="388" height="548" fill="none" stroke="url(#goldGrad)" stroke-width="3" rx="13"/>
  <!-- Inner accent line -->
  <rect x="14" y="14" width="372" height="532" fill="none" stroke="#f59e0b" stroke-width="0.5" rx="8" stroke-opacity="0.4"/>

  <!-- Cricket stumps (top-right corner) -->
  <g opacity="0.12" transform="translate(300, 30)">
    <rect x="0"  y="0" width="6" height="80" fill="#f59e0b" rx="2"/>
    <rect x="14" y="0" width="6" height="80" fill="#f59e0b" rx="2"/>
    <rect x="28" y="0" width="6" height="80" fill="#f59e0b" rx="2"/>
    <rect x="-2" y="-6" width="38" height="5" fill="#f59e0b" rx="2"/>
  </g>

  <!-- Cricket ball (bottom-left corner) -->
  <g opacity="0.08" transform="translate(20, 440)">
    <circle cx="40" cy="40" r="38" fill="#c53030"/>
    <path d="M 40 2 Q 70 40 40 78" fill="none" stroke="#f59e0b" stroke-width="2"/>
    <path d="M 40 2 Q 10 40 40 78" fill="none" stroke="#f59e0b" stroke-width="2"/>
    <path d="M 2 40 Q 40 10 78 40" fill="none" stroke="#f59e0b" stroke-width="2"/>
    <path d="M 2 40 Q 40 70 78 40" fill="none" stroke="#f59e0b" stroke-width="2"/>
  </g>

  <!-- DEBUT badge -->
  <rect x="24" y="28" width="90" height="26" fill="#f59e0b" rx="4"/>
  <text x="69" y="46" font-family="'Arial Black', Arial, sans-serif" font-size="12" font-weight="900" fill="#0f2318" text-anchor="middle" letter-spacing="2">DEBUT</text>

  <!-- Card number -->
  <text x="376" y="46" font-family="'Courier New', monospace" font-size="13" fill="#f59e0b" text-anchor="end" opacity="0.7">#${cardNumber}</text>

  <!-- Divider below badge -->
  <line x1="24" y1="70" x2="376" y2="70" stroke="#f59e0b" stroke-width="0.5" opacity="0.3"/>

  <!-- Player avatar -->
  <circle cx="200" cy="180" r="88" fill="#1e4a30" stroke="#f59e0b" stroke-width="2" opacity="0.9"/>
  <text x="200" y="200" font-size="72" text-anchor="middle" opacity="0.3">&#x1F3CF;</text>

  <!-- Player name -->
  ${nameLine2
    ? `<text x="200" y="308" font-family="'Arial Black', Arial, sans-serif" font-size="30" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow)">${nameLine1}</text>
       <text x="200" y="342" font-family="'Arial Black', Arial, sans-serif" font-size="30" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow)">${nameLine2}</text>`
    : `<text x="200" y="325" font-family="'Arial Black', Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#glow)">${nameLine1}</text>`
  }

  <!-- Gold separator -->
  <rect x="80" y="358" width="240" height="2" fill="url(#goldGrad)" rx="1"/>

  <!-- Sport label -->
  <text x="200" y="390" font-family="Arial, sans-serif" font-size="14" fill="#f59e0b" text-anchor="middle" letter-spacing="3" font-weight="600">${sport.toUpperCase()}</text>

  <!-- Debut year watermark + label -->
  <text x="200" y="420" font-family="'Arial Black', Arial, sans-serif" font-size="42" font-weight="900" fill="#ffffff" text-anchor="middle" opacity="0.15">${debutYear}</text>
  <text x="200" y="450" font-family="Arial, sans-serif" font-size="13" fill="#a7f3d0" text-anchor="middle" opacity="0.8">CLASS OF ${debutYear}</text>

  <!-- Bottom divider -->
  <line x1="24" y1="475" x2="376" y2="475" stroke="#f59e0b" stroke-width="0.5" opacity="0.3"/>

  <!-- ClubPulse branding -->
  <text x="200" y="505" font-family="'Arial Black', Arial, sans-serif" font-size="16" font-weight="900" fill="#f59e0b" text-anchor="middle" letter-spacing="1">ClubPulse</text>
  <text x="200" y="525" font-family="Arial, sans-serif" font-size="10" fill="#6ee7b7" text-anchor="middle" opacity="0.6" letter-spacing="2">GRASSROOTS CRICKET</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
