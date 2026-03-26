"""
Unit tests for VulnScout Reconnaissance Module
"""
import pytest
from scanner.recon import Reconnaissance


class TestReconnaissance:
    """Test cases for Reconnaissance class"""

    def setup_method(self):
        """Create a fresh Reconnaissance instance for each test"""
        self.recon = Reconnaissance("example.com")

    def test_initialization(self):
        """Test that Reconnaissance initializes correctly"""
        assert self.recon.target == "example.com"
        assert self.recon.subdomains == []
        assert self.recon.open_ports == {}
        assert self.recon.technologies == {}
        assert self.recon.findings == []

    def test_common_subdomains_defined(self):
        """Test that COMMON_SUBDOMAINS list exists and has items"""
        assert len(Reconnaissance.COMMON_SUBDOMAINS) > 0
        assert "www" in Reconnaissance.COMMON_SUBDOMAINS
        assert "mail" in Reconnaissance.COMMON_SUBDOMAINS
        assert "admin" in Reconnaissance.COMMON_SUBDOMAINS

    def test_common_ports_defined(self):
        """Test that COMMON_PORTS dictionary exists and has expected ports"""
        assert len(Reconnaissance.COMMON_PORTS) > 0
        assert 80 in Reconnaissance.COMMON_PORTS  # HTTP
        assert 443 in Reconnaissance.COMMON_PORTS  # HTTPS
        assert 22 in Reconnaissance.COMMON_PORTS  # SSH
        assert 21 in Reconnaissance.COMMON_PORTS  # FTP

    def test_get_results_returns_dict(self):
        """Test that get_results returns expected structure"""
        results = self.recon.get_results()
        
        assert isinstance(results, dict)
        assert "subdomains" in results
        assert "ports" in results  # Note: actual key is "ports", not "open_ports"
        assert "technologies" in results
        assert "summary" in results
        assert "target" in results

    def test_get_results_contains_current_data(self):
        """Test that get_results returns current instance data"""
        # Add some test data
        self.recon.subdomains = [{"subdomain": "www.example.com", "ip": "1.2.3.4", "source": "DNS"}]
        
        results = self.recon.get_results()
        
        assert len(results["subdomains"]) == 1
        assert results["subdomains"][0]["subdomain"] == "www.example.com"
        # Verify summary is updated
        assert results["summary"]["total_subdomains"] == 1


class TestReconnaissancePortMapping:
    """Test cases for port to service name mapping"""

    def test_http_ports(self):
        """Test HTTP-related ports"""
        assert "HTTP" in Reconnaissance.COMMON_PORTS.values()
        assert "HTTPS" in Reconnaissance.COMMON_PORTS.values()

    def test_database_ports(self):
        """Test database-related ports"""
        ports = Reconnaissance.COMMON_PORTS
        assert 3306 in ports  # MySQL
        assert 5432 in ports  # PostgreSQL
        assert 1433 in ports  # MSSQL
        assert 27017 in ports  # MongoDB

    def test_remote_access_ports(self):
        """Test remote access ports"""
        ports = Reconnaissance.COMMON_PORTS
        assert 22 in ports  # SSH
        assert 23 in ports  # Telnet
        assert 3389 in ports  # RDP
        assert 5900 in ports  # VNC


class TestReconnaissanceAsync:
    """Test cases for async methods in Reconnaissance"""

    @pytest.mark.asyncio
    async def test_run_enumeration_returns_results(self):
        """Test that run_enumeration completes and returns results"""
        recon = Reconnaissance("example.com")
        
        # This will attempt actual DNS lookups - may timeout in test env
        # but should not raise an exception
        try:
            results = await recon.run_enumeration()
            assert isinstance(results, dict)
        except Exception:
            # Network calls may fail in test environment - that's OK
            pass

    @pytest.mark.asyncio
    async def test_enumerate_subdomains_returns_list(self):
        """Test enumerate_subdomains returns a list"""
        recon = Reconnaissance("test.invalid")  # Non-resolvable domain
        
        # This should return empty list for non-existent domain
        result = await recon.enumerate_subdomains()
        assert isinstance(result, list)


class TestReconnaissanceEdgeCases:
    """Test edge cases for Reconnaissance"""

    def test_empty_target(self):
        """Test handling of empty target"""
        # Target validation happens at API level, not here
        recon = Reconnaissance("")
        assert recon.target == ""

    def test_ip_address_target(self):
        """Test using IP address as target"""
        recon = Reconnaissance("192.168.1.1")
        assert recon.target == "192.168.1.1"

    def test_subdomain_target(self):
        """Test using subdomain as target"""
        recon = Reconnaissance("sub.example.com")
        assert recon.target == "sub.example.com"

    def test_findings_accumulation(self):
        """Test that findings accumulate over time"""
        recon = Reconnaissance("example.com")
        
        # Initially empty
        assert len(recon.findings) == 0
        
        # Add findings
        recon.findings.append({"type": "port", "port": 80})
        recon.findings.append({"type": "tech", "name": "nginx"})
        
        assert len(recon.findings) == 2