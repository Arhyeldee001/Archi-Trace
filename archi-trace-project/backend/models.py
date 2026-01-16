from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
