import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Activity, CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { getScanStatus } from '../hooks/useApi';
import type { ScanStatus, WSMessage } from '../types';

export default function ScanningPage() {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  
  const [scanData, setScanData] = useState<ScanStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  // Poll for scan status
  useEffect(() => {
    if (!scanId) return;

    const fetchStatus = async () => {
      try {
        const data = await getScanStatus(scanId);
        setScanData(data);
        
        // Extract logs from data
        if (data.logs) {
          setLogs(data.logs);
        }

        // Check if complete
        if (data.status === 'completed') {
          setIsComplete(true);
          // Navigate to results after a delay
          setTimeout(() => {
            navigate(`/results/${scanId}`);
          }, 2000);
        } else if (data.status === 'failed') {
          setError('Scan failed. Please check the logs for details.');
        }
      } catch (err) {
        setError('Failed to fetch scan status');
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 3 seconds
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [scanId, navigate]);

  // WebSocket for real-time updates (optional enhancement)
  useEffect(() => {
    if (!scanId) return;

    const wsUrl = `${import.meta.env.VITE_API_URL || 'ws://localhost:8000'}/ws/${scanId}`;
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          if (data.message) {
            setLogs(prev => [...prev, data.message]);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        // WebSocket error - fallback to polling
      };
    } catch {
      // WebSocket not available - fallback to polling
    }

    return () => {
      if (ws) ws.close();
    };
  }, [scanId]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-400 mb-2">Scan Error</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const progress = scanData?.progress || 0;
  const target = scanData?.target || scanId || 'Unknown';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 mb-4">
          <Activity className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Scanning {target}
        </h2>
        <p className="text-slate-400">
          {isComplete ? 'Scan completed!' : 'Performing security assessment...'}
        </p>
      </div>

      {/* Progress Card */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-3 text-lg">
          {isComplete ? (
            <>
              <CheckCircle className="w-6 h-6 text-green-500" />
              <span className="text-green-400">Completed</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
              <span className="text-cyan-400">Running</span>
            </>
          )}
        </div>
      </div>

      {/* Live Logs */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-white">Live Logs</h3>
        </div>
        
        <div className="bg-slate-900/50 rounded-lg p-4 max-h-80 overflow-y-auto font-mono text-sm">
          {logs.length > 0 ? (
            logs.map((log, idx) => (
              <div key={idx} className="text-slate-300 py-1 border-b border-slate-800/50 last:border-0">
                {log}
              </div>
            ))
          ) : (
            <div className="text-slate-500 italic">Waiting for scan to start...</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 text-center">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
        >
          Start Another Scan
        </button>
      </div>
    </div>
  );
}