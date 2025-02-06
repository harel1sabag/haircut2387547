from sqlalchemy import create_engine, Column, Integer, String, Date, Time, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, date, time

# SQLAlchemy base class for declarative models
Base = declarative_base()

# Database connection configuration
DATABASE_URL = "postgresql://username:password@localhost/haircut_db"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)

# Create a sessionmaker, which will be used to create database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Appointment(Base):
    """
    Database model for storing haircut appointments
    """
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Appointment(name='{self.name}', date='{self.date}', time='{self.time}')>"

def get_db():
    """
    Dependency that creates a new database session for each request
    and closes it after the request is completed
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Create all database tables defined in the models
    """
    Base.metadata.create_all(bind=engine)
