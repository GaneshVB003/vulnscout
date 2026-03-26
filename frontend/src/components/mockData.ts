/**
 * Mock scan data for when API is unavailable
 */

import type { ScanResult } from '../lib/api';

export const mockScanResult: ScanResult = {
  id: 'mock-scan-001',
  targetDomain: 'example.com',
  status: 'completed',
  startTime: new Date(Date.now() - 60000).toISOString(),
  endTime: new Date().toISOString(),
  progress: 100,
  findings: [
    {
      id: '1',
      category: 'Web Vulns',
      severity: 'Critical',
      title: 'SQL Injection Vulnerability',
      description: 'Time-based blind SQL injection detected in login form.',
      affectedUrl: '/login.php?user=admin',
      evidence: "Payload: admin' AND SLEEP(5)-- resulted in 5 second delay",
      remediation: 'Use parameterized queries or prepared statements for all database operations.'
    },
    {
      id: '2',
      category: 'Web Vulns',
      severity: 'High',
      title: 'Reflected XSS',
      description: 'Cross-site scripting vulnerability found in search parameter.',
      affectedUrl: '/search?q=<script>alert(1)</script>',
      evidence: 'Script tag reflected without sanitization in response',
      remediation: 'Implement context-aware output encoding and Content Security Policy.'
    },
    {
      id: '3',
      category: 'Recon',
      severity: 'Info',
      title: 'Server Information Disclosure',
      description: 'Server reveals version information in headers.',
      affectedUrl: '/',
      evidence: 'X-Powered-By: PHP/7.4, Server: Apache/2.4.41',
      remediation: 'Disable server version disclosure in web server configuration.'
    },
    {
      id: '4',
      category: 'Bruteforce',
      severity: 'High',
      title: 'Weak Password Policy',
      description: 'Login page allows weak passwords without rate limiting.',
      affectedUrl: '/admin/login.php',
      evidence: 'No account lockout after 10 failed attempts',
      remediation: 'Implement account lockout, CAPTCHA, and strong password requirements.'
    }
  ],
  reconData: {
    subdomains: [
      'www.example.com',
      'mail.example.com',
      'api.example.com',
      'admin.example.com'
    ],
    openPorts: [
      '80 (HTTP)',
      '443 (HTTPS)',
      '22 (SSH)',
      '21 (FTP)'
    ],
    technologies: [
      'Apache/2.4.41',
      'PHP 7.4',
      'WordPress 5.8'
    ]
  }
};

export function getDynamicMockResult(targetDomain: string): ScanResult {
  return {
    ...mockScanResult,
    id: `scan-${Date.now()}`,
    targetDomain,
    findings: mockScanResult.findings.map(f => ({
      ...f,
      affectedUrl: f.affectedUrl.replace('example.com', targetDomain)
    })),
    reconData: {
      ...mockScanResult.reconData,
      subdomains: mockScanResult.reconData.subdomains.map(s => s.replace('example.com', targetDomain))
    }
  };
}