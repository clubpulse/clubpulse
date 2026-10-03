const numberFormat = new Intl.NumberFormat('en-GB');
const gbpFormat = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function formatCreds(n: number): string {
  return numberFormat.format(Math.round(n));
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Takes pence. 50 Creds = £1, so 1 Cred = 2p: formatGBP(credsToPence(n)).
export function formatGBP(p: number): string {
  return gbpFormat.format(p / 100);
}

export function credsToPence(creds: number): number {
  return creds * 2;
}
