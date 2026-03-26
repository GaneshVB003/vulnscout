/**
 * VulnScout API Client
 * Connects to the backend security scanning API
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ScanRequest {
  target: string;
  scan_type: 'quick' | 'deep';
  authorized: boolean;
}

export interface ScanResponse {
  scan_id: string;
  status: string;
  message: string;
}

export interface Finding {
  id: string;
  category: 'Recon' | 'Web Vulns' | 'API Vulns' | 'Bruteforce' | 'Exploits';
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  title: string;
  description: string;
  affectedUrl: string;
  evidence?: string;
  remediation: string;
}

export interface ScanResult {
  id: string;
  targetDomain: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  progress: number;
  findings: Finding[];
  reconData: {
    subdomains: string[];
    openPorts: string[];
    technologies: string[];
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function startScan(request: ScanRequest): Promise<ScanResponse> {
  const response = await fetchWithTimeout(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to start scan' }));
    throw new Error(error.detail || 'Failed to start scan');
  }
  
  return response.json();
}

export async function getScanStatus(scanId: string): Promise<ScanResult> {
  const response = await fetchWithTimeout(`${API_BASE}/api/scan/${scanId}`);
  
  if (!response.ok) {
    throw new Error('Failed to get scan status');
  }
  
  return response.json();
}

export async function listScans(): Promise<ScanResult[]> {
  const response = await fetchWithTimeout(`${API_BASE}/api/scans`);
  
  if (!response.ok) {
    return [];
  }
  
  return response.json();
}

export async function deleteScan(scanId: string): Promise<void> {
  await fetchWithTimeout(`${API_BASE}/api/scan/${scanId}`, { method: 'DELETE' });
}

export async function exportScan(scanId: string, format: 'json' | 'csv') {
  const response = await fetchWithTimeout(`${API_BASE}/api/export/${scanId}/${format}`);
  
  if (!response.ok) {
    throw new Error('Failed to export scan');
  }
  
  return response.blob();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/`, {}, 3000);
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  startScan,
  getScanStatus,
  listScans,
  deleteScan,
  exportScan,
  checkHealth
};