const numberFormat = new Intl.NumberFormat('en-GB');
const gbpFormat = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export function formatScores(n: number): string {
  return numberFormat.format(Math.round(n));
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Takes pence. 50 Scores = £1, so 1 Score = 2p: formatGBP(scoresToPence(n)).
export function formatGBP(p: number): string {
  return gbpFormat.format(p / 100);
}

export function scoresToPence(scores: number): number {
  return scores * 2;
}
