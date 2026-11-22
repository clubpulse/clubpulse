'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { submitLessonAction } from '@/lib/actions/academy';

type Props = { id: string; questions: Array<{ q: string; options: string[] }>; passed: boolean; trackKey: string; scores: number };
type Done = Extract<Awaited<ReturnType<typeof submitLessonAction>>, { ok: true }>;

export function LessonPlayer({ id, questions, passed, trackKey, scores }: Props) {
  const [picked, setPicked] = useState<Array<number | null>>(questions.map(() => null));
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ready = picked.every((p) => p !== null);

  return (
    <section aria-label="Check your understanding">
      <h2>Check your understanding</h2>
      {passed && !done && <p>You have already passed this one. You can try again for practice; Scores are paid once.</p>}
      {questions.map((q, qi) => (
        <fieldset key={qi} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <legend style={{ padding: '0 6px' }}>{qi + 1}. {q.q}</legend>
          {q.options.map((o, oi) => {
            const r = done?.results[qi];
            const mark = done ? (oi === r?.answer ? ' ✓' : picked[qi] === oi ? ' ✗' : '') : '';
            return <div key={oi}><label><input type="radio" name={`q${qi}`} disabled={!!done} checked={picked[qi] === oi} onChange={() => setPicked((p) => p.map((x, i) => (i === qi ? oi : x)))} /> {o}{mark}</label></div>;
          })}
          {done && <p style={{ margin: '8px 0 0', opacity: 0.85 }}>{done.results[qi].correct ? 'Right. ' : 'Not quite. '}{done.results[qi].why}</p>}
        </fieldset>
      ))}
      {!done && (
        <button type="button" disabled={!ready || pending} style={{ background: '#2DD4BF', color: '#0B1220', border: 0, borderRadius: 10, padding: '10px 16px', fontWeight: 600 }}
          onClick={() => start(async () => { setError(null); const r = await submitLessonAction(id, picked as number[]); if (r.ok) setDone(r); else setError(r.error); })}>
          {pending ? 'Marking…' : 'Check my answers'}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {done && (
        <div role="status" style={{ marginTop: 12 }}>
          <p><strong>{done.score} out of 3.</strong> {done.passed ? 'Passed.' : 'You need two right to pass. Have another look at the points above and try again.'}</p>
          {done.firstPass && scores > 0 && done.amount > 0 && <p>You earned {done.amount} Scores for passing this lesson.</p>}
          {done.trackBonus > 0 && <p>Track finished: {done.trackBonus} bonus Scores.</p>}
          {done.trackDone && <p>You have finished {done.trackDone}. <Link href={`/academy/certificate/${trackKey}`}>Open your certificate</Link>.</p>}
          {done.badges.includes('academy-graduate') && <p>You are now an Academy Graduate. <Link href="/academy/certificate/graduate">Open your graduate certificate</Link>.</p>}
          {!done.passed && <button type="button" onClick={() => { setDone(null); setPicked(questions.map(() => null)); }}>Try again</button>}
        </div>
      )}
    </section>
  );
}
