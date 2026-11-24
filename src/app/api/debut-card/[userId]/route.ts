import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const xml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (user.id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, primary_sport, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const fullName = profile?.full_name ?? 'New Player';
  const displayName = profile?.display_name ?? fullName;
  const sport = profile?.primary_sport ?? 'Cricket';
  const debutYear = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();
  const cardNumber = user.id.replace(/-/g, '').slice(0, 4).toUpperCase();

  const nameParts = displayName.split(' ');
  const nameLine1 = xml(nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' '));
  const nameLine2 = xml(nameParts.slice(Math.ceil(nameParts.length / 2)).join(' '));
  const sportLabel = xml(String(sport).toUpperCase());

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
  </defs>
  <rect width="400" height="560" fill="url(#bgGrad)" rx="16"/>
  <rect x="6" y="6" width="388" height="548" fill="none" stroke="url(#goldGrad)" stroke-width="3" rx="13"/>
  <rect x="24" y="28" width="90" height="26" fill="#f59e0b" rx="4"/>
  <text x="69" y="46" font-family="Arial, sans-serif" font-size="12" font-weight="900" fill="#0f2318" text-anchor="middle" letter-spacing="2">DEBUT</text>
  <text x="376" y="46" font-family="Courier New, monospace" font-size="13" fill="#f59e0b" text-anchor="end" opacity="0.7">#${cardNumber}</text>
  ${nameLine2
    ? `<text x="200" y="308" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#ffffff" text-anchor="middle">${nameLine1}</text>
       <text x="200" y="342" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#ffffff" text-anchor="middle">${nameLine2}</text>`
    : `<text x="200" y="325" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">${nameLine1}</text>`}
  <text x="200" y="390" font-family="Arial, sans-serif" font-size="14" fill="#f59e0b" text-anchor="middle" letter-spacing="3">${sportLabel}</text>
  <text x="200" y="450" font-family="Arial, sans-serif" font-size="13" fill="#a7f3d0" text-anchor="middle">CLASS OF ${debutYear}</text>
  <text x="200" y="505" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="#f59e0b" text-anchor="middle" letter-spacing="1">SHIFTUP</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'private, no-store',
    },
  });
}
