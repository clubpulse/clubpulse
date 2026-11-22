import { DobForm } from '@/components/community/DobForm';

/** Shown across the dashboard to a signed-in person whose date of birth is not on file, whether or not the Community is open. */
export function DobPrompt() {
  return (
    <section aria-label="Add your date of birth" style={{ margin: '0 0 16px', padding: 16, borderRadius: 12, border: '1px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.1)', display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Add your date of birth</h2>
      <p style={{ margin: 0, opacity: 0.85 }}>Under-18s have extra protections, so we need to know. It is saved once and kept private. It is needed before you can use the Community.</p>
      <DobForm />
    </section>
  );
}
