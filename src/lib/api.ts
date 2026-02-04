/**
 * vibe-server API client
 */

import type { ServerConfig } from './servers';

// Extend Window interface for Electron
declare global {
  interface Window {
    electronAPI?: {
      getServerStatus: () => Promise<string>;
      restartServer: () => Promise<string>;
      stopServer: () => Promise<string>;
    };
  }
}

// Default fallback URL
const DEFAULT_API_BASE = typeof window !== 'undefined' && window.electronAPI
  ? 'http://localhost:7778'
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7778');

// Active server config (set by ServerContext)
let _activeServer: ServerConfig | null = null;

/**
 * Set the active server config. Called by ServerContext on server switch.
 */
export function setActiveServerConfig(config: ServerConfig | null): void {
  _activeServer = config;
}

/**
 * Get the current API base URL
 */
function getApiBase(): string {
  return _activeServer?.url || DEFAULT_API_BASE;
}

/**
 * Get the current auth key
 */
function getAuthKey(): string | null {
  return _activeServer?.authKey || null;
}

// Types
// Approval mode type
export type ApprovalMode = 'manual' | 'auto';

// Agent mode type - controls agent behavior (plan mode vs default)
export type AgentMode = 'default' | 'plan';

export type SessionStatus = 'triage' | 'in_progress' | 'completed' | 'failed' | 'approval' | 'done' | 'archived';

export interface Session {
  id: string;
  connectorType: string;
  workDir: string;
  sessionName?: string | null;
  status: SessionStatus;
  approvalMode: ApprovalMode; // 'manual' requires user approval, 'auto' auto-approves
  agentMode: AgentMode; // 'default' for normal operation, 'plan' for read-only planning
  agentSessionId?: string | null; // Agent's own session ID (e.g., Claude's UUID)
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  processes?: ExecutionProcess[];
}

export interface ExecutionProcess {
  id: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  prompt: string;
  images?: ImageData[];
  exitCode: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ProcessLog {
  id: string;
  processId: string;
  logType: 'stdout' | 'stderr' | 'event';
  content: string;
  timestamp: string;
}

export interface ProcessLogsResponse {
  logs: ProcessLog[];
  total: number;
  offset: number;
  limit: number;
}

export interface Connector {
  name: string;
  displayName: string;
  status: 'available' | 'not_installed' | 'not_configured' | 'error';
  version?: string;
  path?: string;
  message?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

export interface ConnectorsResponse {
  connectors: Connector[];
  total: number;
  available: number;
}

export interface SessionsResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface GetSessionsParams {
  status?: SessionStatus;
  limit?: number;
  offset?: number;
}

export interface CreateSessionRequest {
  connector: string;
  workDir: string;
  prompt: string;
  env?: Record<string, string>;
  approvalMode?: ApprovalMode;
  agentMode?: AgentMode;
  sessionName?: string;
  startImmediately?: boolean;
  images?: ImageData[];
}

export interface CreateSessionResponse {
  id: string;
  processId: string;
  connectorType: string;
  workDir: string;
  sessionName?: string | null;
  status: SessionStatus;
  approvalMode: ApprovalMode;
  createdAt: string;
}

export interface UpdateModeRequest {
  approvalMode: ApprovalMode;
}

export interface UpdateModeResponse {
  status: string;
  sessionId: string;
  approvalMode: ApprovalMode;
}

/**
 * Image data for messages with images
 */
export interface ImageData {
  /** Base64-encoded image data (without data URL prefix) */
  data: string;
  /** Image media type */
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

export interface FollowUpRequest {
  prompt: string;
  images?: ImageData[];
}

export interface ApprovalRequest {
  id: string;
  requestId: string;
  toolName: string;
  toolInput: unknown;
  toolUseId?: string;
  timestamp: number;
}

export interface ApprovalResponse {
  requestId: string;
  status: 'approved' | 'denied';
  reason?: string;
}

export interface CreateSessionWithApprovalsRequest extends CreateSessionRequest {
  enableApprovals?: boolean;
}

export interface UpdateSessionRequest {
  sessionName?: string;
}

export interface UpdateSessionStatusRequest {
  status: SessionStatus;
}

// API Key types
export interface ApiKey {
  id: string;
  provider: string;
  apiKey: string; // Masked
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeysResponse {
  apiKeys: ApiKey[];
  total: number;
}

export interface SaveApiKeyRequest {
  provider: string;
  apiKey: string;
}

// API Functions
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${getApiBase()}${endpoint}`;

  // Only set Content-Type for requests with a body
  const headers: Record<string, string> = {
    ...options?.headers as Record<string, string>,
  };
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  // Add auth header if we have a key
  const authKey = getAuthKey();
  if (authKey) {
    headers['Authorization'] = `Bearer ${authKey}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch from a specific server (used for validation before adding)
 */
export async function fetchFromServer<T>(
  serverUrl: string,
  authKey: string,
  endpoint: string
): Promise<T> {
  const url = `${serverUrl}${endpoint}`;
  const headers: Record<string, string> = {};
  if (authKey) {
    headers['Authorization'] = `Bearer ${authKey}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

// Health
export async function getHealth(): Promise<HealthResponse> {
  return fetchApi('/api/health');
}

export async function getConnectors(): Promise<ConnectorsResponse> {
  return fetchApi('/api/health/connectors');
}

// Sessions
export async function getSessions(params?: GetSessionsParams): Promise<SessionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  const query = searchParams.toString();
  return fetchApi(`/api/sessions${query ? `?${query}` : ''}`);
}

export async function getSession(id: string): Promise<Session> {
  return fetchApi(`/api/sessions/${id}`);
}

export async function createSession(
  data: CreateSessionRequest | CreateSessionWithApprovalsRequest
): Promise<CreateSessionResponse> {
  return fetchApi('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sendFollowUp(
  sessionId: string,
  data: FollowUpRequest
): Promise<{ status: string; sessionId: string; processId?: string }> {
  return fetchApi(`/api/sessions/${sessionId}/follow-up`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function killSession(
  sessionId: string
): Promise<{ status: string; sessionId: string }> {
  return fetchApi(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}

export async function interruptSession(
  sessionId: string
): Promise<{ status: string; sessionId: string }> {
  return fetchApi(`/api/sessions/${sessionId}/interrupt`, {
    method: 'POST',
  });
}

// Update session properties (name, etc.)
export async function updateSession(
  sessionId: string,
  data: UpdateSessionRequest
): Promise<{ status: string; sessionId: string; sessionName?: string }> {
  return fetchApi(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Update session status
export async function updateSessionStatus(
  sessionId: string,
  data: UpdateSessionStatusRequest
): Promise<{ status: string; sessionId: string; newStatus: SessionStatus }> {
  return fetchApi(`/api/sessions/${sessionId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Update session approval mode
export async function updateSessionMode(
  sessionId: string,
  data: UpdateModeRequest
): Promise<UpdateModeResponse> {
  return fetchApi(`/api/sessions/${sessionId}/mode`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Processes
export async function getProcess(
  processId: string
): Promise<ExecutionProcess & { logs: ProcessLog[] }> {
  return fetchApi(`/api/processes/${processId}`);
}

export async function getProcessLogs(
  processId: string,
  options?: { type?: string; limit?: number; offset?: number }
): Promise<ProcessLogsResponse> {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const query = params.toString();
  return fetchApi(`/api/processes/${processId}/logs${query ? `?${query}` : ''}`);
}

// Approvals
export async function getPendingApprovals(
  sessionId: string
): Promise<{ approvals: ApprovalRequest[] }> {
  return fetchApi(`/api/sessions/${sessionId}/approvals`);
}

export async function respondToApproval(
  sessionId: string,
  response: ApprovalResponse
): Promise<{ status: string; requestId: string; response: string }> {
  return fetchApi(`/api/sessions/${sessionId}/approvals/respond`, {
    method: 'POST',
    body: JSON.stringify(response),
  });
}

// WebSocket URL helper (returns URL without auth — use getWebSocketProtocols for auth)
export function getWebSocketUrl(endpoint: string): string {
  const wsBase = getApiBase().replace(/^http/, 'ws');
  return `${wsBase}${endpoint}`;
}

/**
 * Get WebSocket subprotocols for authentication.
 * The auth key is sent as a subprotocol "vibe-auth.<key>" to avoid exposing it in URLs.
 */
export function getWebSocketProtocols(): string[] {
  const authKey = getAuthKey();
  if (authKey) {
    return [`vibe-auth.${authKey}`];
  }
  return [];
}

// API Keys
export async function getApiKeys(): Promise<ApiKeysResponse> {
  return fetchApi('/api/settings/api-keys');
}

export async function checkApiKey(
  provider: string
): Promise<{ exists: boolean; provider: string; apiKey?: string }> {
  try {
    return await fetchApi(`/api/settings/api-keys/${provider}`);
  } catch {
    return { exists: false, provider };
  }
}

export async function saveApiKey(
  data: SaveApiKeyRequest
): Promise<{ status: string; id: string; provider: string; apiKey: string }> {
  return fetchApi('/api/settings/api-keys', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Filesystem browsing
export interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

export interface ListDirectoryResponse {
  path: string;
  entries: FileEntry[];
}

export async function listDirectory(
  path: string,
  showHidden?: boolean
): Promise<ListDirectoryResponse> {
  const params = new URLSearchParams({ path });
  if (showHidden) params.set('showHidden', 'true');
  return fetchApi(`/api/filesystem/list?${params.toString()}`);
}

export async function deleteApiKey(
  provider: string
): Promise<{ status: string; provider: string }> {
  return fetchApi(`/api/settings/api-keys/${provider}`, {
    method: 'DELETE',
  });
}
