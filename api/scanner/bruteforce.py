"""
VulnScout Brute Force Testing Module
Tests for weak credentials and discovers hidden paths
"""
import asyncio
from typing import List, Dict, Optional
import aiohttp
from bs4 import BeautifulSoup


class BruteForceTester:
    """Brute force and credential testing module"""

    # Common directories/files to check
    WORDLIST = [
        # Admin panels
        "admin", "adminpanel", "administrator", "adminlogin", "login", 
        "wp-admin", "admin.php", "administrator.php", "login.php",
        "cpanel", "phpmyadmin", "wp-login.php",
        # Common paths
        "backup", "backups", "bak", "old", "archive", "archives",
        "config", "configuration", "settings", "setup",
        "debug", "test", "testing", "tmp", "temp", "cache",
        "logs", "log", "uploads", "upload", "files", "images",
        "api", "api-docs", "docs", "documentation",
        # Sensitive files
        ".git", ".git/config", ".env", ".htaccess", "config.php",
        "wp-config.php", "configuration.php", "settings.php",
        "database.php", "db.php", "connection.php",
        "phpinfo.php", "info.php", "server-status",
        # User paths
        "user", "users", "profile", "account", "dashboard",
        "panel", "control", "manage", "manager",
    ]

    # Default credentials to test
    DEFAULT_CREDENTIALS = [
        ("admin", "admin"),
        ("admin", "password"),
        ("admin", "123456"),
        ("root", "root"),
        ("root", "toor"),
        ("root", "password"),
        ("administrator", "administrator"),
        ("administrator", "password"),
        ("test", "test"),
        ("guest", "guest"),
        ("user", "user"),
        ("user", "password"),
        ("ubnt", "ubnt"),
        ("admin", "1234"),
        ("admin", "12345"),
    ]

    def __init__(self, target: str, recon_results: dict):
        self.target = target
        self.recon_results = recon_results
        self.findings: List[Dict] = []
        self.discovered_paths: List[Dict] = []

    async def scan(self) -> List[Dict]:
        """Run all brute force tests"""
        # Directory/file discovery
        await self._discover_directories()

        # Login form testing
        await self._test_login_forms()

        return self.findings

    async def _discover_directories(self):
        """Discover hidden directories and files"""
        base_urls = [
            f"http://{self.target}",
            f"https://{self.target}",
        ]

        for subdomain in self.recon_results.get("subdomains", []):
            base_urls.append(f"http://{subdomain['subdomain']}")

        for base in base_urls[:5]:  # Limit to avoid too many requests
            # Try common paths
            for path in self.WORDLIST[:50]:  # Limit for performance
                url = f"{base}/{path}"
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(url, timeout=3, allow_redirects=False) as resp:
                            if resp.status in [200, 301, 302, 403]:
                                self.discovered_paths.append({
                                    "url": url,
                                    "status": resp.status,
                                    "redirect": resp.headers.get("Location", "")
                                })

                                # Check if sensitive
                                if self._is_sensitive(path):
                                    self.findings.append({
                                        "severity": "Medium",
                                        "type": "Sensitive Path Exposed",
                                        "url": url,
                                        "evidence": f"Status: {resp.status}",
                                        "remediation": "Restrict access to sensitive paths"
                                    })

                except Exception:
                    pass

    def _is_sensitive(self, path: str) -> bool:
        """Check if a path is potentially sensitive"""
        sensitive = [
            ".git", ".env", "config", "wp-config", "database", 
            "phpmyadmin", "cpanel", "admin", "backup", "bak",
            "log", "password", "secret", "private"
        ]
        return any(s in path.lower() for s in sensitive)

    async def _test_login_forms(self):
        """Test login forms for weak credentials"""
        # Find login pages
        login_paths = [
            "/login", "/login.php", "/login.html", "/signin", "/signin.html",
            "/admin", "/admin.php", "/wp-admin", "/administrator",
            "/auth", "/auth/login", "/account/login",
        ]

        for path in login_paths:
            url = f"http://{self.target}{path}"
            await self._test_login_page(url)

        # Also check discovered paths for login forms
        for discovered in self.discovered_paths:
            url = discovered["url"]
            if "login" in url.lower() or "admin" in url.lower():
                await self._test_login_page(url)

    async def _test_login_page(self, url: str):
        """Test a login page for weak credentials"""
        try:
            async with aiohttp.ClientSession() as session:
                # Get the login page
                async with session.get(url, timeout=10) as resp:
                    if resp.status != 200:
                        return

                    content = await resp.text()
                    soup = BeautifulSoup(content, "html.parser")

                    # Find forms
                    forms = soup.find_all("form")
                    
                    for form in forms:
                        action = form.get("action", "")
                        method = form.get("method", "post").lower()

                        # Get input fields
                        inputs = {}
                        for input_tag in form.find_all("input"):
                            name = input_tag.get("name", "")
                            input_type = input_tag.get("type", "text")
                            if name and input_type != "submit":
                                inputs[name] = ""

                        if not inputs:
                            continue

                        # Test default credentials
                        for username, password in self.DEFAULT_CREDENTIALS:
                            test_data = {**inputs, list(inputs.keys())[0]: username}
                            
                            # Try to find password field
                            pwd_fields = [k for k in inputs.keys() if "pass" in k.lower() or "pwd" in k.lower()]
                            if pwd_fields:
                                test_data[pwd_fields[0]] = password
                            else:
                                continue

                            # Submit the form
                            if method == "post":
                                form_url = action if action.startswith("http") else f"{url.rsplit('/', 1)[0]}/{action}"
                                try:
                                    async with session.post(form_url, data=test_data, timeout=10, allow_redirects=False) as login_resp:
                                        # Check for successful login
                                        if login_resp.status in [302, 303]:
                                            redirect = login_resp.headers.get("Location", "")
                                            if redirect and redirect != url:
                                                self.findings.append({
                                                    "severity": "High",
                                                    "type": "Default Credentials",
                                                    "url": url,
                                                    "credential": f"{username}/{password}",
                                                    "evidence": f"Login successful, redirected to {redirect}",
                                                    "remediation": "Change default credentials immediately"
                                                })
                                                return
                                except Exception:
                                    pass

        except Exception:
            pass

    def get_results(self) -> List[Dict]:
        """Get all findings"""
        return self.findings