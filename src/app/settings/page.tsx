'use client';

import { useRouter } from 'next/navigation';
import { SettingsContent } from '@/components/layout/SettingsContent';

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 bg-[var(--card-bg)] border-b border-[var(--card-border)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <SettingsContent />
        </div>
      </div>
    </div>
  );
}
