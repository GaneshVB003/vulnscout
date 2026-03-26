# VulnScout Dockerfile - One-click Render deployment
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY api/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend
COPY frontend/package*.json frontend/
RUN cd frontend && npm install

# Copy remaining files
COPY frontend/ frontend/
COPY api/ api/

# Build frontend
RUN cd frontend && npm run build

# Create startup script
RUN echo '#!/bin/bash\n\
echo "Starting VulnScout..."\n\
cd /app/api\n\
if [ -d "../frontend/dist" ]; then\n\
    export FRONTEND_DIST=/app/frontend/dist\n\
fi\n\
exec uvicorn main:app --host 0.0.0.0 --port $PORT
' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]