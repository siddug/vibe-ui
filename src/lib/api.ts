/**
 * vibe-server API client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3456';

// Types
export interface Session {
  id: string;
  connectorType: string;
  workDir: string;
  status: 'running' | 'completed' | 'failed' | 'killed';
  agentSessionId?: string | null; // Agent's own session ID (e.g., Claude's UUID)
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  processes?: ExecutionProcess[];
}

export interface ExecutionProcess {
  id: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed' | 'killed';
  prompt: string;
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
}

export interface CreateSessionRequest {
  connector: string;
  workDir: string;
  prompt: string;
  env?: Record<string, string>;
}

export interface CreateSessionResponse {
  id: string;
  processId: string;
  connectorType: string;
  workDir: string;
  status: string;
  createdAt: string;
}

export interface FollowUpRequest {
  prompt: string;
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

// API Functions
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  // Only set Content-Type for requests with a body
  const headers: Record<string, string> = {
    ...options?.headers as Record<string, string>,
  };
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
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

// Health
export async function getHealth(): Promise<HealthResponse> {
  return fetchApi('/api/health');
}

export async function getConnectors(): Promise<ConnectorsResponse> {
  return fetchApi('/api/health/connectors');
}

// Sessions
export async function getSessions(): Promise<SessionsResponse> {
  return fetchApi('/api/sessions');
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

// WebSocket URL helper
export function getWebSocketUrl(endpoint: string): string {
  const wsBase = API_BASE.replace(/^http/, 'ws');
  return `${wsBase}${endpoint}`;
}
