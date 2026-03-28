/**
 * VulnScout - Main Application
 * Security Assessment Tool - For Authorized Testing Only
 */

import React, { useState, useEffect, useRef } from 'react';
import { LandingPage } from './components/LandingPage';
import { ScanningPage } from './components/ScanningPage';
import { ResultsDashboard } from './components/ResultsDashboard';
import { startScan, getScanStatus, checkHealth, type ScanResult, type Finding } from './lib/api';

type AppState = 'landing' | 'scanning' | 'results';

interface ReconData {
  subdomains: string[];
  openPorts: string[];
  technologies: string[];
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [targetDomain, setTargetDomain] = useState('');
  const [scanId, setScanId] = useState('');
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const pollRef = useRef<number | null>(null);

  // Global error handler for the entire app
  useEffect(() => {
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('GLOBAL ERROR:', message, source, lineno, colno, error);
    };
    window.onunhandledrejection = (event) => {
      console.error('UNHANDLED REJECTION:', event.reason);
    };
  }, []);

  // Check API availability on mount
  useEffect(() => {
    console.log('App mounted, checking API...');
    checkHealth()
      .then((available) => {
        console.log('API available:', available);
        setApiAvailable(available);
      })
      .catch((err) => {
        console.error('API check failed:', err);
        setApiAvailable(false);
      });
  }, []);

  const handleStartScan = async (domain: string, isDeep: boolean) => {
    console.log('handleStartScan called', domain, isDeep);
    setTargetDomain(domain);
    setScanResult(null);
    setAppState('scanning');
    setScanId('');
    
    // Delay to allow state update to propagate
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('State set to scanning, domain:', domain);
    
    try {
      // Try to start a real scan via API
      console.log('Calling startScan API...');
      const response = await startScan({
        target: domain,
        scan_type: isDeep ? 'deep' : 'quick',
        authorized: true
      });
      
      console.log('startScan response:', response);
      setScanId(response.scan_id);
      console.log('Scan started:', response.scan_id);
      
      // Poll for results every 2 seconds
      pollRef.current = window.setInterval(async () => {
        try {
          const status = await getScanStatus(response.scan_id);
          setScanResult(status);
          console.log('Scan status:', status.status, status.progress);
          
          if (status.status === 'completed') {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setAppState('results');
          } else if (status.status === 'failed') {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            setAppState('results');
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Failed to start scan:', error);
      // Show error state - don't fall back to fake scan
      console.error('Error details:', error);
      alert('Cannot connect to scanning backend: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setAppState('landing');
    }
  };

  const handleScanComplete = () => {
    setAppState('results');
  };

  const handleNewScan = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setTargetDomain('');
    setScanId('');
    setScanResult(null);
    setAppState('landing');
  };

  // If API is not available, show mock scan
  const isMockMode = apiAvailable === false;

  // Convert API result to expected format for ResultsDashboard
  const convertResult = (result: any) => ({
    id: result.scan_id || result.target,
    targetDomain: result.target,
    status: result.status,
    startTime: result.start_time,
    endTime: result.end_time,
    progress: result.progress || 100,
    // Extract findings from the backend response
    findings: result.findings || [],
    // Build recon data from findings
    reconData: {
      subdomains: result.findings?.find((f: any) => f.category === 'recon')?.findings?.subdomains || [],
      openPorts: result.findings?.find((f: any) => f.category === 'recon')?.findings?.ports || [],
      technologies: result.findings?.find((f: any) => f.category === 'recon')?.findings?.technologies || {}
    }
  });

  return (
    <>
      {appState === 'landing' && (
        <LandingPage 
          onStartScan={handleStartScan} 
          isApiAvailable={apiAvailable}
        />
      )}
      {appState === 'scanning' && (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-white">Loading scanning page...</div>
        </div>
      )}
      {appState === 'scanning' && scanId && (
        <ScanningPage 
          domain={targetDomain} 
          scanId={scanId}
          onComplete={handleScanComplete}
          isMockMode={isMockMode}
          scanResult={scanResult}
        />
      )}
      {appState === 'results' && (
        <ResultsDashboard 
          result={scanResult ? convertResult(scanResult) : null} 
          onNewScan={handleNewScan}
          targetDomain={targetDomain}
        />
      )}
    </>
  );
}

