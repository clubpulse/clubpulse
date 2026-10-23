import { Metadata } from 'next';
import { AnalyseClient } from '@/components/analyse/AnalyseClient';

export const metadata: Metadata = { title: 'Analyse | ClubPulse', description: 'AI-powered cricket motion analysis' };

export default function AnalysePage() {
  return <AnalyseClient />;
}
