import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Add Python system path to help find dotenv
sys.path.append('/Library/Frameworks/Python.framework/Versions/3.12/lib/python3.12/site-packages')

try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded environment variables")
except ImportError as e:
    print(f"⚠️ Could not load dotenv: {e}")
    # Create empty load_dotenv function as fallback
    def load_dotenv():
        pass

# Get database URL from environment variable (Render provides this)
DATABASE_URL = os.getenv("DATABASE_URL")

# If DATABASE_URL is not set, use local XAMPP credentials
if not DATABASE_URL:
    DB_USER = "architrace_user"
    DB_PASSWORD = "Architrace123"
    DB_HOST = "127.0.0.1"
    DB_PORT = "3306"
    DB_NAME = "architrace_db"
    DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
