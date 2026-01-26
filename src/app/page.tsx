'use client';

import { useRouter } from 'next/navigation';
import { SessionCreateForm } from '@/components/session/SessionCreateForm';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">VibeX</h1>
            <p className="text-gray-500">AI Agent Session Manager</p>
          </div>

          {/* Session Create Form */}
          <SessionCreateForm
            onSessionCreated={(sessionId, startedImmediately) => {
              if (startedImmediately) {
                router.push(`/session/${sessionId}`);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
