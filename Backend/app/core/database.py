
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Backend/app
APP_DIR = Path(__file__).resolve().parents[1]

# Local development: Backend/app/db
# AWS deployment: EBS-mounted directory via DATABASE_DIR
DB_DIR = Path(
    os.getenv("DATABASE_DIR", str(APP_DIR / "db"))
).resolve()

DB_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DB_DIR / "exam_engine.db"

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create SQLAlchemy Engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for models
Base = declarative_base()


# FastAPI database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
