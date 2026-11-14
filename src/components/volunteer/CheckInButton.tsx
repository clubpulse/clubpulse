'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VOLUNTEER_ROLES } from '@/lib/types/volunteer';

type Result = { gpsConfirmed: boolean; distanceMetres: number };

export function CheckInButton() {
  const [role, setRole] = useState<string>(VOLUNTEER_ROLES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  function checkIn() {
    if (!navigator.geolocation) {
      toast.error('Location is not available on this device');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch('/api/volunteer/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role,
              sessionDate: new Date().toISOString().slice(0, 10),
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast.error(body.error ?? 'Check-in failed');
            return;
          }
          setResult(body);
          toast.success(body.gpsConfirmed ? 'Checked in. Waiting for your club to confirm.' : 'Check-in recorded for review');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setLoading(false);
        toast.error(error.code === error.PERMISSION_DENIED ? 'Allow location access to check in' : 'Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <Card title="Volunteer check-in" description="Check in at your club ground to earn Scores once your club confirms">
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white"
          aria-label="Volunteer role"
        >
          {VOLUNTEER_ROLES.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <Button onClick={checkIn} loading={loading} className="sm:flex-1">📍 Check in here</Button>
      </div>
      {result && (
        <p className="mt-3 text-xs text-neutral-400">
          {result.gpsConfirmed
            ? `You're at the ground (${result.distanceMetres} m away).`
            : `You're ${result.distanceMetres} m from the ground, so a club admin will need to review this.`}
        </p>
      )}
    </Card>
  );
}
