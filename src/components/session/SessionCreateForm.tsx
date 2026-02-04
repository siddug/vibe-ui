'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getConnectors,
  createSession,
  fetchFromServer,
  type Connector,
  type ApprovalMode,
  type AgentMode,
  type ImageData,
  type HealthResponse,
} from '@/lib/api';
import { WorkDirSelector } from '@/components/chat/WorkDirSelector';
import { ConnectorSelector } from '@/components/chat/ConnectorSelector';
import { ChatInput } from '@/components/chat/ChatInput';
import { Button, Input, Spinner } from '@/components/ui';
import { useServer } from '@/contexts/ServerContext';
import { parseConfigString } from '@/lib/servers';

interface SessionCreateFormProps {
  onSessionCreated?: (sessionId: string, startedImmediately: boolean) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  showSaveToTriageButton?: boolean;
}

export function SessionCreateForm({
  onSessionCreated,
  onCancel,
  showCancelButton = false,
  showSaveToTriageButton = false,
}: SessionCreateFormProps) {
  const { servers, addServer, switchServer } = useServer();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add server form state
  const [configString, setConfigString] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState<{ name: string; url: string } | null>(null);

  // Form state
  const [workDir, setWorkDir] = useState('~/Documents');
  const [connector, setConnector] = useState('');
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittingToTriage, setSubmittingToTriage] = useState(false);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('auto');
  const [agentMode, setAgentMode] = useState<AgentMode>('default');
  const [images, setImages] = useState<ImageData[]>([]);

  const handleValidateServer = async () => {
    setServerError(null);
    setValidated(null);

    if (!configString.trim()) {
      setServerError('Please paste a config string');
      return;
    }

    try {
      const parsed = parseConfigString(configString.trim());
      setValidating(true);
      await fetchFromServer<HealthResponse>(parsed.url, parsed.authKey, '/api/health');
      setValidated({ name: parsed.name, url: parsed.url });
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to validate server');
    } finally {
      setValidating(false);
    }
  };

  const handleAddServer = () => {
    try {
      const parsed = parseConfigString(configString.trim());
      const config = addServer(parsed);
      switchServer(config.id);
      setConfigString('');
      setServerError(null);
      setValidated(null);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Failed to add server');
    }
  };

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
    if (servers.length > 0) {
      fetchConnectors();
    } else {
      setLoading(false);
    }
  }, [fetchConnectors, servers.length]);

  const handleSubmit = async (startImmediately: boolean = true) => {
    if (!connector || !workDir || (!prompt.trim() && images.length === 0)) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    if (!startImmediately) {
      setSubmittingToTriage(true);
    }
    setError(null);

    try {
      const session = await createSession({
        connector,
        workDir,
        prompt: prompt.trim(),
        startImmediately,
        enableApprovals: true,
        approvalMode,
        agentMode,
        images: images.length > 0 ? images : undefined,
      });
      // Reset form state before calling callback to ensure clean dismissal
      setSubmitting(false);
      setSubmittingToTriage(false);
      onSessionCreated?.(session.id, startImmediately);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setSubmitting(false);
      setSubmittingToTriage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-8">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  // No servers configured — show add server form instead of session form
  if (servers.length === 0) {
    return (
      <div className="space-y-6 p-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">No Server Connected</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add a vibe-server to get started with creating sessions.
          </p>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Connection Config</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Paste the connection config string from your vibe-server terminal output.
            </p>
            <Input
              value={configString}
              onChange={(e) => {
                setConfigString(e.target.value);
                setValidated(null);
                setServerError(null);
              }}
              placeholder="vibe://eyJuYW1lIjoi..."
              className="font-mono text-sm"
            />
          </div>

          {serverError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
              {serverError}
            </div>
          )}

          {validated && (
            <div className="text-sm bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded border border-green-200 dark:border-green-800">
              <div className="font-medium text-green-700 dark:text-green-300">Server reachable</div>
              <div className="text-green-600 dark:text-green-400 mt-1">
                <span className="font-medium">{validated.name}</span>
                <span className="text-gray-500 ml-2">{validated.url}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {!validated ? (
              <Button onClick={handleValidateServer} disabled={validating || !configString.trim()}>
                {validating ? 'Validating...' : 'Validate'}
              </Button>
            ) : (
              <Button onClick={handleAddServer}>
                Add & Connect
              </Button>
            )}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium">How to get the connection config</h3>
          <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-2 list-decimal list-inside">
            <li>
              Clone and set up the <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">vibe-server</code> repository
            </li>
            <li>
              Install dependencies with <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">npm install</code>
            </li>
            <li>
              Start the server with <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">npm run dev</code>
            </li>
            <li>
              Copy the <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">vibe://...</code> connection string printed in the terminal
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
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

        {/* Connector */}
        <ConnectorSelector
          connectors={connectors}
          value={connector}
          onChange={setConnector}
        />

        {/* Approval Mode Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Approval Mode</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setApprovalMode('manual')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors cursor-pointer ${
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
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors cursor-pointer ${
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

        {/* Agent Mode Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Agent Mode</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAgentMode('default')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors cursor-pointer ${
                agentMode === 'default'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="font-medium">Default</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Full agent capabilities
              </div>
            </button>
            <button
              type="button"
              onClick={() => setAgentMode('plan')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors cursor-pointer ${
                agentMode === 'plan'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="font-medium">Plan</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Read-only analysis mode
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div>
        <label className="block text-sm font-medium mb-2">Task</label>
        <ChatInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={() => handleSubmit(true)}
          disabled={!connector || connectors.filter(c => c.status === 'available').length === 0}
          submitting={submitting}
          images={images}
          onImagesChange={setImages}
          placeholder="What would you like the agent to do? (Enter to send, Shift+Enter for new line)"
        />
      </div>

      {/* Action Buttons */}
      {(showCancelButton || showSaveToTriageButton) && (
        <div className="flex justify-end gap-2 pt-2">
          {showCancelButton && (
            <Button variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          {showSaveToTriageButton && (
            <Button
              variant="secondary"
              onClick={() => handleSubmit(false)}
              disabled={!connector || !workDir || !prompt.trim() || submitting}
            >
              {submittingToTriage ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Save to Triage
            </Button>
          )}
        </div>
      )}

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
  );
}
