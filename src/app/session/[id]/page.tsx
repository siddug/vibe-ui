'use client';

import { useParams, useRouter } from 'next/navigation';
import { SessionDetailView } from '@/components/session/SessionDetailView';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  return (
    <SessionDetailView
      sessionId={sessionId}
      onNavigateHome={() => router.push('/')}
    />
  );
}
