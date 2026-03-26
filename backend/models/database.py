"""
VulnScout Database Models and Setup
Database connection and ORM models
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Boolean
from datetime import datetime
import os

# Database URL from environment or default
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://vulnscout:vulnscout@localhost:5432/vulnscout"
)

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=False)

# Session factory
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Base class for models
Base = declarative_base()


class Scan(Base):
    """Scan database model"""
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(String(50), unique=True, index=True)
    target = Column(String(255), nullable=False)
    scan_type = Column(String(20), default="quick")
    status = Column(String(20), default="pending")
    progress = Column(Integer, default=0)
    authorized = Column(Boolean, default=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    findings = Column(JSON, default=[])
    logs = Column(JSON, default=[])
    options = Column(JSON, nullable=True)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "scan_id": self.scan_id,
            "target": self.target,
            "scan_type": self.scan_type,
            "status": self.status,
            "progress": self.progress,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "findings": self.findings,
            "logs": self.logs
        }


class User(Base):
    """User database model (for future authentication)"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    """Get database session"""
    async with async_session() as session:
        yield session


async def save_scan(scan_data: dict):
    """Save scan to database"""
    async with async_session() as session:
        scan = Scan(**scan_data)
        session.add(scan)
        await session.commit()


async def get_scan_by_id(scan_id: str) -> dict:
    """Get scan by ID"""
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(Scan).where(Scan.scan_id == scan_id))
        scan = result.scalar_one_or_none()
        if scan:
            return scan.to_dict()
        return None


async def update_scan(scan_id: str, updates: dict):
    """Update scan in database"""
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(Scan).where(Scan.scan_id == scan_id))
        scan = result.scalar_one_or_none()
        if scan:
            for key, value in updates.items():
                setattr(scan, key, value)
            await session.commit()
            return scan.to_dict()
        return None


async def delete_scan(scan_id: str):
    """Delete scan from database"""
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(Scan).where(Scan.scan_id == scan_id))
        scan = result.scalar_one_or_none()
        if scan:
            await session.delete(scan)
            await session.commit()
            return True
        return False


async def list_scans(limit: int = 50) -> list:
    """List all scans"""
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(
            select(Scan).order_by(Scan.start_time.desc()).limit(limit)
        )
        scans = result.scalars().all()
        return [scan.to_dict() for scan in scans]