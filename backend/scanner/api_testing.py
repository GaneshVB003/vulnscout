"""
VulnScout API Security Testing Module
Tests API endpoints for security vulnerabilities
"""
import asyncio
import re
from typing import List, Dict, Optional
import aiohttp
from bs4 import BeautifulSoup


class APISecurityTester:
    """API security testing module"""

    # Common API paths
    API_PATHS = [
        "/api", "/api/v1", "/api/v2", "/api/v3", "/api/users", "/api/auth",
        "/api/login", "/api/register", "/api/token", "/api/jwt", "/api/admin",
        "/graphql", "/graphql/v1", "/rest", "/rest/api", "/wp-json", 
        "/api-docs", "/swagger", "/openapi", "/api/docs",
        "/api/orders", "/api/products", "/api/customers", "/api/notes",
    ]

    def __init__(self, target: str, recon_results: dict):
        self.target = target
        self.recon_results = recon_results
        self.findings: List[Dict] = []
        self.discovered_endpoints: List[Dict] = []

    async def scan(self) -> List[Dict]:
        """Run API security tests"""
        # Discover API endpoints
        await self._discover_endpoints()

        # Test each endpoint
        for endpoint in self.discovered_endpoints:
            await self._test_endpoint(endpoint)

        return self.findings

    async def _discover_endpoints(self):
        """Discover API endpoints"""
        base_urls = [
            f"http://{self.target}",
            f"https://{self.target}",
        ]

        for subdomain in self.recon_results.get("subdomains", []):
            base_urls.append(f"http://{subdomain['subdomain']}")

        # Try common API paths
        for base in base_urls:
            for path in self.API_PATHS:
                url = base + path
                try:
                    async with aiohttp.ClientSession() as session:
                        # Try OPTIONS first
                        async with session.options(url, timeout=5) as resp:
                            if resp.status < 500:
                                self.discovered_endpoints.append({
                                    "url": url,
                                    "method": "OPTIONS",
                                    "headers": dict(resp.headers)
                                })

                        # Try GET
                        async with session.get(url, timeout=5) as resp:
                            if resp.status < 500:
                                self.discovered_endpoints.append({
                                    "url": url,
                                    "method": "GET",
                                    "status": resp.status,
                                    "headers": dict(resp.headers)
                                })

                                # Check for JSON/API response
                                content_type = resp.headers.get("Content-Type", "")
                                if "json" in content_type.lower():
                                    try:
                                        data = await resp.json()
                                        # Look for links/paths in response
                                        await self._extract_paths_from_json(data, url)
                                    except:
                                        pass

                except Exception:
                    pass

        # Also scan HTML pages for API patterns
        await self._scan_html_for_api()

    async def _extract_paths_from_json(self, data: dict, base_url: str):
        """Extract API paths from JSON response"""
        paths = []
        
        def extract(obj):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if key in ["url", "path", "endpoint", "link", "href"]:
                        if isinstance(value, str) and value.startswith("/"):
                            paths.append(value)
                    extract(value)
            elif isinstance(obj, list):
                for item in obj:
                    extract(item)

        extract(data)

        for path in paths[:10]:
            if path not in [e["url"] for e in self.discovered_endpoints]:
                self.discovered_endpoints.append({
                    "url": base_url.rstrip("/") + path,
                    "method": "GET",
                    "source": "json_response"
                })

    async def _scan_html_for_api(self):
        """Scan HTML for API-related patterns"""
        common_html_paths = [
            "/", "/index", "/index.html", "/home", "/docs", "/documentation"
        ]

        for path in common_html_paths:
            url = f"http://{self.target}{path}"
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=5) as resp:
                        if resp.status == 200:
                            content = await resp.text()
                            soup = BeautifulSoup(content, "html.parser")

                            # Find links with API patterns
                            for link in soup.find_all("a", href=True):
                                href = link["href"]
                                if any(p in href.lower() for p in ["/api/", "/v1/", "/v2/", "/graphql"]):
                                    full_url = href if href.startswith("http") else f"http://{self.target}{href}"
                                    if full_url not in [e["url"] for e in self.discovered_endpoints]:
                                        self.discovered_endpoints.append({
                                            "url": full_url,
                                            "method": "GET",
                                            "source": "html_link"
                                        })

                            # Find scripts with API calls
                            for script in soup.find_all("script", src=True):
                                src = script["src"]
                                if "api" in src.lower():
                                    # Extract potential endpoints from JS
                                    pass

            except Exception:
                pass

    async def _test_endpoint(self, endpoint: Dict):
        """Test a single API endpoint"""
        url = endpoint["url"]
        method = endpoint.get("method", "GET")

        # Test missing authentication
        await self._check_authentication(url, method)

        # Test for information disclosure
        await self._check_information_disclosure(url, method)

        # Test for rate limiting
        await self._check_rate_limiting(url)

    async def _check_authentication(self, url: str, method: str):
        """Check if authentication is required"""
        try:
            async with aiohttp.ClientSession() as session:
                # Test without auth
                async with session.request(method, url, timeout=5) as resp:
                    # If sensitive endpoint doesn't require auth
                    sensitive_keywords = ["user", "admin", "order", "payment", "private", "profile"]
                    if any(kw in url.lower() for kw in sensitive_keywords):
                        if resp.status == 200:
                            self.findings.append({
                                "severity": "High",
                                "type": "Missing API Authentication",
                                "url": url,
                                "evidence": f"Endpoint accessible without authentication (Status: {resp.status})",
                                "remediation": "Implement proper authentication (API keys, OAuth, JWT)"
                            })
                        elif resp.status == 401:
                            # Check if WWW-Authenticate header is missing
                            if "WWW-Authenticate" not in resp.headers:
                                self.findings.append({
                                    "severity": "Medium",
                                    "type": "Weak Authentication",
                                    "url": url,
                                    "evidence": "No WWW-Authenticate header",
                                    "remediation": "Use standard authentication schemes"
                                })

        except Exception:
            pass

    async def _check_information_disclosure(self, url: str, method: str):
        """Check for information disclosure"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(method, url, timeout=5) as resp:
                    content_type = resp.headers.get("Content-Type", "")
                    
                    if resp.status == 200 and "json" in content_type.lower():
                        data = await resp.json()
                        data_str = str(data).lower()
                        
                        # Check for sensitive data exposure
                        sensitive_patterns = {
                            "email": ["email", "mail"],
                            "password": ["password", "passwd", "pwd", "secret"],
                            "token": ["token", "jwt", "access_token", "api_key"],
                            "internal": ["internal", "private", "admin", "debug"]
                        }

                        for pattern_type, keywords in sensitive_patterns.items():
                            if any(kw in data_str for kw in keywords):
                                self.findings.append({
                                    "severity": "Medium",
                                    "type": f"Information Disclosure - {pattern_type}",
                                    "url": url,
                                    "evidence": f"Sensitive {pattern_type} data found in response",
                                    "remediation": "Filter sensitive data from API responses"
                                })
                                break

        except Exception:
            pass

    async def _check_rate_limiting(self, url: str):
        """Check for rate limiting headers"""
        try:
            async with aiohttp.ClientSession() as session:
                # Make multiple requests
                results = []
                for _ in range(5):
                    async with session.get(url, timeout=5) as resp:
                        results.append(resp.status)
                        if "Retry-After" in resp.headers:
                            break

                # Check if rate limiting is implemented
                if len(set(results)) > 1:  # Different responses
                    return

                # Check headers
                last_resp = results[-1]
                async with session.get(url, timeout=5) as resp:
                    rate_limit_headers = ["X-RateLimit-Limit", "X-RateLimit-Remaining", 
                                          "RateLimit-Limit", "RateLimit-Remaining"]
                    
                    has_rate_limit = any(h in resp.headers for h in rate_limit_headers)
                    
                    if not has_rate_limit:
                        self.findings.append({
                            "severity": "Low",
                            "type": "Missing Rate Limiting",
                            "url": url,
                            "evidence": "No rate limiting headers detected",
                            "remediation": "Implement rate limiting to prevent abuse"
                        })

        except Exception:
            pass

    def get_results(self) -> List[Dict]:
        """Get all findings"""
        return self.findings