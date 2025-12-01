# Use a small Node base
FROM node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install minimal system deps and clean apt cache (optional)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies (use package-lock.json if present)
RUN if [ -f package-lock.json ]; then npm ci --production; else npm install --production; fi

# Copy application source
COPY . .

# Create a non-root user for better security and give ownership
RUN addgroup --system appgroup \
 && adduser --system --ingroup appgroup appuser \
 && chown -R appuser:appgroup /usr/src/app

USER appuser

# Expose port (change if your app uses another port)
EXPOSE 3001

# Use JSON form of CMD to avoid shell signal issues
CMD ["npm", "start"]
