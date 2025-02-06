# Deployment Guide

## Frontend Hosting (Netlify)
1. Create a Netlify account
2. Connect your GitHub repository
3. Set build settings:
   - Build command: `echo 'Static site'`
   - Publish directory: `.`

## Backend Hosting (Render)
1. Create a Render account
2. Create a new Web Service
3. Connect GitHub repository
4. Configure:
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - Environment: Python 3.9

## Database (Render PostgreSQL)
1. Create a Render PostgreSQL database
2. Update connection string in `.env`

## Domain Configuration (Optional)
1. Purchase domain (e.g., `yourhaircut.co.il`)
2. Configure DNS with Cloudflare
3. Add SSL certificate

## Recommended Tools
- GitHub for version control
- Netlify for frontend hosting
- Render for backend and database
- Cloudflare for DNS and security

## Estimated Costs
- Frontend: Free
- Backend: Free tier ($0/month)
- Database: Free tier ($0/month)
- Domain: ~$10-15/year
