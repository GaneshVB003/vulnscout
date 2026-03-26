"""
VulnScout Pydantic Schemas
Data validation and serialization models
"""
from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class ScanType(str, Enum):
    """Scan type enumeration"""
    QUICK = "quick"
    DEEP = "deep"


class ScanStatus(str, Enum):
    """Scan status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Severity(str, Enum):
    """Finding severity levels"""
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"
    INFO = "Info"


class Finding(BaseModel):
    """Individual finding model"""
    category: str
    severity: str
    type: str
    url: Optional[str] = None
    parameter: Optional[str] = None
    payload: Optional[str] = None
    evidence: str
    remediation: str


class FindingCategory(str, Enum):
    """Finding categories"""
    RECON = "recon"
    VULNERABILITIES = "vulnerabilities"
    API = "api"
    BRUTEFORCE = "bruteforce"
    EXPLOITABILITY = "exploitability"


class ScanRequest(BaseModel):
    """Scan request model"""
    target: str = Field(..., description="Target domain to scan")
    scan_type: ScanType = Field(default=ScanType.QUICK, description="Scan intensity level")
    authorized: bool = Field(default=False, description="User confirms authorization")
    options: Optional[Dict] = Field(default=None, description="Additional scan options")


class ScanResponse(BaseModel):
    """Scan response model"""
    scan_id: str
    status: str
    message: str
    target: Optional[str] = None
    progress: Optional[int] = None


class ScanStatusResponse(BaseModel):
    """Scan status response model"""
    scan_id: str
    status: ScanStatus
    progress: int
    message: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    findings: List[Finding] = []
    logs: List[str] = []


class FindingSummary(BaseModel):
    """Summary of findings by severity"""
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class ScanResults(BaseModel):
    """Complete scan results model"""
    scan_id: str
    target: str
    scan_type: str
    status: str
    start_time: datetime
    end_time: Optional[datetime] = None
    findings: List[Dict] = []
    logs: List[str] = []
    summary: FindingSummary = Field(default_factory=FindingSummary)
    duration: Optional[int] = None


class ExportFormat(str, Enum):
    """Export format options"""
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"


class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.now)