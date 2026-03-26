"""
Unit tests for VulnScout Scanner Engine
"""
import pytest
from scanner.engine import ScanEngine


class TestScanEngine:
    """Test cases for ScanEngine class"""

    def setup_method(self):
        """Create a fresh ScanEngine instance for each test"""
        self.engine = ScanEngine()

    def test_create_scan(self):
        """Test creating a new scan"""
        scan_id = self.engine.create_scan("example.com", {"scan_type": "quick"})
        
        assert scan_id is not None
        assert scan_id.startswith("scan_")
        
        status = self.engine.get_scan_status(scan_id)
        assert status is not None
        assert status["target"] == "example.com"
        assert status["options"] == {"scan_type": "quick"}
        assert status["status"] == "created"
        assert status["progress"] == 0
        assert status["findings"] == []
        assert status["logs"] == []

    def test_create_multiple_scans(self):
        """Test creating multiple scans increments ID correctly"""
        scan_id_1 = self.engine.create_scan("example.com", {})
        scan_id_2 = self.engine.create_scan("test.com", {})
        
        # IDs should be different
        assert scan_id_1 != scan_id_2
        
        # Both scans should exist
        assert self.engine.get_scan_status(scan_id_1) is not None
        assert self.engine.get_scan_status(scan_id_2) is not None

    def test_update_scan_progress(self):
        """Test updating scan progress"""
        scan_id = self.engine.create_scan("example.com", {})
        
        self.engine.update_scan_progress(scan_id, 50, "Scanning in progress...")
        
        status = self.engine.get_scan_status(scan_id)
        assert status["progress"] == 50
        assert "Scanning in progress..." in status["logs"]

    def test_update_scan_progress_invalid_id(self):
        """Test updating progress for non-existent scan does not raise"""
        # Should not raise any exception
        self.engine.update_scan_progress("invalid_id", 50, "test")
        
        # No status should exist
        assert self.engine.get_scan_status("invalid_id") is None

    def test_add_finding(self):
        """Test adding a finding to a scan"""
        scan_id = self.engine.create_scan("example.com", {})
        
        finding = {
            "severity": "High",
            "title": "SQL Injection",
            "category": "Web Vulns"
        }
        
        self.engine.add_finding(scan_id, finding)
        
        status = self.engine.get_scan_status(scan_id)
        assert len(status["findings"]) == 1
        assert status["findings"][0] == finding

    def test_add_finding_invalid_id(self):
        """Test adding finding to non-existent scan does not raise"""
        finding = {"severity": "High", "title": "Test"}
        
        # Should not raise
        self.engine.add_finding("invalid_id", finding)

    def test_complete_scan(self):
        """Test marking scan as completed"""
        scan_id = self.engine.create_scan("example.com", {})
        
        self.engine.complete_scan(scan_id)
        
        status = self.engine.get_scan_status(scan_id)
        assert status["status"] == "completed"

    def test_complete_scan_invalid_id(self):
        """Test completing non-existent scan does not raise"""
        self.engine.complete_scan("invalid_id")

    def test_cancel_scan(self):
        """Test cancelling a scan"""
        scan_id = self.engine.create_scan("example.com", {})
        
        self.engine.cancel_scan(scan_id)
        
        status = self.engine.get_scan_status(scan_id)
        assert status["status"] == "cancelled"

    def test_cancel_scan_invalid_id(self):
        """Test cancelling non-existent scan does not raise"""
        self.engine.cancel_scan("invalid_id")

    def test_get_scan_status_not_found(self):
        """Test getting status for non-existent scan returns None"""
        status = self.engine.get_scan_status("non_existent")
        assert status is None


class TestScanEngineAsync:
    """Test cases for async methods in ScanEngine"""

    def setup_method(self):
        """Create a fresh ScanEngine instance for each test"""
        self.engine = ScanEngine()

    @pytest.mark.asyncio
    async def test_run_concurrent_scans(self):
        """Test running multiple scans concurrently"""
        targets = ["example1.com", "example2.com", "example3.com"]
        
        results = await self.engine.run_concurrent_scans(targets)
        
        assert len(results) == 3
        for result in results:
            assert result["status"] == "completed"
            assert result["target"] in targets


class TestGetEngine:
    """Test cases for get_engine function"""

    def test_get_engine_returns_singleton(self):
        """Test that get_engine returns the same instance"""
        from scanner.engine import get_engine
        
        engine1 = get_engine()
        engine2 = get_engine()
        
        # Should be the same instance
        assert engine1 is engine2
        
        # Should be a ScanEngine
        assert isinstance(engine1, ScanEngine)