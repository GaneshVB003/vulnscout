import React, { useEffect, useState } from 'react';
import { Terminal, Activity, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';

interface ScanningPageProps {
  domain: string;
  scanId?: string;
  onComplete: () => void;
  isMockMode?: boolean;
}

const mockLogs = [
  "Initializing assessment engine...",
  "Resolving target domain...",
  "Starting subdomain enumeration (crt.sh, dnsrecon)...",
  "Found 3 subdomains.",
  "Initiating port scan (top 1000 TCP)...",
  "Port scan complete. Found 3 open ports.",
  "Fingerprinting services...",
  "Detected nginx/1.18.0, PHP 7.4, WordPress 5.8",
  "Starting web vulnerability scan...",
  "Testing SQL injection on 34 endpoints...",
  "[ALERT] Potential Blind SQLi detected on /login.php",
  "Testing XSS vulnerabilities...",
  "[ALERT] Reflected XSS found on /search",
  "Crawling API endpoints...",
  "Testing API authentication...",
  "Starting directory bruteforce...",
  "Found sensitive directory: /admin",
  "Testing default credentials...",
  "[CRITICAL] Default credentials successful on /admin",
  "Checking for exploitability and reverse shell vectors...",
  "[CRITICAL] Unrestricted file upload found on /upload.php",
  "Compiling final report...",
  "Assessment complete."
];

export function ScanningPage({ domain, scanId, onComplete, isMockMode }: ScanningPageProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // If we have a scanId, this is real mode - wait for completion
    if (scanId) {
      setLogs([
        `[${new Date().toISOString()}] Initializing scan for ${domain}`,
        `[${new Date().toISOString()}] Connecting to scan engine...`,
        `[${new Date().toISOString()}] Scan ID: ${scanId}`,
        `[${new Date().toISOString()}] Waiting for scan results...`,
      ]);
      setProgress(10);
      
      // Show progress simulation while waiting
      const interval = setInterval(() => {
        setLogs(prev => {
          if (prev.length > 20) return prev;
          const newLogs = [...prev];
          const messages = [
            'Performing DNS enumeration...',
            'Scanning common ports...',
            'Detecting web technologies...',
            'Testing for SQL injection...',
            'Testing for XSS vulnerabilities...',
            'Analyzing API endpoints...',
          ];
          const msg = messages[Math.floor(Math.random() * messages.length)];
          newLogs.push(`[${new Date().toISOString()}] ${msg}`);
          return newLogs;
        });
        setProgress(p => Math.min(p + 5, 90));
      }, 2000);
      
      // When parent component detects completion, trigger onComplete
      return () => clearInterval(interval);
    }
    
    // Mock mode - use predefined logs
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < mockLogs.length) {
        setLogs(prev => [...prev, mockLogs[currentIndex]]);
        setProgress(Math.floor(((currentIndex + 1) / mockLogs.length) * 100));
        currentIndex++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 1000);
      }
    }, 400); // Fast simulation

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold font-mono flex items-center gap-3">
              <Activity className="w-6 h-6 text-red-500 animate-pulse" />
              Active Assessment
            </h2>
            <p className="text-zinc-400 mt-1 font-mono text-sm">Target: {domain}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold font-mono text-red-500">{progress}%</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider">Progress</div>
          </div>
        </div>

        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-red-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader className="border-b border-zinc-800/50 pb-4">
            <CardTitle className="text-sm font-mono flex items-center gap-2 text-zinc-400">
              <Terminal className="w-4 h-4" />
              Live Execution Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px] overflow-y-auto p-4 font-mono text-sm space-y-2 flex flex-col">
              {logs.map((log, i) => (
                <div 
                  key={i} 
                  className={`
                    ${(log || '').includes('[CRITICAL]') ? 'text-red-400 font-bold' : ''}
                    ${(log || '').includes('[ALERT]') ? 'text-orange-400' : ''}
                    ${!(log || '').includes('[') ? 'text-zinc-400' : ''}
                  `}
                >
                  <span className="text-zinc-600 mr-4">[{new Date().toISOString().split('T')[1].substring(0,8)}]</span>
                  {log}
                </div>
              ))}
              {progress < 100 && (
                <div className="flex items-center gap-2 text-zinc-500 mt-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
                </div>
              )}
              {/* Auto-scroll anchor */}
              <div style={{ float:"left", clear: "both" }}
                   ref={(el) => { el?.scrollIntoView({ behavior: 'smooth' }) }}>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
