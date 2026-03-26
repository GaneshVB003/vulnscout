// Scan types
export interface ScanRequest {
  target: string;
  scan_type: 'quick' | 'deep';
  authorized: boolean;
  options?: Record<string, unknown>;
}

export interface ScanResponse {
  scan_id: string;
  status: string;
  message: string;
}

export interface ScanStatus {
  scan_id: string;
  target: string;
  scan_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  start_time: string;
  end_time?: string;
  findings: Finding[];
  logs: string[];
}

// Finding types
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export interface Finding {
  category: string;
  severity: string;
  type: string;
  url?: string;
  parameter?: string;
  payload?: string;
  evidence: string;
  remediation: string;
}

export interface FindingSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

// WebSocket message types
export type WSMessageType = 'log' | 'progress' | 'complete' | 'error';

export interface WSMessage {
  type: WSMessageType;
  message: string;
  progress?: number;
  results?: unknown;
}

// Subdomain types
export interface Subdomain {
  subdomain: string;
  ip: string;
  source: string;
}

// Port types
export interface Port {
  port: number;
  service: string;
  state: string;
}

// Technology fingerprint
export interface Technology {
  server?: string;
  frameworks: string[];
  cms?: string;
  js_libraries: string[];
  headers: Record<string, string>;
  cookies: string[];
}

// Scan options
export interface ScanOptions {
  subdomainEnum: boolean;
  portScan: boolean;
  techFingerprint: boolean;
  sqlInjection: boolean;
  xss: boolean;
  csrf: boolean;
  apiTesting: boolean;
  bruteforce: boolean;
}