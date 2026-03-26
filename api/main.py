"""
VulnScout Backend - Main API Entry Point
Security Assessment Tool - For Authorized Testing Only
"""
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl

from scanner.engine import ScanEngine
from scanner.recon import Reconnaissance
from scanner.vulns import VulnerabilityScanner
from scanner.api_testing import APISecurityTester
from scanner.bruteforce import BruteForceTester
from models.schemas import ScanRequest, ScanResponse, ScanStatus, Finding
from models.database import init_db, get_session
from datetime import datetime
import json
import asyncio


# Global scan engine instance
scan_engine = ScanEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize on startup"""
    # Initialize database
    await init_db()
    yield
    # Cleanup on shutdown
    pass


app = FastAPI(
    title="VulnScout API",
    description="Security Assessment API - For Authorized Testing Only",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - must be before static mount
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend static files - serve at root but after API routes
# API routes are added later, so they'll take precedence
# We'll mount at /static for assets and handle root separately
# Actually let's just add a catch-all at the end that serves index.html for non-API routes

# Mount frontend static files if FRONTEND_DIST is set (but only for /assets)
frontend_dist = os.getenv("FRONTEND_DIST")
if frontend_dist and Path(frontend_dist).exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist + "/assets", html=False), name="assets")


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


# Request models
class ScanRequestModel(BaseModel):
    target: str
    scan_type: str = "quick"  # quick or deep
    authorized: bool = False
    options: Optional[dict] = {}


class ScanStatusModel(BaseModel):
    scan_id: str
    status: str
    progress: int
    message: str
    results: Optional[dict] = None


# Store scan results in memory (use database in production)
scan_results: dict[str, dict] = {}


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "VulnScout API",
        "version": "1.0.0",
        "description": "Security Assessment API - For Authorized Testing Only",
        "disclaimer": "This tool is for authorized security testing only. Unauthorized scanning is illegal."
    }


@app.post("/api/scan", response_model=ScanResponse)
async def start_scan(request: ScanRequestModel):
    """
    Start a new security scan
    """
    # Authorization check
    if not request.authorized:
        raise HTTPException(
            status_code=403,
            detail="You must confirm you have authorization to test this target."
        )

    # Validate target domain
    target = request.target.strip()
    if not target:
        raise HTTPException(status_code=400, detail="Target domain is required")

    # Create scan ID
    scan_id = f"scan_{datetime.now().strftime('%Y%m%d%H%M%S')}_{hash(target) % 10000}"

    # Initialize scan
    scan_results[scan_id] = {
        "target": target,
        "scan_type": request.scan_type,
        "status": "starting",
        "progress": 0,
        "findings": [],
        "logs": [],
        "start_time": datetime.now().isoformat()
    }

    # Start scan in background
    task = asyncio.create_task(run_scan(scan_id, target, request.scan_type, request.options))
    logger.info(f"Started scan task for {scan_id}")

    return ScanResponse(
        scan_id=scan_id,
        status="started",
        message="Scan started successfully"
    )


async def run_scan(scan_id: str, target: str, scan_type: str, options: dict):
    """Run the actual security scan"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Starting scan {scan_id} for {target}")
    
    try:
        # Update status
        scan_results[scan_id]["status"] = "running"
        scan_results[scan_id]["logs"].append(f"[{datetime.now().isoformat()}] Initializing scan for {target}")
        logger.info(f"Scan {scan_id}: Initialized")

        # Reconnaissance phase
        await manager.send_message(scan_id, {
            "type": "log",
            "message": "Starting reconnaissance phase...",
            "progress": 5
        })

        recon = Reconnaissance(target)
        await recon.run_enumeration()
        scan_results[scan_id]["findings"].append({
            "category": "recon",
            "findings": recon.get_results()
        })
        scan_results[scan_id]["progress"] = 25
        scan_results[scan_id]["logs"].append(f"[{datetime.now().isoformat()}] Reconnaissance completed - Found {len(recon.subdomains)} subdomains")
        logger.info(f"Scan {scan_id}: Recon done, {len(recon.subdomains)} subdomains")

        # Vulnerability scanning phase
        await manager.send_message(scan_id, {
            "type": "log",
            "message": "Starting vulnerability scanning...",
            "progress": 30
        })
        logger.info(f"Scan {scan_id}: Starting vuln scan")

        vuln_scanner = VulnerabilityScanner(target, recon.get_results())
        logger.info(f"Scan {scan_id}: VulnScanner created, running scan()")
        vuln_results = await vuln_scanner.scan()
        logger.info(f"Scan {scan_id}: Vuln scan completed, found {len(vuln_results)} results")
        
        scan_results[scan_id]["findings"].append({
            "category": "vulnerabilities",
            "findings": vuln_results
        })
        scan_results[scan_id]["progress"] = 60
        scan_results[scan_id]["logs"].append(f"[{datetime.now().isoformat()}] Vulnerability scanning completed")

        # API security testing
        await manager.send_message(scan_id, {
            "type": "log",
            "message": "Starting API security testing...",
            "progress": 70
        })

        api_tester = APISecurityTester(target, recon.get_results())
        api_results = await api_tester.scan()
        scan_results[scan_id]["findings"].append({
            "category": "api",
            "findings": api_results
        })
        scan_results[scan_id]["progress"] = 80
        scan_results[scan_id]["logs"].append(f"[{datetime.now().isoformat()}] API security testing completed")

        # Brute force testing
        if scan_type == "deep":
            await manager.send_message(scan_id, {
                "type": "log",
                "message": "Starting brute force testing...",
                "progress": 85
            })

            bf_tester = BruteForceTester(target, recon.get_results())
            bf_results = await bf_tester.scan()
            scan_results[scan_id]["findings"].append({
                "category": "bruteforce",
                "findings": bf_results
            })
            scan_results[scan_id]["logs"].append(f"[{datetime.now().isoformat()}] Brute force testing completed")

        # Complete
        scan_results[scan_id]["status"] = "completed"
        scan_results[scan_id]["progress"] = 100
        scan_results[scan_id]["end_time"] = datetime.now().isoformat()
        scan_results[scan_id]["logs"].append(f"[{datetime.now().isoformat()}] Scan completed successfully")

        await manager.send_message(scan_id, {
            "type": "complete",
            "message": "Scan completed",
            "progress": 100,
            "results": scan_results[scan_id]
        })

    except Exception as e:
        scan_results[scan_id]["status"] = "failed"
        scan_results[scan_id]["error"] = str(e)
        await manager.send_message(scan_id, {
            "type": "error",
            "message": f"Scan failed: {str(e)}",
            "progress": 0
        })


@app.get("/api/scan/{scan_id}")
async def get_scan_status(scan_id: str):
    """Get scan status and results"""
    if scan_id not in scan_results:
        raise HTTPException(status_code=404, detail="Scan not found")

    return scan_results[scan_id]


@app.get("/api/scans")
async def list_scans():
    """List all scans"""
    return [
        {
            "scan_id": k,
            "target": v["target"],
            "status": v["status"],
            "progress": v["progress"],
            "start_time": v.get("start_time")
        }
        for k, v in scan_results.items()
    ]


@app.delete("/api/scan/{scan_id}")
async def delete_scan(scan_id: str):
    """Delete a scan"""
    if scan_id not in scan_results:
        raise HTTPException(status_code=404, detail="Scan not found")

    del scan_results[scan_id]
    return {"message": "Scan deleted"}


@app.get("/api/export/{scan_id}/{format}")
async def export_scan(scan_id: str, format: str):
    """Export scan results"""
    if scan_id not in scan_results:
        raise HTTPException(status_code=404, detail="Scan not found")

    if format not in ["json", "csv"]:
        raise HTTPException(status_code=400, detail="Invalid format")

    results = scan_results[scan_id]

    if format == "json":
        return JSONResponse(content=results)

    # CSV export
    findings = []
    for category in results.get("findings", []):
        for finding in category.get("findings", []):
            findings.append({
                "category": category["category"],
                **finding
            })

    if not findings:
        return JSONResponse(content={"message": "No findings to export"})

    # Create CSV
    import csv
    import io

    output = io.StringIO()
    if findings:
        writer = csv.DictWriter(output, fieldnames=findings[0].keys())
        writer.writeheader()
        writer.writerows(findings)

    return JSONResponse(content={"csv": output.getvalue()})


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket for real-time scan updates"""
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client messages if needed
    except WebSocketDisconnect:
        manager.disconnect(client_id)


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# Catch-all route to serve frontend - must be last!
# This serves index.html for any route not matched by API routes
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """Serve frontend for non-API routes"""
    frontend_dist = os.getenv("FRONTEND_DIST") or str(Path(__file__).parent.parent / "frontend" / "dist")
    index_path = Path(frontend_dist) / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"error": "Frontend not found"}