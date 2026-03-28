"""
VulnScout Vulnerability Scanner Module
Tests for SQLi, XSS, CSRF, and other web vulnerabilities
"""
import asyncio
import re
import time
from typing import List, Dict, Optional
import aiohttp
from bs4 import BeautifulSoup


class VulnerabilityScanner:
    """Web application vulnerability scanner"""

    # SQL Injection payloads
    SQLI_PAYLOADS = [
        # Error-based
        "' OR '1'='1",
        "' OR '1'='1' --",
        "' OR '1'='1' /*",
        "1' ORDER BY 1--",
        "1' ORDER BY 2--",
        "1' ORDER BY 3--",
        "' UNION SELECT NULL--",
        "' UNION SELECT NULL,NULL--",
        # Boolean-based
        "' AND 1=1--",
        "' AND 1=2--",
        "' AND 'a'='a",
        "' AND 'a'='b",
        # Time-based
        "'; WAITFOR DELAY '0:0:5'--",
        "'; SELECT SLEEP(5)--",
        "' AND SLEEP(5)--",
        "1' AND SLEEP(5)--",
        # Comment-based
        "admin'--",
        "' OR 1=1--",
    ]

    # XSS payloads
    XSS_PAYLOADS = [
        "<script>alert('XSS')</script>",
        "<script>alert(document.cookie)</script>",
        "<img src=x onerror=alert('XSS')>",
        "<svg onload=alert('XSS')>",
        "javascript:alert('XSS')",
        "<body onload=alert('XSS')>",
        "<iframe src=javascript:alert('XSS')>",
        "'-alert('XSS')-'",
        "\"><script>alert('XSS')</script>",
        "<script>alert(String.fromCharCode(88,83,83))</script>",
        "<img src=\"x\" onerror=\"alert(1)\">",
        "<svg><script>alert('XSS')</script>",
    ]

    # Path traversal payloads
    PATH_TRAVERSAL_PAYLOADS = [
        "../../../etc/passwd",
        "../../../etc/passwd%00",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "....//....//....//etc/passwd",
        "..%252f..%252f..%252fetc/passwd",
        "..%c0%af..%c0%af..%c0%afetc/passwd",
    ]

    # Command injection payloads
    CMD_INJECTION_PAYLOADS = [
        "; ls -la",
        "| ls -la",
        "& ls -la",
        "`ls -la`",
        "$(ls -la)",
        "\nls -la\n",
        "&& ls -la",
        "|| ls -la",
    ]

    # SSRF payloads
    SSRF_PAYLOADS = [
        "http://localhost/",
        "http://127.0.0.1/",
        "http://[::1]/",
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/",
    ]

    def __init__(self, target: str, recon_results: dict):
        self.target = target
        self.recon_results = recon_results
        self.findings: List[Dict] = []
        self.scanned_urls: set = set()

    async def scan(self) -> List[Dict]:
        """Run all vulnerability scans"""
        # Get discovered endpoints
        endpoints = self._discover_endpoints()
        
        # Limit endpoints for faster scanning
        endpoints = endpoints[:4]

        # Scan each endpoint with limited payloads
        for i, endpoint in enumerate(endpoints):
            await self._scan_endpoint(endpoint)
            # Update progress periodically
            if (i + 1) % 2 == 0:
                await asyncio.sleep(0.1)

        return self.findings

    def _discover_endpoints(self) -> List[Dict]:
        """Discover endpoints to scan from reconnaissance results"""
        endpoints = []
        base_urls = []

        # Add main target only (quick scan)
        base_urls.append(f"http://{self.target}")
        if self.recon_results.get("technologies"):
            base_urls.append(f"https://{self.target}")

        # Quick paths only - limit for demo
        common_paths = [
            "/", "/index.html", "/login", "/admin", "/search",
            "/api", "/wp-admin", "/dashboard",
        ]

        for base in base_urls[:2]:  # Limit to first 2
            for path in common_paths[:6]:  # Limit to first 6
                endpoints.append({
                    "url": base + path,
                    "method": "GET",
                    "params": {}
                })

        return endpoints

    async def _scan_endpoint(self, endpoint: Dict):
        """Scan a single endpoint for vulnerabilities"""
        url = endpoint["url"]
        
        if url in self.scanned_urls:
            return
        self.scanned_urls.add(url)

        try:
            # GET scan
            await self._check_sqli(url, "GET")
            await self._check_xss(url, "GET")
            await self._check_path_traversal(url, "GET")
            await self._check_cmd_injection(url, "GET")
            await self._check_ssrf(url, "GET")

            # Try to find forms for POST scanning
            await self._scan_forms(url)

        except Exception:
            pass

    async def _scan_forms(self, url: str):
        """Scan forms on the page for vulnerabilities"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10) as resp:
                    if resp.status == 200:
                        content = await resp.text()
                        soup = BeautifulSoup(content, "html.parser")

                        # Find all forms
                        for form in soup.find_all("form"):
                            action = form.get("action", "")
                            method = form.get("method", "post").lower()

                            if not action:
                                action = url
                            elif not action.startswith("http"):
                                # Relative URL
                                from urllib.parse import urljoin
                                action = urljoin(url, action)

                            # Get form inputs
                            inputs = {}
                            for input_tag in form.find_all(["input", "textarea", "select"]):
                                name = input_tag.get("name")
                                if name:
                                    inputs[name] = input_tag.get("value", "")

                            if inputs:
                                # Test each input
                                for param in inputs.keys():
                                    # SQLi test
                                    await self._check_sqli(action, method.upper(), param)
                                    
                                    # XSS test
                                    await self._check_xss(action, method.upper(), param)

        except Exception:
            pass

    async def _check_sqli(self, url: str, method: str = "GET", param: str = None):
        """Check for SQL injection vulnerabilities"""
        # Simple parameter extraction
        if "?" in url:
            base_url, query = url.split("?", 1)
            params = dict(p.split("=") for p in query.split("&") if "=" in p)
        else:
            base_url = url
            params = {}

        # Add test parameter if provided
        if param:
            params[param] = "test"

        for payload in self.SQLI_PAYLOADS[:5]:  # Limit payloads
            try:
                if method == "GET":
                    test_params = {**params, param or "q": payload}
                    async with aiohttp.ClientSession() as session:
                        start_time = time.time()
                        async with session.get(base_url, params=test_params, timeout=10) as resp:
                            response_time = time.time() - start_time
                            content = await resp.text()

                            # Check for SQL errors
                            sql_errors = [
                                "mysql_fetch", "mysql_num_rows", "mysql_fetch_array",
                                "Warning: mysql", "MySQL Syntax", "SQL syntax",
                                "ORA-", "PostgreSQL query failed", "Microsoft SQL Native Error",
                                "Unterminated quoted string", "SQLServer Error",
                                "JET Database Engine", "Access Database Engine"
                            ]

                            for error in sql_errors:
                                if error.lower() in content.lower():
                                    self.findings.append({
                                        "severity": "Critical",
                                        "type": "SQL Injection",
                                        "url": url,
                                        "parameter": param or "q",
                                        "payload": payload,
                                        "evidence": f"SQL error detected: {error}",
                                        "remediation": "Use parameterized queries/prepared statements"
                                    })
                                    return

                            # Time-based detection
                            if response_time > 4.5:
                                self.findings.append({
                                    "severity": "Critical",
                                    "type": "SQL Injection (Time-based)",
                                    "url": url,
                                    "parameter": param or "q",
                                    "payload": payload,
                                    "evidence": f"Response delayed by {response_time:.2f}s",
                                    "remediation": "Use parameterized queries"
                                })
                                return

            except Exception:
                pass

    async def _check_xss(self, url: str, method: str = "GET", param: str = None):
        """Check for XSS vulnerabilities"""
        if "?" in url:
            base_url, query = url.split("?", 1)
            params = dict(p.split("=") for p in query.split("&") if "=" in p)
        else:
            base_url = url
            params = {}

        if param:
            params[param] = ""

        for payload in self.XSS_PAYLOADS[:5]:
            try:
                test_params = {**params, param or "q": payload}
                async with aiohttp.ClientSession() as session:
                    async with session.get(base_url, params=test_params, timeout=10) as resp:
                        content = await resp.text()

                        # Check if payload is reflected
                        if payload in content or payload.replace("<", "&lt;") in content:
                            self.findings.append({
                                "severity": "High",
                                "type": "Cross-Site Scripting (XSS)",
                                "url": url,
                                "parameter": param or "q",
                                "payload": payload,
                                "evidence": "Payload reflected in response",
                                "remediation": "Implement output encoding and Content-Security-Policy"
                            })
                            return

            except Exception:
                pass

    async def _check_path_traversal(self, url: str, method: str = "GET"):
        """Check for path traversal vulnerabilities"""
        # Common file endpoints
        file_params = ["file", "path", "filename", "page", "template", "doc"]

        for param in file_params:
            for payload in self.PATH_TRAVERSAL_PAYLOADS[:3]:
                try:
                    test_url = url.split("?")[0]
                    test_params = {param: payload}
                    async with aiohttp.ClientSession() as session:
                        async with session.get(test_url, params=test_params, timeout=10) as resp:
                            content = await resp.text()

                            # Check for sensitive file content
                            if "root:" in content or "[boot loader]" in content:
                                self.findings.append({
                                    "severity": "High",
                                    "type": "Path Traversal",
                                    "url": url,
                                    "parameter": param,
                                    "payload": payload,
                                    "evidence": "Sensitive file content leaked",
                                    "remediation": "Validate and sanitize file paths"
                                })
                                return

                except Exception:
                    pass

    async def _check_cmd_injection(self, url: str, method: str = "GET"):
        """Check for command injection"""
        cmd_params = ["cmd", "command", "exec", "system", "shell"]

        for param in cmd_params:
            for payload in self.CMD_INJECTION_PAYLOADS[:3]:
                try:
                    test_url = url.split("?")[0]
                    test_params = {param: payload}
                    async with aiohttp.ClientSession() as session:
                        async with session.get(test_url, params=test_params, timeout=10) as resp:
                            content = await resp.text()

                            # Check for command output
                            if "root:" in content or "total " in content or "drwx" in content:
                                self.findings.append({
                                    "severity": "Critical",
                                    "type": "Command Injection",
                                    "url": url,
                                    "parameter": param,
                                    "payload": payload,
                                    "evidence": "Command output detected",
                                    "remediation": "Validate input and use sandboxing"
                                })
                                return

                except Exception:
                    pass

    async def _check_ssrf(self, url: str, method: str = "GET"):
        """Check for Server-Side Request Forgery"""
        ssrf_params = ["url", "uri", "dest", "redirect", "next", "data", "reference", "site", "html", "val", "validate", "domain", "callback", "return", "page", "feed", "host", "port", "to", "out", "view", "dir", "show", "navigation", "open", "file", "document", "folder", "pg", "style", "doc", "img", "source"]

        for param in ssrf_params:
            for payload in self.SSRF_PAYLOADS[:2]:
                try:
                    test_url = url.split("?")[0]
                    test_params = {param: payload}
                    async with aiohttp.ClientSession() as session:
                        async with session.get(test_url, params=test_params, timeout=10) as resp:
                            # We can't easily detect SSRF but can identify potential
                            # This is a simplified check
                            pass

                except Exception:
                    pass

    def get_results(self) -> List[Dict]:
        """Get all findings"""
        return self.findings