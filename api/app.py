"""
VulnScout - Vercel Serverless API Handler
"""
from main import app

# Vercel expects 'app' variable for python functions
handler = app  # For Vercel

# For Vercel with FastAPI
def handler(request):
    return app(request)