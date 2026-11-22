import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { getAcademy } from '@/lib/academy/service';
import { PlanForm } from '@/components/academy/PlanForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Practice plan | Academy' };

export default async function AcademyPlanPage() {
  const user = await requireUser();
  const a = await getAcademy(user.id);
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <p><Link href="/academy">← Academy</Link></p>
      <h1>Your practice plan</h1>
      <p>A one-week plan built from the Academy lessons. It is general cricket practice, not medical or fitness advice. Use a soft ball unless you are in a supervised net.</p>
      <PlanForm left={a.plansLeftThisWeek} />
      {a.plan && (
        <section style={{ marginTop: 24 }}>
          <h2>{a.plan.focus}</h2>
          <p>{a.plan.summary}</p>
          <ol>
            {a.plan.days.map((d) => (
              <li key={d.day} style={{ marginBottom: 10 }}>
                <strong>{d.title}</strong> · {d.minutes} min
                <div>{d.activity}</div>
                {d.lessonId && <Link href={`/academy/lessons/${d.lessonId}`}>Lesson: {d.lessonTitle}</Link>}
              </li>
            ))}
          </ol>
          <p style={{ fontSize: 13, opacity: 0.8 }}>{a.plan.fromCoachAi ? 'Written by Coach AI from the Academy lessons.' : 'Built from the Academy lessons.'}</p>
        </section>
      )}
    </div>
  );
}
