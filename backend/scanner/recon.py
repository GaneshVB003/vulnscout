"""
VulnScout Reconnaissance Module
Performs subdomain enumeration, port scanning, and technology fingerprinting
"""
import asyncio
import socket
import subprocess
from typing import List, Dict, Optional
import aiohttp
from bs4 import BeautifulSoup
import dns.resolver
import json


class Reconnaissance:
    """Reconnaissance and enumeration module"""

    # Common subdomains for brute-forcing
    COMMON_SUBDOMAINS = [
        "www", "mail", "ftp", "localhost", "webmail", "smtp", "pop", "ns1", "webdisk",
        "ns2", "cpanel", "whm", "autodiscover", "autoconfig", "imap", "test", "ns",
        "blog", "pop3", "dev", "www2", "admin", "forum", "news", "vpn", "ns3", "mail2",
        "new", "mysql", "old", "lists", "support", "mobile", "mx", "static", "docs",
        "beta", "shop", "sql", "secure", "vpn2", "demo", "staging", "api", "cms",
        "gw", "ads", "host", "tv", "ww1", "cloud", "git", "stats", "dns2", "server",
        "pc", "latency", "tools", "mail1", "intern", "exchange", "mx1", "git2", "mta",
        "backup", "host2", "link", "web1", "ns4", "www1", "crm", "portal", "sms",
        "proxy", "storage", "db", "www3", "app", "apps", "portal2", "home", "dc1",
        "ns5", "director", "files", "search", "test2", "forum2", "mx2", "video", "s1",
        "ns6", "dc2", "dc3", "dc4", "live", "ws", "dns", "work", "mail3", "service",
        "support2", "help", "ns7", "ns8", "share", "site", "intranet", "gateway",
        "partners", "images", "img", "test3", "assets", "stats2", "network", "manage",
        "chat", "web2", "m", "d", "o", "q", "u", "v", "w", "x", "y", "z", "subdomain",
        "deep", "core", "net", "org", "edu", "gov", "mil", "int", "arpa", "afr",
        "ap", "eu", "la", "me", "us", "uk", "ca", "au", "ru", "cn", "de", "jp", "fr"
    ]

    # Common ports and services
    COMMON_PORTS = {
        21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP",
        110: "POP3", 111: "RPC", 135: "MSRPC", 139: "NetBIOS", 143: "IMAP",
        443: "HTTPS", 445: "SMB", 993: "IMAPS", 995: "POP3S", 1433: "MSSQL",
        1521: "Oracle", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL",
        5900: "VNC", 6379: "Redis", 8080: "HTTP-Proxy", 8443: "HTTPS-Alt",
        9200: "Elasticsearch", 27017: "MongoDB"
    }

    def __init__(self, target: str):
        self.target = target
        self.subdomains: List[Dict] = []
        self.open_ports: Dict[str, List[Dict]] = {}
        self.technologies: Dict[str, Dict] = {}
        self.findings: List[Dict] = []

    async def run_enumeration(self) -> Dict:
        """Run all reconnaissance tasks"""
        # Subdomain enumeration
        await self.enumerate_subdomains()

        # Port scanning for main domain
        await self.scan_ports(self.target)

        # Technology fingerprinting
        await self.fingerprint_technologies()

        return self.get_results()

    async def enumerate_subdomains(self) -> List[Dict]:
        """Enumerate subdomains using multiple techniques"""
        subdomains = set()
        
        # DNS brute-forcing
        for subdomain in self.COMMON_SUBDOMAINS:
            host = f"{subdomain}.{self.target}"
            try:
                socket.gethostbyname(host)
                subdomains.add((host, "DNS"))
            except socket.gaierror:
                pass

        # Certificate transparency (using crt.sh API)
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://crt.sh/?q={self.target}&output=json"
                async with session.get(url, timeout=10) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        for cert in data:
                            name = cert.get("name", "")
                            if name.endswith(f".{self.target}"):
                                subdomains.add((name, "Certificate"))
        except Exception:
            pass

        # Search engine scraping (optional - can be added)
        
        # Resolve IPs
        for subdomain, source in subdomains:
            try:
                ip = socket.gethostbyname(subdomain)
                self.subdomains.append({
                    "subdomain": subdomain,
                    "ip": ip,
                    "source": source
                })
            except socket.gaierror:
                pass

        # Also scan discovered subdomains
        for sub in self.subdomains:
            if sub["subdomain"] != self.target:
                await self.scan_ports(sub["subdomain"])

        return self.subdomains

    async def scan_ports(self, host: str, ports: List[int] = None) -> List[Dict]:
        """Scan ports on target"""
        if ports is None:
            ports = list(self.COMMON_PORTS.keys())[:50]  # Quick scan - top 50

        open_ports = []
        
        async def check_port(port: int):
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(host, port),
                    timeout=2.0
                )
                writer.close()
                await writer.wait_closed()
                return port
            except Exception:
                return None

        # Run port checks concurrently
        tasks = [check_port(p) for p in ports]
        results = await asyncio.gather(*tasks)
        
        for port in results:
            if port:
                open_ports.append({
                    "port": port,
                    "service": self.COMMON_PORTS.get(port, "Unknown"),
                    "state": "open"
                })

        self.open_ports[host] = open_ports
        return open_ports

    async def fingerprint_technologies(self, url: str = None) -> Dict:
        """Fingerprint web technologies"""
        if url is None:
            url = f"http://{self.target}"

        tech_info = {
            "server": None,
            "frameworks": [],
            "cms": None,
            "js_libraries": [],
            "headers": {},
            "cookies": []
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=10, allow_redirects=True) as resp:
                    # Server header
                    tech_info["server"] = resp.headers.get("Server", None)
                    tech_info["headers"] = dict(resp.headers)
                    tech_info["cookies"] = list(resp.cookies.keys())

                    # Get response content
                    content = await resp.text()
                    soup = BeautifulSoup(content, "html.parser")

                    # Check for common frameworks/CMS
                    tech_info["frameworks"] = self._detect_frameworks(content, resp.headers)
                    tech_info["cms"] = self._detect_cms(content, resp.headers, soup)
                    tech_info["js_libraries"] = self._detect_js_libraries(soup)

        except Exception as e:
            tech_info["error"] = str(e)

        self.technologies[url] = tech_info
        return tech_info

    def _detect_frameworks(self, content: str, headers: dict) -> List[str]:
        """Detect web frameworks from content and headers"""
        frameworks = []
        
        # Check headers
        server = headers.get("Server", "").lower()
        x_powered = headers.get("X-Powered-By", "").lower()
        
        if "nginx" in server:
            frameworks.append("Nginx")
        if "apache" in server:
            frameworks.append("Apache")
        if "iis" in server:
            frameworks.append("IIS")
        if "express" in x_powered:
            frameworks.append("Express.js")
        if "laravel" in x_powered:
            frameworks.append("Laravel")
        if "django" in x_powered:
            frameworks.append("Django")
        if "flask" in x_powered:
            frameworks.append("Flask")
        if "asp.net" in x_powered:
            frameworks.append("ASP.NET")
        if "php" in x_powered:
            frameworks.append("PHP")

        # Check content
        content_lower = content.lower()
        if "react" in content_lower and "react-dom" in content_lower:
            frameworks.append("React")
        if "vue" in content_lower:
            frameworks.append("Vue.js")
        if "angular" in content_lower:
            frameworks.append("Angular")
        if "next.js" in content_lower:
            frameworks.append("Next.js")
        if "nuxt" in content_lower:
            frameworks.append("Nuxt.js")

        return list(set(frameworks))

    def _detect_cms(self, content: str, headers: dict, soup: BeautifulSoup) -> Optional[str]:
        """Detect CMS from content"""
        content_lower = content.lower()
        
        # Check meta tags
        for meta in soup.find_all("meta"):
            meta_content = meta.get("content", "").lower()
            if "wordpress" in meta_content:
                return "WordPress"
            if "drupal" in meta_content:
                return "Drupal"
            if "joomla" in meta_content:
                return "Joomla"

        # Check generator tags
        generator = soup.find("meta", attrs={"name": "generator"})
        if generator:
            gen_content = generator.get("content", "").lower()
            if "wordpress" in gen_content:
                return "WordPress"
            if "drupal" in gen_content:
                return "Drupal"
            if "joomla" in gen_content:
                return "Joomla"
            if "wix" in gen_content:
                return "Wix"
            if "squarespace" in gen_content:
                return "Squarespace"

        # Check common paths
        paths = ["/wp-content/", "/wp-admin/", "/modules/", "/sites/default/"]
        for path in paths:
            if path in content_lower:
                if "wp" in path:
                    return "WordPress"
                if "modules" in path:
                    return "Drupal"
                if "sites/default" in path:
                    return "Drupal"

        return None

    def _detect_js_libraries(self, soup: BeautifulSoup) -> List[str]:
        """Detect JavaScript libraries"""
        libraries = []
        
        # Check script sources
        for script in soup.find_all("script"):
            src = script.get("src", "").lower()
            
            if "jquery" in src:
                libraries.append("jQuery")
            if "bootstrap" in src:
                libraries.append("Bootstrap")
            if "react" in src and "react-dom" not in src:
                libraries.append("React")
            if "vue" in src:
                libraries.append("Vue.js")
            if "angular" in src:
                libraries.append("Angular")
            if "underscore" in src:
                libraries.append("Underscore.js")
            if "lodash" in src:
                libraries.append("Lodash")
            if "axios" in src:
                libraries.append("Axios")
            if "moment" in src:
                libraries.append("Moment.js")

        return list(set(libraries))

    def get_results(self) -> Dict:
        """Get all reconnaissance results"""
        return {
            "target": self.target,
            "subdomains": self.subdomains,
            "ports": self.open_ports,
            "technologies": self.technologies,
            "summary": {
                "total_subdomains": len(self.subdomains),
                "total_open_ports": sum(len(p) for p in self.open_ports.values())
            }
        }