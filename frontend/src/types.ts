export type Severity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export interface Finding {
  id: string;
  category: 'Recon' | 'Web Vulns' | 'API Vulns' | 'Bruteforce' | 'Exploits';
  severity: Severity;
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

export const mockScanResult: ScanResult = {
  id: 'scan-123',
  targetDomain: 'mytestweb.com',
  status: 'completed',
  startTime: new Date(Date.now() - 3600000).toISOString(),
  endTime: new Date().toISOString(),
  progress: 100,
  reconData: {
    subdomains: ['www.mytestweb.com', 'admin.mytestweb.com', 'api.mytestweb.com'],
    openPorts: ['80 (HTTP)', '443 (HTTPS)', '22 (SSH)'],
    technologies: ['nginx/1.18.0', 'PHP 7.4', 'WordPress 5.8'],
  },
  findings: [
    {
      id: 'f-1',
      category: 'Web Vulns',
      severity: 'Critical',
      title: 'Blind SQL injection',
      description: 'Automated detection using parameter fuzzing with common payloads (time-based blind).',
      affectedUrl: '/login.php (POST parameter `user`)',
      evidence: "Payload: `user=admin' AND SLEEP(5)--` -> 5-second delay observed.",
      remediation: 'Use prepared statements or parameterized queries to prevent SQL injection.',
    },
    {
      id: 'f-2',
      category: 'Web Vulns',
      severity: 'High',
      title: 'Reflected XSS',
      description: 'Test for reflected XSS using payloads that trigger alerts.',
      affectedUrl: '/search?q=<script>alert(1)</script>',
      evidence: 'Response contained unescaped script tags reflecting user input.',
      remediation: 'Implement strict context-aware output encoding and a Content Security Policy (CSP).',
    },
    {
      id: 'f-3',
      category: 'Bruteforce',
      severity: 'High',
      title: 'Default credentials found',
      description: 'Attempted default credentials and common weak passwords.',
      affectedUrl: '/admin',
      evidence: 'Login successful with admin/admin',
      remediation: 'Enforce strong password policies and disable default accounts. Implement rate limiting.',
    },
    {
      id: 'f-4',
      category: 'Exploits',
      severity: 'Critical',
      title: 'File upload vulnerability',
      description: 'Identify potential attack surfaces where a reverse shell could be achieved.',
      affectedUrl: '/upload.php',
      evidence: 'Upload reverse-shell.php, accessible at /uploads/reverse-shell.php',
      remediation: 'Restrict file types, validate contents, and store uploads outside the web root.',
    },
    {
      id: 'f-5',
      category: 'Recon',
      severity: 'Info',
      title: 'Outdated PHP Version',
      description: 'The server is running an outdated version of PHP.',
      affectedUrl: 'mytestweb.com',
      evidence: 'Server header: PHP 7.4',
      remediation: 'Upgrade to a supported PHP version (8.x) to receive security patches.',
    }
  ],
};
