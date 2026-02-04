'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getApiKeys,
  saveApiKey,
  deleteApiKey,
  type ApiKey,
} from '@/lib/api';
import { Button, Input, Card, CardHeader, CardContent, Spinner, Dropdown } from '@/components/ui';
import { useServer } from '@/contexts/ServerContext';
import { AddServerModal } from '@/components/layout/AddServerModal';

const PROVIDERS = [
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
];

export function SettingsContent() {
  const { servers, activeServer, switchServer, removeServer } = useServer();
  const [addServerOpen, setAddServerOpen] = useState(false);
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
    <div className="space-y-6 p-4">
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Servers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Servers</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage connected vibe-server instances. Paste a connection config string from a server&apos;s terminal output to add it.
              </p>
            </div>
            <Button size="sm" onClick={() => setAddServerOpen(true)}>
              Add Server
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {servers.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">
              No servers configured. Add a server to get started.
            </div>
          ) : (
            servers.map((server) => (
              <div
                key={server.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  activeServer?.id === server.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{server.name}</span>
                    {activeServer?.id === server.id && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 font-mono truncate">{server.url}</div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {activeServer?.id !== server.id && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => switchServer(server.id)}
                    >
                      Switch
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Remove server "${server.name}"?`)) {
                        removeServer(server.id);
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AddServerModal open={addServerOpen} onClose={() => setAddServerOpen(false)} />

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
            <div className="flex gap-3 items-center">
              <Dropdown
                value={provider}
                onChange={setProvider}
                options={PROVIDERS}
                className="min-w-[140px] h-10"
              />
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter API key..."
                className="flex-1 h-10"
              />
              <Button onClick={handleSaveKey} disabled={saving || !apiKeyInput.trim()}>
                {saving ? <Spinner className="h-4 w-4" /> : 'Save'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
