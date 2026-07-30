import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Define the path to your SQLite database file
# This ensures it always looks for the 'db' folder relative to this file's location
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_DIR = os.path.join(BASE_DIR, "db")

# Create the db directory automatically if it doesn't exist yet
os.makedirs(DB_DIR, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'exam_engine.db')}"

# 2. Create the SQLAlchemy Engine
# Note: "check_same_thread": False is required for SQLite + FastAPI to prevent thread-sharing errors
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Create a SessionLocal class
# Each instance of this class will be a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Create a Base class
# All of our database models (Users, Questions, etc.) will inherit from this
Base = declarative_base()

# 5. Dependency function
# We will use this in our FastAPI routes to get a database connection and close it safely
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()