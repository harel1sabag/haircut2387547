# Backend Deployment Guide

## Prerequisites
- Python 3.9+
- PostgreSQL database

## Deployment Steps
1. Install Dependencies
   ```
   pip install -r requirements.txt
   ```

2. Environment Configuration
   - Create a `.env` file with:
     ```
     DATABASE_URL=your_postgresql_connection_string
     SECRET_KEY=your_secret_key
     ```

3. Database Setup
   ```
   # Run migrations
   alembic upgrade head
   ```

4. Run Application
   ```
   # Development
   uvicorn main:app --reload

   # Production
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
   ```

## Troubleshooting
- Ensure all environment variables are set
- Check database connection
- Verify Python and package versions
