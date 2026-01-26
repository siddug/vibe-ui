'use client';

import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui';
import { SessionCreateForm } from './SessionCreateForm';

interface SessionCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function SessionCreateModal({ open, onClose, onCreated }: SessionCreateModalProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onClose={onClose} title="New Session" className="max-w-2xl">
      <SessionCreateForm
        showCancelButton
        showSaveToTriageButton
        onCancel={onClose}
        onSessionCreated={(sessionId, started) => {
          onCreated();
          onClose();
          if (started) {
            router.push(`/session/${sessionId}`);
          }
        }}
      />
    </Dialog>
  );
}
