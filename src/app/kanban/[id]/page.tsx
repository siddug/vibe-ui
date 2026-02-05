'use client';

import { useParams } from 'next/navigation';
import { KanbanView } from '@/components/layout/KanbanView';

export default function KanbanSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  return <KanbanView initialSessionId={sessionId} />;
}
