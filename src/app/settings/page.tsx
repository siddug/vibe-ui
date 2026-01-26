'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getApiKeys,
  saveApiKey,
  deleteApiKey,
  type ApiKey,
} from '@/lib/api';
import { Button, Input, Card, CardHeader, CardContent, Spinner, Dropdown } from '@/components/ui';

const PROVIDERS = [
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add key form state
  const [provider, setProvider] = useState('mistral');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    try {
      setError(null);
      const data = await getApiKeys();
      setApiKeys(data.apiKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) {
      setError('Please enter an API key');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveApiKey({ provider, apiKey: apiKeyInput });
      setApiKeyInput('');
      fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (providerToDelete: string) => {
    if (!confirm(`Are you sure you want to delete the ${providerToDelete} API key?`)) {
      return;
    }

    try {
      await deleteApiKey(providerToDelete);
      fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

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
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* API Keys Section */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">API Keys</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage API keys for external services. Keys are stored securely and used for session name generation and other features.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Keys */}
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner className="h-5 w-5 text-gray-400" />
                </div>
              ) : apiKeys.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">Saved Keys</h3>
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {PROVIDERS.find((p) => p.value === key.provider)?.label || key.provider}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">{key.apiKey}</div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteKey(key.provider)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm py-4">
                  No API keys saved yet
                </div>
              )}

              {/* Add New Key */}
              <div className="pt-4 border-t border-[var(--card-border)] space-y-3">
                <h3 className="text-sm font-medium text-gray-500">Add New Key</h3>
                <div className="flex gap-3">
                  <Dropdown
                    value={provider}
                    onChange={setProvider}
                    options={PROVIDERS}
                    className="min-w-[140px]"
                  />
                  <Input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Enter API key..."
                    className="flex-1"
                  />
                  <Button onClick={handleSaveKey} disabled={saving || !apiKeyInput.trim()}>
                    {saving ? <Spinner className="h-4 w-4" /> : 'Save'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">About</h2>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-500 space-y-2">
                <p><strong>VibeX</strong> - AI Agent Session Manager</p>
                <p>A web interface for managing AI coding agent sessions with vibe-server.</p>
                <p>Features:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Create and manage coding sessions with AI agents</li>
                  <li>Kanban board view for session organization</li>
                  <li>Real-time log streaming</li>
                  <li>Tool call approval workflow</li>
                  <li>Session follow-ups and continuation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
