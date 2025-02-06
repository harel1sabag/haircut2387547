from pydantic import BaseModel, validator
from datetime import date, time, datetime
import re

class AppointmentCreate(BaseModel):
    """
    Pydantic model for creating a new appointment
    Provides validation for input data
    """
    name: str
    phone: str
    date: date
    time: time

    @validator('name')
    def validate_name(cls, v):
        """
        Validate that name is not empty and contains only Hebrew/English letters
        """
        if not v or len(v.strip()) < 2:
            raise ValueError('Name must be at least 2 characters long')
        return v.strip()

    @validator('phone')
    def validate_israeli_phone(cls, v):
        """
        Validate Israeli mobile phone number format
        Must start with 05 and have 10 digits
        """
        # Remove any non-digit characters
        phone = re.sub(r'\D', '', v)
        
        # Check if the number starts with 05 and has 10 digits
        if not re.match(r'^05\d{8}$', phone):
            raise ValueError('Invalid Israeli phone number. Must start with 05 and have 10 digits')
        
        return phone

class AppointmentResponse(AppointmentCreate):
    """
    Pydantic model for returning appointment details
    Includes additional metadata like ID and creation time
    """
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Allows conversion from SQLAlchemy model
