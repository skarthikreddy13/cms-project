"""
Database Configuration
======================
Sets up PostgreSQL connection using SQLAlchemy

Usage:
    from app.db.database import get_db
    
    @app.get("/example")
    def example(db: Session = Depends(get_db)):
        # use db here
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Get database URL from environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://cms_user:cms_password@db:5432/cms_db"  # Default for Docker
)

# Create database engine
engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models
Base = declarative_base()


def get_db():
    """
    Get database session
    
    Use this as a FastAPI dependency:
        def my_endpoint(db: Session = Depends(get_db)):
            # use db here
    
    The session is automatically closed after the request
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
