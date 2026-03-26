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

  // Check API availability on mount
  useEffect(() => {
    checkHealth().then(setApiAvailable).catch(() => setApiAvailable(false));
  }, []);

  const handleStartScan = async (domain: string, isDeep: boolean) => {
    setTargetDomain(domain);
    setAppState('scanning');
    setScanResult(null);
    
    try {
      // Try to start a real scan via API
      const response = await startScan({
        target: domain,
        scan_type: isDeep ? 'deep' : 'quick',
        authorized: true
      });
      
      setScanId(response.scan_id);
      
      // Poll for results
      pollRef.current = window.setInterval(async () => {
        try {
          const status = await getScanStatus(response.scan_id);
          setScanResult(status);
          
          if (status.status === 'completed' || status.status === 'failed') {
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
      // Fall back to mock scan if API unavailable
      setAppState('scanning');
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

  // Convert API result to expected format
  const convertResult = (result: ScanResult) => ({
    id: result.id || result.targetDomain,
    targetDomain: result.targetDomain,
    status: result.status,
    startTime: result.startTime,
    endTime: result.endTime,
    progress: result.progress || 100,
    findings: result.findings || [],
    reconData: result.reconData || { subdomains: [], openPorts: [], technologies: [] }
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
        <ScanningPage 
          domain={targetDomain} 
          scanId={scanId}
          onComplete={handleScanComplete}
          isMockMode={isMockMode}
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

