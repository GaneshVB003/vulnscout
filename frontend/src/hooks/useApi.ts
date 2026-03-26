import axios from 'axios';
import type { ScanRequest, ScanResponse, ScanStatus } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Start a new scan
export const startScan = async (data: ScanRequest): Promise<ScanResponse> => {
  const response = await api.post<ScanResponse>('/api/scan', data);
  return response.data;
};

// Get scan status
export const getScanStatus = async (scanId: string): Promise<ScanStatus> => {
  const response = await api.get<ScanStatus>(`/api/scan/${scanId}`);
  return response.data;
};

// List all scans
export const listScans = async (): Promise<ScanStatus[]> => {
  const response = await api.get<ScanStatus[]>('/api/scans');
  return response.data;
};

// Delete a scan
export const deleteScan = async (scanId: string): Promise<void> => {
  await api.delete(`/api/scan/${scanId}`);
};

// Export scan results
export const exportScan = async (scanId: string, format: 'json' | 'csv') => {
  const response = await api.get(`/api/export/${scanId}/${format}`);
  return response.data;
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/');
  return response.data;
};

export default api;