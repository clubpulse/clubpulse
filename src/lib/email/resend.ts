// Server-only. Sends a plain-text email through Resend. Never throws: an email that fails to
// send must not break the thing that triggered it. Does nothing if no key is configured.

const FROM = process.env.EMAIL_FROM ?? 'ClubPulse <hello@clubpulse.co>';

/** Header values must be one line, or a crafted club name could add its own headers. */
const oneLine = (s: string, max: number) => s.replace(/[\r\n]+/g, ' ').trim().slice(0, max);

export async function sendEmail(input: { to: string; subject: string; text: string; replyTo?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: oneLine(input.subject, 150),
        text: input.text,
        ...(input.replyTo ? { reply_to: oneLine(input.replyTo, 200) } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error('[email] Resend refused the message:', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.error('[email] could not send:', err);
    return false;
  }
}
