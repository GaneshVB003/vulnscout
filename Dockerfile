# VulnScout Dockerfile for Render
FROM python:3.11-slim

# Install Node.js 20.x and required build tools
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy API requirements and install
COPY api/requirements.txt /app/api/requirements.txt
RUN pip install --no-cache-dir -r /app/api/requirements.txt

# Create frontend directory and copy frontend files
RUN mkdir -p /app/frontend
COPY frontend/package.json /app/frontend/package.json
COPY frontend/package-lock.json /app/frontend/package-lock.json
COPY frontend/vite.config.ts /app/frontend/vite.config.ts
COPY frontend/tsconfig.json /app/frontend/tsconfig.json
COPY frontend/tsconfig.node.json /app/frontend/tsconfig.node.json
COPY frontend/index.html /app/frontend/index.html
COPY frontend/src /app/frontend/src
COPY frontend/public /app/frontend/public

WORKDIR /app/frontend
RUN npm install && npm run build

# Copy API code
WORKDIR /app
COPY api /app/api

# Expose port (Render provides PORT env var)
EXPOSE 8000

# Run the application
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]