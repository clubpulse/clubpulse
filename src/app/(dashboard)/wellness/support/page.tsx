import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';

export const metadata: Metadata = { title: 'Where to get support | Wellness' };

const box = { padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', marginBottom: 12 } as const;

export default async function SupportPage() {
  await requireUser();
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>Where to get support</h1>
      <p role="note">ClubPulse Wellness is general preparation for sport. It is not medical advice, not a clinical or counselling service, and it does not replace a doctor, therapist or your club’s welfare officer.</p>
      <div style={box}><h2 style={{ marginTop: 0 }}>In an emergency</h2><p style={{ margin: 0 }}>If you or someone else is in immediate danger, call <strong>999</strong>.</p></div>
      <div style={box}><h2 style={{ marginTop: 0 }}>Someone to talk to, any time</h2><p style={{ margin: 0 }}><strong>Samaritans</strong>: call <a href="tel:116123">116 123</a> (free, 24 hours). <a href="https://www.samaritans.org" target="_blank" rel="noopener noreferrer">samaritans.org</a></p></div>
      <div style={box}><h2 style={{ marginTop: 0 }}>Information and support</h2><p style={{ margin: 0 }}><strong>Mind</strong>: advice on mental health and where to find help in your area. <a href="https://www.mind.org.uk" target="_blank" rel="noopener noreferrer">mind.org.uk</a></p></div>
      <div style={box}><h2 style={{ marginTop: 0 }}>Urgent, but not an emergency</h2><p style={{ margin: 0 }}><strong>NHS 111</strong>: call <a href="tel:111">111</a>, or use 111 online, for urgent medical help. For anything else, speak to your GP.</p></div>
      <div style={box}><h2 style={{ marginTop: 0 }}>If you are under 18</h2><p style={{ margin: 0 }}>Talk to a parent or guardian, a teacher or school welfare lead, or your club’s welfare officer. You do not have to deal with it on your own.</p></div>
      <div style={box}><h2 style={{ marginTop: 0 }}>Injuries</h2><p style={{ margin: 0 }}>For pain or an injury that worries you, speak to a physio, your GP or a trusted adult before you play again.</p></div>
    </div>
  );
}
