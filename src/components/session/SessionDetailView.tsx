'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getSession,
  getProcess,
  sendFollowUp,
  killSession,
  interruptSession,
  updateSessionMode,
  updateSession,
  updateSessionStatus,
  type Session,
  type ExecutionProcess,
  type ProcessLog,
  type ApprovalRequest,
  type ApprovalMode,
  type SessionStatus,
  type ImageData,
} from '@/lib/api';
import { useLogStream, type LogMessage } from '@/hooks/useLogStream';
import { useApprovalStream } from '@/hooks/useApprovalStream';
import { usePaginatedSessions } from '@/hooks/usePaginatedSessions';
import {
  Button,
  Card,
  StatusBadge,
  ProviderBadge,
  AILogo,
  UserAvatar,
  Spinner,
  Input,
  Dropdown,
  IconButton,
} from '@/components/ui';

interface ConversationTurn {
  process: ExecutionProcess;
  logs: ProcessLog[];
  isLoading: boolean;
}

interface SessionDetailViewProps {
  sessionId: string;
  onNavigateHome?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
  compact?: boolean;
}

export function SessionDetailView({
  sessionId,
  onNavigateHome,
  showCloseButton,
  onClose,
  compact = false,
}: SessionDetailViewProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  const [followUpImages, setFollowUpImages] = useState<ImageData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);
  const [showRaw, setShowRaw] = useState(false);

  // Session name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Auto-scroll refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Track which processes we've fetched logs for
  const fetchedProcessesRef = useRef<Set<string>>(new Set());

  // Get the latest running process for live streaming
  const runningProcess = session?.processes?.find((p) => p.status === 'running');

  // Stream live logs for running process
  const { logs: liveLogs, isConnected, connectedProcessId } = useLogStream(runningProcess?.id || null);

  // Stream approval requests (only when in_progress)
  const {
    pendingApprovals,
    respond: respondToApproval,
  } = useApprovalStream(session?.status === 'in_progress' ? sessionId : null);

  const fetchSession = useCallback(async () => {
    try {
      setError(null);
      const data = await getSession(sessionId);
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch session');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Initial fetch
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Poll when session is in_progress
  useEffect(() => {
    if (session?.status !== 'in_progress') return;

    const interval = setInterval(fetchSession, 5000);
    return () => clearInterval(interval);
  }, [session?.status, fetchSession]);

  // Fetch historical logs for completed processes
  useEffect(() => {
    if (!session?.processes) return;

    const fetchLogsForProcess = async (process: ExecutionProcess) => {
      if (fetchedProcessesRef.current.has(process.id) || process.status === 'running') {
        return;
      }

      fetchedProcessesRef.current.add(process.id);

      setConversationTurns((prev) => {
        const existing = prev.find((t) => t.process.id === process.id);
        if (existing) return prev;
        return [...prev, { process, logs: [], isLoading: true }];
      });

      try {
        const data = await getProcess(process.id);
        setConversationTurns((prev) =>
          prev.map((turn) =>
            turn.process.id === process.id
              ? { ...turn, logs: data.logs || [], isLoading: false }
              : turn
          )
        );
      } catch (err) {
        console.error('Failed to fetch logs for process', process.id, err);
        setConversationTurns((prev) =>
          prev.map((turn) =>
            turn.process.id === process.id ? { ...turn, isLoading: false } : turn
          )
        );
      }
    };

    for (const process of session.processes) {
      if (process.status !== 'running') {
        fetchLogsForProcess(process);
      }
    }

    if (runningProcess) {
      setConversationTurns((prev) => {
        const existing = prev.find((t) => t.process.id === runningProcess.id);
        if (existing) {
          return prev.map((t) =>
            t.process.id === runningProcess.id ? { ...t, process: runningProcess } : t
          );
        }
        return [...prev, { process: runningProcess, logs: [], isLoading: false }];
      });
    }
  }, [session?.processes, runningProcess]);

  // Update running process in turns when status changes
  useEffect(() => {
    if (!session?.processes) return;

    setConversationTurns((prev) =>
      prev.map((turn) => {
        const updatedProcess = session.processes?.find((p) => p.id === turn.process.id);
        if (updatedProcess && updatedProcess.status !== turn.process.status) {
          return { ...turn, process: updatedProcess };
        }
        return turn;
      })
    );
  }, [session?.processes]);

  // Auto-scroll when new content arrives
  useEffect(() => {
    if (!userScrolledUp && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [liveLogs.length, conversationTurns, pendingApprovals, userScrolledUp]);

  // Scroll to approval when it appears
  useEffect(() => {
    if (pendingApprovals.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pendingApprovals.length]);

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserScrolledUp(!isNearBottom);
    }
  };

  const handleFollowUp = async () => {
    if (!followUpPrompt.trim() && followUpImages.length === 0) return;

    setSubmitting(true);
    try {
      await sendFollowUp(sessionId, {
        prompt: followUpPrompt,
        images: followUpImages.length > 0 ? followUpImages : undefined,
      });
      setFollowUpPrompt('');
      setFollowUpImages([]);
      fetchedProcessesRef.current.clear();
      setConversationTurns([]);
      fetchSession();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!submitting && (followUpPrompt.trim() || followUpImages.length > 0)) {
        handleFollowUp();
      }
    }
  };

  const handleKill = async () => {
    if (!confirm('Are you sure you want to kill this session?')) return;
    try {
      await killSession(sessionId);
      fetchSession();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to kill session');
    }
  };

  const handleToggleMode = async () => {
    if (!session) return;
    const newMode: ApprovalMode = session.approvalMode === 'manual' ? 'auto' : 'manual';
    try {
      await updateSessionMode(sessionId, { approvalMode: newMode });
      setSession({ ...session, approvalMode: newMode });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update approval mode');
    }
  };

  const handleInterrupt = async () => {
    try {
      await interruptSession(sessionId);
      fetchSession();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to interrupt session');
    }
  };

  const handleSaveName = async () => {
    if (!session) return;
    try {
      await updateSession(sessionId, { sessionName: nameInput });
      setSession({ ...session, sessionName: nameInput });
      setEditingName(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update session name');
    }
  };

  // Use paginated sessions hook for smart refresh
  const { smartRefresh } = usePaginatedSessions();

  const handleToggleStatus = async (newStatus: SessionStatus) => {
    if (!session) return;
    try {
      await updateSessionStatus(sessionId, { status: newStatus });
      setSession({ ...session, status: newStatus });
      // Trigger smart refresh to update Kanban view immediately
      await smartRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update session status');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="h-8 w-8 text-blue-400" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="p-8 text-center max-w-md">
          <p className="text-red-500 dark:text-red-400 mb-4">{error || 'Session not found'}</p>
          <Button onClick={onNavigateHome}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const isRunning = session.status === 'in_progress';
  const canFollowUp = !isRunning && (session.status === 'completed' || session.status === 'failed') && session.agentSessionId;

  // Sort turns by creation time
  const sortedTurns = [...conversationTurns].sort(
    (a, b) => new Date(a.process.createdAt).getTime() - new Date(b.process.createdAt).getTime()
  );

  const maxWidthClass = compact ? 'max-w-full' : 'max-w-5xl';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Sticky Header */}
      <header className="flex-shrink-0 bg-[var(--card-bg)] border-b border-[var(--card-border)] sticky top-0 z-10">
        <div className={`${maxWidthClass} mx-auto px-4 py-3 overflow-hidden`}>
          <div className="flex items-center justify-between overflow-hidden w-full">
            <div className="flex overflow-hidden gap-3 mr-8">
              
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Session name..."
                    className="w-48"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveName}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-1 shrink-1 overflow-x-hidden">
                  <div className='truncate'>
                    <span className="text-lg font-semibold truncate overflow-hidden">
                      {session.sessionName || 'Session'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNameInput(session.sessionName || '');
                      setEditingName(true);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Edit session name"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 grow-1 justify-end mr-2">
              {/* Approval Mode Toggle */}
              <button
                onClick={handleToggleMode}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${session.approvalMode === 'auto'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  }`}
                title={`Click to switch to ${session.approvalMode === 'auto' ? 'manual' : 'auto'} mode`}
              >
                {session.approvalMode === 'auto' ? 'AUTO APPROVE' : 'MANUAL'}
              </button>
              <ProviderBadge provider={session.connectorType} />
              <StatusBadge status={session.status} />
            </div>
            {showCloseButton && onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-0 ml-4 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
          </div>
          {/* Working Directory */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="font-mono truncate">{session.workDir}</span>
          </div>
        </div>
      </header>

      {/* Auto mode indicator - sticky banner */}
      {session.approvalMode === 'auto' && (
        <div className="flex-shrink-0 bg-green-50 dark:bg-green-900/30 border-b border-green-300 dark:border-green-700 sticky top-[60px] z-10">
          <div className={`${maxWidthClass} mx-auto px-4 py-2`}>
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-medium">AUTO APPROVE MODE</span>
              <span className="text-green-600 dark:text-green-400">- All tool calls are being auto-approved</span>
              <button
                onClick={handleToggleMode}
                className="ml-2 px-2 py-0.5 text-xs rounded bg-green-200 dark:bg-green-800 hover:bg-green-300 dark:hover:bg-green-700 transition-colors"
              >
                Switch to Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area (Scrollable) */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className={`${maxWidthClass} mx-auto px-4 py-6 space-y-6`}>
          {/* Show raw toggle */}
          <div className="flex justify-end">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showRaw}
                onChange={(e) => setShowRaw(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Show raw logs
            </label>
          </div>

          {sortedTurns.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <p>No messages yet</p>
            </div>
          )}

          {sortedTurns.map((turn, index) => {
            const isCurrentProcess = turn.process.id === runningProcess?.id;
            const logsMatchProcess = connectedProcessId === turn.process.id;
            const shouldShowLiveLogs = isCurrentProcess && logsMatchProcess;

            return (
              <ConversationTurnView
                key={turn.process.id}
                turn={turn}
                turnNumber={index + 1}
                liveLogs={shouldShowLiveLogs ? liveLogs : []}
                isLive={isCurrentProcess}
                isConnected={isConnected && logsMatchProcess}
                showRaw={showRaw}
                connectorType={session.connectorType}
              />
            );
          })}

          {/* Inline Approval Requests - only show in manual mode */}
          {pendingApprovals.length > 0 && session.approvalMode === 'manual' && (
            <div id="inline-approvals" className="space-y-3 p-4 rounded-xl border-2 border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 animate-pulse-slow">
              <div className="flex items-center gap-2">
                <span className="text-cyan-600 dark:text-cyan-400 font-medium">
                  Action Required: {pendingApprovals.length} Pending Approval{pendingApprovals.length > 1 ? 's' : ''}
                </span>
              </div>
              {pendingApprovals.map((approval) => (
                <InlineApprovalCard
                  key={approval.requestId}
                  approval={approval}
                  onApprove={() => respondToApproval(approval.requestId, 'approved')}
                  onDeny={() => respondToApproval(approval.requestId, 'denied', 'User denied')}
                />
              ))}
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sticky Input Area */}
      <div className="flex-shrink-0 border-t border-[var(--card-border)] bg-[var(--card-bg)] sticky bottom-0">
        <div className={`${maxWidthClass} mx-auto px-4 py-4`}>
          {/* Image Previews */}
          {followUpImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {followUpImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={`data:${image.mediaType};base64,${image.data}`}
                    alt={`Attached image ${index + 1}`}
                    className="h-16 w-16 object-cover rounded-lg border border-[var(--input-border)]"
                  />
                  <button
                    type="button"
                    onClick={() => setFollowUpImages(images => images.filter((_, i) => i !== index))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative">
            <textarea
              value={followUpPrompt}
              onChange={(e) => setFollowUpPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
                if (imageItems.length === 0) return;
                e.preventDefault();
                const newImages: ImageData[] = [];
                for (const item of imageItems) {
                  const file = item.getAsFile();
                  if (file && file.size <= 20 * 1024 * 1024) {
                    const result = await new Promise<string | null>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.onerror = () => resolve(null);
                      reader.readAsDataURL(file);
                    });
                    if (result) {
                      const base64Data = result.split(',')[1];
                      if (base64Data) {
                        newImages.push({
                          data: base64Data,
                          mediaType: file.type as ImageData['mediaType'],
                        });
                      }
                    }
                  }
                }
                if (newImages.length > 0) {
                  setFollowUpImages(prev => [...prev, ...newImages]);
                }
              }}
              placeholder={
                isRunning
                  ? "Agent is working..."
                  : canFollowUp
                    ? "Send a follow-up message... (Enter to send, Shift+Enter for new line, paste images)"
                    : (session.status === 'completed' || session.status === 'failed') && !session.agentSessionId
                      ? "Cannot send follow-ups: no session ID captured"
                      : `Session ${session.status}`
              }
              rows={2}
              disabled={isRunning || !canFollowUp || submitting}
              className="w-full px-4 py-3 pr-44 text-sm rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {/* Hidden file input for image upload */}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              onChange={async (e) => {
                const files = e.target.files;
                if (!files) return;
                const newImages: ImageData[] = [];
                for (const file of Array.from(files)) {
                  if (file.size <= 20 * 1024 * 1024 && file.type.startsWith('image/')) {
                    const result = await new Promise<string | null>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.onerror = () => resolve(null);
                      reader.readAsDataURL(file);
                    });
                    if (result) {
                      const base64Data = result.split(',')[1];
                      if (base64Data) {
                        newImages.push({
                          data: base64Data,
                          mediaType: file.type as ImageData['mediaType'],
                        });
                      }
                    }
                  }
                }
                if (newImages.length > 0) {
                  setFollowUpImages(prev => [...prev, ...newImages]);
                }
                e.target.value = '';
              }}
              className="hidden"
              id="image-upload-input"
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-1">
              {/* Session Status Dropdown - shows current stage and allows switching */}
              {(session.status === 'completed' || session.status === 'failed') && (
                <Dropdown
                  value={session.status}
                  onChange={(newStatus) => handleToggleStatus(newStatus as SessionStatus)}
                  options={[
                    { value: 'completed', label: 'Completed' },
                    { value: 'failed', label: 'Failed' }
                  ]}
                  size="sm"
                />
              )}
              {/* Spinner when agent is working */}
              {isRunning && (
                <Spinner className="w-4 h-4 text-blue-500 mr-1" />
              )}
              {/* Image Upload Button */}
              <IconButton
                onClick={() => document.getElementById('image-upload-input')?.click()}
                disabled={isRunning || !canFollowUp || submitting}
                title="Attach images"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </IconButton>
              {/* Interrupt Button */}
              <IconButton
                onClick={handleInterrupt}
                disabled={!isRunning}
                variant="warning"
                title="Interrupt"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm0-12h2v10h-2V4z" />
                </svg>
              </IconButton>
              {/* Kill Button */}
              <IconButton
                onClick={handleKill}
                disabled={!isRunning}
                variant="danger"
                title="Kill"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                </svg>
              </IconButton>
              {/* Send Button */}
              <IconButton
                onClick={handleFollowUp}
                disabled={isRunning || !canFollowUp || submitting || (!followUpPrompt.trim() && followUpImages.length === 0)}
                variant="primary"
                title="Send"
              >
                {submitting ? (
                  <Spinner className="w-5 h-5" />
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Approval Card Component
function InlineApprovalCard({
  approval,
  onApprove,
  onDeny,
}: {
  approval: ApprovalRequest;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const inputStr = typeof approval.toolInput === 'string'
    ? approval.toolInput
    : JSON.stringify(approval.toolInput ?? {}, null, 2) ?? '{}';

  const getSummary = () => {
    if (typeof approval.toolInput === 'object' && approval.toolInput !== null) {
      const input = approval.toolInput as Record<string, unknown>;
      if (input.command) return `Command: ${String(input.command).slice(0, 50)}...`;
      if (input.file_path) return `File: ${String(input.file_path)}`;
      if (input.path) return `Path: ${String(input.path)}`;
      if (input.query) return `Query: ${String(input.query).slice(0, 50)}...`;
    }
    if (!inputStr) return 'No input';
    return inputStr.slice(0, 60) + (inputStr.length > 60 ? '...' : '');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-cyan-300 dark:border-cyan-700 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-cyan-600 dark:text-cyan-400 text-lg">🔧</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{approval.toolName}</div>
            {!isExpanded && (
              <div className="text-xs text-gray-500 truncate">{getSummary()}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Show'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onDeny}
          >
            Deny
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onApprove}
          >
            Approve
          </Button>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-900/50">
          <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
            {inputStr}
          </pre>
        </div>
      )}
    </div>
  );
}

// Helper function to get display name for connector
function getConnectorDisplayName(connectorType: string): string {
  const connectorNames: Record<string, string> = {
    claude: 'Claude',
    vibe: 'Mistral Vibe',
    mistral: 'Mistral',
  };
  return connectorNames[connectorType.toLowerCase()] || connectorType;
}

// Helper to ensure content is always a string
function ensureString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value
      .map((item) => ensureString(item))
      .join('');
  }
  if (typeof value === 'object') {
    if ('text' in value) return ensureString((value as { text: unknown }).text);
    return JSON.stringify(value);
  }
  return String(value);
}

// Parse a log content string to extract meaningful message
interface ParsedMessage {
  type: 'assistant' | 'user' | 'tool_call' | 'tool_result' | 'system' | 'result' | 'thinking' | 'raw';
  content: string;
  toolName?: string;
  toolId?: string;
  cost?: number;
  isError?: boolean;
}

function parseLogContent(content: string): ParsedMessage[] {
  try {
    const data = JSON.parse(content);

    // Mistral Vibe JSON-RPC format
    if (data.jsonrpc === '2.0' && data.method === 'session/update') {
      const update = data.params?.update;
      if (!update) return [{ type: 'raw', content: '' }];

      switch (update.sessionUpdate) {
        case 'agent_message_chunk':
          if (update.content?.type === 'text' && update.content?.text) {
            return [{ type: 'assistant', content: ensureString(update.content.text) }];
          }
          return [{ type: 'raw', content: '' }];

        case 'tool_call': {
          let toolContent = '';
          if (update.rawInput) {
            try {
              const input = JSON.parse(update.rawInput);
              const parts: string[] = [];
              if (input.pattern) parts.push(`pattern: "${input.pattern}"`);
              if (input.path) parts.push(`path: "${input.path}"`);
              if (input.command) parts.push(`command: "${input.command}"`);
              if (input.file_path) parts.push(`file: "${input.file_path}"`);
              if (input.content) parts.push(`content: "${String(input.content).slice(0, 100)}${String(input.content).length > 100 ? '...' : ''}"`);
              toolContent = parts.length > 0 ? parts.join(', ') : JSON.stringify(input);
            } catch {
              toolContent = update.rawInput;
            }
          }
          return [{
            type: 'tool_call',
            content: toolContent,
            toolName: update.title || update.kind || 'tool',
            toolId: update.toolCallId,
          }];
        }

        case 'tool_call_update':
          let resultText = '';
          if (update.content && Array.isArray(update.content)) {
            for (const item of update.content) {
              if (item.content?.type === 'text') {
                resultText += ensureString(item.content.text);
              }
            }
          }
          if (!resultText && update.rawOutput) {
            try {
              const rawOut = JSON.parse(update.rawOutput);
              resultText = rawOut.matches || rawOut.content || update.rawOutput;
            } catch {
              resultText = update.rawOutput;
            }
          }
          return [{
            type: 'tool_result',
            content: ensureString(resultText) || 'Completed',
            toolId: update.toolCallId,
            isError: update.status === 'error',
          }];

        default:
          return [{ type: 'raw', content: '' }];
      }
    }

    // Vibe JSON-RPC result
    if (data.jsonrpc === '2.0' && data.result?.stopReason) {
      return [{
        type: 'result',
        content: `Completed (${data.result.stopReason})`,
      }];
    }

    if (data.jsonrpc === '2.0') {
      return [{ type: 'raw', content: '' }];
    }

    // vibe-server processed events
    if (data.type === 'toolUpdate') {
      if (data.status === 'completed' && data.content) {
        return [{
          type: 'tool_result',
          content: ensureString(data.content),
          toolId: data.id,
          isError: data.isError || false,
        }];
      }
      return [{ type: 'raw', content: '' }];
    }

    if (data.type === 'terminalOutput' && data.output) {
      return [{
        type: 'tool_result',
        content: ensureString(data.output),
        toolId: data.toolCallId,
        isError: false,
      }];
    }

    // Claude Code format
    if (data.type === 'assistant' && data.message?.content) {
      const messages: ParsedMessage[] = [];

      for (const block of data.message.content) {
        if (block.type === 'text' && block.text) {
          messages.push({ type: 'assistant', content: ensureString(block.text) });
        }
        if (block.type === 'tool_use') {
          messages.push({
            type: 'tool_call',
            content: JSON.stringify(block.input, null, 2),
            toolName: block.name,
            toolId: block.id,
          });
        }
      }

      return messages.length > 0 ? messages : [{ type: 'raw', content: '' }];
    }

    if (data.type === 'user' && data.message?.content) {
      const messages: ParsedMessage[] = [];

      for (const block of data.message.content) {
        if (block.type === 'text' && block.text) {
          messages.push({
            type: 'user',
            content: ensureString(block.text),
          });
        }
        if (block.type === 'tool_result') {
          const output = ensureString(
            data.tool_use_result?.stdout ||
            data.tool_use_result?.content ||
            block.content
          );
          const stderr = ensureString(data.tool_use_result?.stderr);

          messages.push({
            type: 'tool_result',
            content: output,
            toolId: block.tool_use_id,
            isError: block.is_error || false,
          });

          if (stderr) {
            messages.push({
              type: 'tool_result',
              content: stderr,
              toolId: block.tool_use_id,
              isError: true,
            });
          }
        }
      }

      return messages.length > 0 ? messages : [{ type: 'raw', content: '' }];
    }

    if (data.type === 'result') {
      return [{
        type: 'result',
        content: ensureString(data.result) || 'Task completed',
        cost: data.total_cost_usd,
      }];
    }

    if (data.type === 'system' && data.subtype === 'init') {
      return [{
        type: 'system',
        content: `Session started (model: ${data.model}, tools: ${data.tools?.length || 0})`,
      }];
    }

    if (data.type === 'stream_event') {
      return [{ type: 'raw', content: '' }];
    }

    return [{ type: 'raw', content: content }];
  } catch {
    return [{ type: 'raw', content: content }];
  }
}

function parseLogs(
  logs: (LogMessage | ProcessLog)[],
  showRaw: boolean
): { raw: LogMessage | ProcessLog; parsed: ParsedMessage; logType: string }[] {
  const parsed = logs
    .flatMap((log) => {
      const content = 'content' in log ? log.content : (log as LogMessage).content || '';
      const logType = 'logType' in log ? log.logType : (log as LogMessage).type;
      const parsedMessages = parseLogContent(content || '');
      return parsedMessages.map((p) => ({ raw: log, parsed: p, logType: logType || 'stdout' }));
    })
    .filter((log) => showRaw || log.parsed.content !== '');

  // Merge consecutive assistant messages
  const merged: typeof parsed = [];
  for (const item of parsed) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.parsed.type === 'assistant' &&
      item.parsed.type === 'assistant'
    ) {
      last.parsed.content += item.parsed.content;
    } else {
      merged.push(item);
    }
  }

  // Deduplicate tool_result entries
  const toolResultsByToolId = new Map<string, typeof merged[0]>();
  const deduped: typeof merged = [];

  for (const item of merged) {
    if (item.parsed.type === 'tool_result' && item.parsed.toolId) {
      const existing = toolResultsByToolId.get(item.parsed.toolId);
      if (!existing) {
        toolResultsByToolId.set(item.parsed.toolId, item);
        deduped.push(item);
      } else if (
        item.parsed.content &&
        item.parsed.content !== 'Completed' &&
        (existing.parsed.content === 'Completed' || !existing.parsed.content)
      ) {
        const idx = deduped.indexOf(existing);
        if (idx !== -1) {
          deduped[idx] = item;
        }
        toolResultsByToolId.set(item.parsed.toolId, item);
      }
    } else {
      deduped.push(item);
    }
  }

  return deduped;
}

// Conversation Turn Component
function ConversationTurnView({
  turn,
  turnNumber,
  liveLogs,
  isLive,
  isConnected,
  showRaw,
  connectorType,
}: {
  turn: ConversationTurn;
  turnNumber: number;
  liveLogs: LogMessage[];
  isLive: boolean;
  isConnected: boolean;
  showRaw: boolean;
  connectorType: string;
}) {
  const { process, logs, isLoading } = turn;
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const displayLogs = isLive ? liveLogs : logs;

  useEffect(() => {
    if (isLive && autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [liveLogs, isLive, autoScroll]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  return (
    <div className="space-y-3">
      {/* User Message (Prompt) */}
      <div className="flex gap-3">
        <UserAvatar />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">You</span>
            <span className="text-xs text-gray-500">Turn {turnNumber}</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <p className="whitespace-pre-wrap">{process.prompt}</p>
            {/* Image attachments */}
            {process.images && process.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {process.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={`data:${image.mediaType};base64,${image.data}`}
                      alt={`Attached image ${index + 1}`}
                      className="h-24 w-24 object-cover rounded-lg border border-blue-200 dark:border-blue-700"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assistant Response */}
      <div className="flex gap-3">
        <AILogo provider={connectorType} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{getConnectorDisplayName(connectorType)}</span>
            <StatusBadge status={process.status} />
            {isLive && isConnected && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Streaming
              </span>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Spinner className="h-5 w-5 text-gray-400" />
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">
                {isLive ? 'Waiting for response...' : 'No logs available'}
              </div>
            ) : (
              <div
                ref={containerRef}
                onScroll={handleScroll}
                className="max-h-96 overflow-y-auto p-4 font-mono text-sm space-y-2"
              >
                {parseLogs(displayLogs, showRaw).map((log, index) => (
                  <ParsedLogLine key={index} log={log} showRaw={showRaw} />
                ))}
              </div>
            )}
            {process.exitCode !== null && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-xs text-gray-500 flex justify-between">
                <span>Exit code: {process.exitCode}</span>
                {process.completedAt && (
                  <span>Completed: {new Date(process.completedAt).toLocaleString()}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Parsed Log Line Component
function ParsedLogLine({
  log,
  showRaw,
}: {
  log: { raw: LogMessage | ProcessLog; parsed: ParsedMessage; logType: string };
  showRaw: boolean;
}) {
  const { parsed, logType } = log;
  const content = ensureString(parsed.content);

  if (!showRaw && !content) return null;

  if (showRaw) {
    const rawContent = 'content' in log.raw ? log.raw.content : JSON.stringify(log.raw);
    return (
      <div className="text-gray-500 whitespace-pre-wrap break-all text-xs">
        <span className="text-gray-400">[{logType}] </span>
        {rawContent}
      </div>
    );
  }

  switch (parsed.type) {
    case 'assistant':
      return (
        <div className="text-green-700 dark:text-green-300 whitespace-pre-wrap">
          {content}
        </div>
      );

    case 'user':
      return (
        <div className="border-l-2 border-cyan-500 pl-3 my-2 bg-cyan-50 dark:bg-cyan-900/20 p-2 rounded-r">
          <div className="text-cyan-600 dark:text-cyan-400 text-xs mb-1">You</div>
          <div className="text-cyan-800 dark:text-cyan-200 whitespace-pre-wrap">{content}</div>
        </div>
      );

    case 'tool_call':
      return (
        <div className="border-l-2 border-blue-500 pl-3 my-2">
          <div className="text-blue-600 dark:text-blue-400 text-xs mb-1">{parsed.toolName}</div>
          <pre className="text-blue-700 dark:text-blue-200 text-xs overflow-x-auto">{content}</pre>
        </div>
      );

    case 'tool_result':
      return (
        <div className={`border-l-2 ${parsed.isError ? 'border-red-500' : 'border-yellow-500'} pl-3 my-1 bg-gray-100 dark:bg-gray-800/50`}>
          <div className={`text-xs mb-1 ${parsed.isError ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
            {parsed.isError ? 'Error' : 'Output'}
          </div>
          <pre className={`text-xs overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto ${parsed.isError ? 'text-red-700 dark:text-red-200' : 'text-yellow-700 dark:text-yellow-200'}`}>
            {content}
          </pre>
        </div>
      );

    case 'result':
      return (
        <div className="border-l-2 border-green-500 pl-3 my-2 bg-green-50 dark:bg-green-900/20 p-2 rounded-r">
          <div className="text-green-600 dark:text-green-400 text-xs mb-1">Result</div>
          <div className="text-green-700 dark:text-green-200">{content}</div>
          {parsed.cost && (
            <div className="text-green-600 dark:text-green-500 text-xs mt-1">Cost: ${parsed.cost.toFixed(4)}</div>
          )}
        </div>
      );

    case 'system':
      return (
        <div className="text-purple-600 dark:text-purple-400 text-xs">
          {content}
        </div>
      );

    case 'thinking':
      return (
        <div className="text-yellow-600 dark:text-yellow-300/70 text-xs italic">
          {content}
        </div>
      );

    default:
      if (logType === 'stderr') {
        return (
          <div className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
            {content}
          </div>
        );
      }
      return null;
  }
}
