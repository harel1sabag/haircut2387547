# Haircut Booking Backend

## Setup Instructions

1. Install Python 3.9+
2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Configure Database
   - Install PostgreSQL
   - Create a database named `haircut_db`
   - Update `database.py` with your database credentials

5. Initialize Database
   ```
   python -c "from database import init_db; init_db()"
   ```

## Database Migrations

### Initial Setup
1. Install Alembic:
   ```
   pip install alembic
   ```

2. Create a new migration:
   ```
   alembic revision --autogenerate -m "Initial migration"
   ```

3. Apply migrations:
   ```
   alembic upgrade head
   ```

### Common Migration Commands
- Create a new migration: `alembic revision --autogenerate -m "Description of changes"`
- Apply all pending migrations: `alembic upgrade head`
- Rollback last migration: `alembic downgrade -1`
- View migration history: `alembic history`

## Database Configuration
Update the database connection string in:
- `backend/database.py`
- `backend/alembic/env.py`

Use the format: 
`postgresql://username:password@localhost/haircut_db`

## Key Components
- `database.py`: Database connection and models
- `schemas.py`: Data validation models
- `main.py`: API endpoints (to be implemented)

## Validation Rules
- Name: Minimum 2 characters
- Phone: Must be an Israeli mobile number (05x-xxx-xxxx)
- Date: Within next 7 days
- Time: Between 15:00 and 18:00
