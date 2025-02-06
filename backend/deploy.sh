#!/bin/bash
# Deployment script for Render

# Update pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run database migrations (if applicable)
# alembic upgrade head

# Start the application
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
