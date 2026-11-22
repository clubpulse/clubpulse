import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getAcademy, getAcademyLesson } from '@/lib/academy/service';
import { LessonPlayer } from '@/components/academy/LessonPlayer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Academy lesson' };

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  // getAcademyLesson returns the questions without the answers
  const [lesson, academy] = await Promise.all([getAcademyLesson(user.id, id), getAcademy(user.id)]);
  if (!lesson) notFound();
  return (
    <article style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <p><Link href={`/academy/tracks/${lesson.track}`}>← {lesson.trackTitle}</Link></p>
      <h1>{lesson.title}</h1>
      <p style={{ opacity: 0.7 }}>{lesson.minutes} minutes{lesson.passed ? ' · passed' : ''}</p>
      <p>{lesson.intro}</p>
      <h2>Key points</h2>
      <ul>{lesson.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
      <h2>Try it</h2>
      <p>{lesson.tryIt}</p>
      <LessonPlayer id={lesson.id} questions={lesson.questions} passed={lesson.passed} trackKey={lesson.track} scores={academy.scores.lesson} />
    </article>
  );
}
