import logging
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date, time, timedelta

# Import local modules
from database import get_db, Appointment, init_db
from schemas import AppointmentCreate, AppointmentResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Haircut Booking API",
    description="API for managing haircut appointments",
    version="0.1.0"
)

# Add CORS middleware to allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """
    Initialize the database when the application starts
    """
    init_db()
    logger.info("Database initialized successfully")

@app.post("/appointments/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appointment: AppointmentCreate, 
    db: Session = Depends(get_db)
):
    """
    Create a new appointment with validation
    
    Checks:
    - Date is within next 7 days
    - Time is between 15:00 and 18:00
    - No conflicting appointments
    """
    # Validate date
    today = date.today()
    max_booking_date = today + timedelta(days=7)
    
    if appointment.date < today or appointment.date > max_booking_date:
        raise HTTPException(
            status_code=400, 
            detail="Appointments can only be booked for the next 7 days"
        )
    
    # Validate time (between 15:00 and 18:00)
    if not (time(15, 0) <= appointment.time <= time(18, 0)):
        raise HTTPException(
            status_code=400, 
            detail="Appointments are only available between 15:00 and 18:00"
        )
    
    # Check for conflicting appointments
    existing_appointment = db.query(Appointment).filter(
        Appointment.date == appointment.date,
        Appointment.time == appointment.time
    ).first()
    
    if existing_appointment:
        raise HTTPException(
            status_code=400, 
            detail="This time slot is already booked"
        )
    
    # Create new appointment
    db_appointment = Appointment(
        name=appointment.name,
        phone=appointment.phone,
        date=appointment.date,
        time=appointment.time
    )
    
    try:
        db.add(db_appointment)
        db.commit()
        db.refresh(db_appointment)
        
        logger.info(f"New appointment created for {db_appointment.name}")
        return db_appointment
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating appointment: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Could not create appointment"
        )

@app.get("/available-slots/", response_model=list[dict])
def get_available_slots(
    target_date: date, 
    db: Session = Depends(get_db)
):
    """
    Retrieve available time slots for a specific date
    
    Returns a list of available 30-minute slots between 15:00 and 18:00
    """
    # Validate date
    today = date.today()
    max_booking_date = today + timedelta(days=7)
    
    if target_date < today or target_date > max_booking_date:
        raise HTTPException(
            status_code=400, 
            detail="Can only check slots for the next 7 days"
        )
    
    # Predefined time slots
    all_slots = [
        time(15, 0), time(15, 30),
        time(16, 0), time(16, 30),
        time(17, 0), time(17, 30)
    ]
    
    # Find booked slots
    booked_slots = db.query(Appointment.time).filter(
        Appointment.date == target_date
    ).all()
    
    # Convert booked slots to a set for efficient lookup
    booked_slots = {slot[0] for slot in booked_slots}
    
    # Return available slots
    available_slots = [
        {"time": slot.strftime("%H:%M")} 
        for slot in all_slots 
        if slot not in booked_slots
    ]
    
    return available_slots

# Health check endpoint
@app.get("/health")
def health_check():
    """
    Simple health check endpoint
    """
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
