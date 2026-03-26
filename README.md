# VulnScout - Security Assessment Tool

## ⚠️ IMPORTANT DISCLAIMER

**VulnScout is a security assessment tool intended for authorized security testing only.**

- You MUST have explicit written authorization from the target domain owner before scanning
- Unauthorized scanning is illegal and may violate computer fraud laws (e.g., CFAA, CMA)
- The tool developers assume NO liability for misuse
- Use responsibly and ethically

## Overview

VulnScout is a comprehensive domain security assessment suite that performs:
- Reconnaissance & Enumeration (subdomains, ports, tech fingerprinting)
- Web Application Vulnerability Scanning (SQLi, XSS, CSRF, etc.)
- API Security Testing
- Brute-force & Credential Testing
- Reverse Shell & Exploitability Checks

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI
- **Database**: PostgreSQL
- **Scanner Engine**: Python with async support

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Manual Setup

#### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create `.env` files:

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/vulnscout
SECRET_KEY=your-secret-key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## Scan Options

- **Quick Scan**: Basic reconnaissance + common vulnerabilities
- **Deep Scan**: Full enumeration + all vulnerability tests

## Features

### Reconnaissance
- Subdomain enumeration via DNS brute-forcing and certificate logs
- Port scanning (top 1000 TCP ports)
- Technology fingerprinting (web server, frameworks, CMS)

### Vulnerability Scanning
- SQL Injection (error-based, boolean-based, time-based)
- Cross-Site Scripting (reflected, stored, DOM-based)
- CSRF detection
- Open Redirect, LFI/RFI, Command Injection
- Path Traversal, XXE, IDOR, SSRF

### API Security
- Endpoint discovery and testing
- Authentication validation
- Parameter injection
- Rate limit checks

### Brute Force
- Login credential testing
- Directory/file discovery
- Default credentials check

### Reporting
- Real-time progress updates
- Severity-based findings
- Export to JSON/CSV/PDF

## License

MIT License - See LICENSE file 
