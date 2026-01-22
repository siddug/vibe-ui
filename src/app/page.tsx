'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getConnectors,
  createSession,
  type Connector,
  type ApprovalMode,
} from '@/lib/api';
import { WorkDirSelector } from '@/components/chat/WorkDirSelector';
import { ConnectorSelector } from '@/components/chat/ConnectorSelector';
import { ChatInput } from '@/components/chat/ChatInput';
import { Spinner } from '@/components/ui';

export default function HomePage() {
  const router = useRouter();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [workDir, setWorkDir] = useState('~/Documents');
  const [connector, setConnector] = useState('');
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('manual');

  const fetchConnectors = useCallback(async () => {
    try {
      setError(null);
      const connectorsRes = await getConnectors();
      setConnectors(connectorsRes.connectors);
      // Set default connector
      const available = connectorsRes.connectors.filter((c) => c.status === 'available');
      if (available.length > 0 && !connector) {
        setConnector(available[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch connectors');
    } finally {
      setLoading(false);
    }
  }, [connector]);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  const handleSubmit = async () => {
    if (!connector || !workDir || !prompt.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const session = await createSession({
        connector,
        workDir,
        prompt: prompt.trim(),
        enableApprovals: true, // Always enable tool approvals
        approvalMode, // Use selected approval mode
      });
      // Navigate to the new session
      router.push(`/session/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">vibe-ui</h1>
            <p className="text-gray-500">AI Agent Session Manager</p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Configuration Section */}
          <div className="space-y-4">
            {/* Working Directory */}
            <div>
              <label className="block text-sm font-medium mb-2">Working Directory</label>
              <WorkDirSelector value={workDir} onChange={setWorkDir} />
            </div>

            {/* Connector Row */}
            <div className="flex items-center justify-between">
              <ConnectorSelector
                connectors={connectors}
                value={connector}
                onChange={setConnector}
              />
            </div>

            {/* Approval Mode Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Approval Mode</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalMode('manual')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    approvalMode === 'manual'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">Manual</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Approve each tool call
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalMode('auto')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    approvalMode === 'auto'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">Auto Approve</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Approve all automatically
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div>
            <ChatInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleSubmit}
              disabled={!connector || connectors.filter(c => c.status === 'available').length === 0}
              submitting={submitting}
              placeholder="What would you like the agent to do? (Enter to send, Shift+Enter for new line)"
            />
          </div>

          {/* Connectors Status */}
          {connectors.length > 0 && (
            <div className="pt-4 border-t border-[var(--card-border)]">
              <p className="text-xs text-gray-500 mb-2">Available Connectors:</p>
              <div className="flex flex-wrap gap-2">
                {connectors.map((c) => (
                  <span
                    key={c.name}
                    className={`px-2 py-1 text-xs rounded-full ${
                      c.status === 'available'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}
                  >
                    {c.displayName}
                    {c.version && ` v${c.version}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
