'use client';

import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui';
import { SessionDetailView } from './SessionDetailView';

interface SessionDetailModalProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

export function SessionDetailModal({ sessionId, open, onClose }: SessionDetailModalProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onClose={onClose} className="max-w-5xl w-full max-h-[90vh]">
      <SessionDetailView
        sessionId={sessionId}
        compact
        showCloseButton
        onClose={onClose}
        onNavigateHome={() => {
          onClose();
          router.push('/');
        }}
      />
    </Dialog>
  );
}
