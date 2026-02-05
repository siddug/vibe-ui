'use client';

import { useRouter } from 'next/navigation';
import { Dialog } from '@/components/ui';
import { SessionCreateForm } from './SessionCreateForm';
import { useViewMode } from '@/contexts/ViewModeContext';

interface SessionCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onScheduledTaskCreated?: () => void;
}

export function SessionCreateModal({ open, onClose, onCreated, onScheduledTaskCreated }: SessionCreateModalProps) {
  const router = useRouter();
  const { viewMode } = useViewMode();

  return (
    <Dialog open={open} onClose={onClose} title="New Session" className="max-w-4xl w-full" fullHeight>
      <SessionCreateForm
        showCancelButton
        showSaveToTriageButton
        showScheduleButton
        onCancel={onClose}
        onSessionCreated={(sessionId, started) => {
          // Close the modal first to ensure immediate UI feedback
          onClose();
          // Then refresh the board (async, non-blocking)
          onCreated();
          // In kanban mode, stay on the board - the session will appear in the columns
          // In sidebar mode, navigate to the session if it was started
          if (started && viewMode === 'sidebar') {
            router.push(`/session/${sessionId}`);
          }
        }}
        onScheduledTaskCreated={() => {
          onClose();
          onScheduledTaskCreated?.();
        }}
      />
    </Dialog>
  );
}
