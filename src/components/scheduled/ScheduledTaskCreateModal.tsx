'use client';

import { useState, useEffect } from 'react';
import { Dialog, Button, Input, Spinner } from '@/components/ui';
import {
  createScheduledTask,
  getConnectors,
  listDirectory,
  type Connector,
  type CreateScheduledTaskRequest,
  type ScheduleType,
  type AgentMode,
  type ApprovalMode,
} from '@/lib/api';

interface ScheduledTaskCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function ScheduledTaskCreateModal({ open, onClose, onCreated }: ScheduledTaskCreateModalProps) {
  // Form state
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [connector, setConnector] = useState('');
  const [workDir, setWorkDir] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('cron');
  const [cronExpression, setCronExpression] = useState('0 9 * * *'); // Default: 9 AM daily
  const [runAt, setRunAt] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [inheritContext, setInheritContext] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('default');
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('auto');

  // UI state
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDirBrowser, setShowDirBrowser] = useState(false);
  const [dirEntries, setDirEntries] = useState<{ name: string; type: string; path: string }[]>([]);
  const [currentPath, setCurrentPath] = useState('~');

  // Load connectors on mount
  useEffect(() => {
    if (open) {
      loadConnectors();
    }
  }, [open]);

  const loadConnectors = async () => {
    try {
      const response = await getConnectors();
      const availableConnectors = response.connectors.filter(c => c.status === 'available');
      setConnectors(availableConnectors);
      if (availableConnectors.length > 0 && !connector) {
        setConnector(availableConnectors[0].name);
      }
    } catch (err) {
      console.error('Failed to load connectors:', err);
    }
  };

  const browseDirctory = async (path: string) => {
    try {
      const response = await listDirectory(path, true);
      setCurrentPath(response.path);
      setDirEntries(response.entries.filter(e => e.type === 'directory'));
    } catch (err) {
      console.error('Failed to list directory:', err);
    }
  };

  const handleSelectDir = (path: string) => {
    setWorkDir(path);
    setShowDirBrowser(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data: CreateScheduledTaskRequest = {
        name,
        prompt,
        connector,
        workDir,
        scheduleType,
        timezone,
        inheritContext,
        agentMode,
        approvalMode,
      };

      if (scheduleType === 'cron') {
        data.cronExpression = cronExpression;
      } else {
        data.runAt = new Date(runAt).toISOString();
      }

      await createScheduledTask(data);
      onCreated();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create scheduled task');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPrompt('');
    setCronExpression('0 9 * * *');
    setRunAt('');
    setInheritContext(false);
    setAgentMode('default');
    setApprovalMode('auto');
    setError(null);
  };

  // Common cron presets
  const cronPresets = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every day at 9 AM', value: '0 9 * * *' },
    { label: 'Every day at midnight', value: '0 0 * * *' },
    { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5' },
    { label: 'Every Sunday', value: '0 0 * * 0' },
    { label: 'First of month', value: '0 0 1 * *' },
  ];

  return (
    <Dialog open={open} onClose={onClose} title="Create Scheduled Task" className="max-w-2xl w-full">
      <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Task Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Task Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Daily code review"
            required
          />
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prompt *
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What should the agent do?"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
            required
          />
        </div>

        {/* Connector & Work Directory */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Connector *
            </label>
            <select
              value={connector}
              onChange={(e) => setConnector(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              required
            >
              {connectors.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Work Directory *
            </label>
            <div className="flex gap-2">
              <Input
                value={workDir}
                onChange={(e) => setWorkDir(e.target.value)}
                placeholder="~/projects/my-app"
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowDirBrowser(true);
                  browseDirctory(workDir || '~');
                }}
              >
                Browse
              </Button>
            </div>
          </div>
        </div>

        {/* Schedule Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Schedule Type *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scheduleType"
                value="cron"
                checked={scheduleType === 'cron'}
                onChange={() => setScheduleType('cron')}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Recurring (cron)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scheduleType"
                value="once"
                checked={scheduleType === 'once'}
                onChange={() => setScheduleType('once')}
                className="text-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">One-time</span>
            </label>
          </div>
        </div>

        {/* Cron Expression or DateTime */}
        {scheduleType === 'cron' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cron Expression *
            </label>
            <Input
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 9 * * *"
              required
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {cronPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setCronExpression(preset.value)}
                  className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                    cronExpression === preset.value
                      ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Format: minute hour day-of-month month day-of-week
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Run At *
            </label>
            <Input
              type="datetime-local"
              value={runAt}
              onChange={(e) => setRunAt(e.target.value)}
              required
            />
          </div>
        )}

        {/* Context Inheritance */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inheritContext}
              onChange={(e) => setInheritContext(e.target.checked)}
              className="mt-1 text-blue-600"
            />
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Inherit context between runs
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Each execution will continue from the previous session's context (conversation history).
              </p>
            </div>
          </label>
        </div>

        {/* Agent Mode & Approval Mode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Agent Mode
            </label>
            <select
              value={agentMode}
              onChange={(e) => setAgentMode(e.target.value as AgentMode)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">Default</option>
              <option value="plan">Plan (read-only)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Approval Mode
            </label>
            <select
              value={approvalMode}
              onChange={(e) => setApprovalMode(e.target.value as ApprovalMode)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">Auto-approve</option>
              <option value="manual">Manual approval</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {approvalMode === 'auto'
                ? 'All tool calls will be auto-approved (recommended for scheduled tasks)'
                : 'Tool calls will require manual approval'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : 'Create Task'}
          </Button>
        </div>
      </form>

      {/* Directory Browser Modal */}
      {showDirBrowser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowDirBrowser(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[60vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium">Select Directory</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentPath}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {/* Parent directory */}
              {currentPath !== '/' && (
                <button
                  onClick={() => {
                    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
                    browseDirctory(parent);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  ..
                </button>
              )}
              {dirEntries.map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => browseDirctory(entry.path)}
                  onDoubleClick={() => handleSelectDir(entry.path)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {entry.name}
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDirBrowser(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSelectDir(currentPath)}>
                Select This Directory
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
