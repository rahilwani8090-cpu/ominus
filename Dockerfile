FROM node:18-slim

WORKDIR /app

# Install system dependencies for Puppeteer and browser automation
RUN apt-get update && apt-get install -y \
  chromium-browser \
  chromium \
  fonts-liberation \
  libappindicator3-1 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libgbm1 \
  libu2f-udev \
  wget \
  ca-certificates \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
  npm cache clean --force

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 omnius && \
  chown -R omnius:omnius /app
USER omnius

# Expose ports
EXPOSE 3000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start application
CMD ["node", "server/AdvancedServer.js"]
