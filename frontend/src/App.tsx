/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { ScanningPage } from './components/ScanningPage';
import { ResultsDashboard } from './components/ResultsDashboard';
import { mockScanResult } from './types';

type AppState = 'landing' | 'scanning' | 'results';

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [targetDomain, setTargetDomain] = useState('');

  const handleStartScan = (domain: string, isDeep: boolean) => {
    setTargetDomain(domain);
    setAppState('scanning');
  };

  const handleScanComplete = () => {
    setAppState('results');
  };

  const handleNewScan = () => {
    setTargetDomain('');
    setAppState('landing');
  };

  // Dynamically update the mock data to reflect the user's inputted domain
  const dynamicResult = {
    ...mockScanResult,
    targetDomain: targetDomain || mockScanResult.targetDomain,
    reconData: {
      ...mockScanResult.reconData,
      subdomains: mockScanResult.reconData.subdomains.map(sub => 
        sub.replace('mytestweb.com', targetDomain || 'mytestweb.com')
      ),
    },
    findings: mockScanResult.findings.map(f => ({
      ...f,
      affectedUrl: f.affectedUrl.replace('mytestweb.com', targetDomain || 'mytestweb.com')
    }))
  };

  return (
    <>
      {appState === 'landing' && (
        <LandingPage onStartScan={handleStartScan} />
      )}
      {appState === 'scanning' && (
        <ScanningPage domain={targetDomain} onComplete={handleScanComplete} />
      )}
      {appState === 'results' && (
        <ResultsDashboard 
          result={dynamicResult} 
          onNewScan={handleNewScan} 
        />
      )}
    </>
  );
}

