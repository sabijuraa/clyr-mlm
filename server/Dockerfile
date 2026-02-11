FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create uploads directory with proper permissions
RUN mkdir -p uploads/products uploads/documents uploads/avatars uploads/cms uploads/branding uploads/academy && \
    chmod -R 755 uploads

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Use deploy script if exists, otherwise start normally
CMD ["sh", "-c", "if [ -f deploy.sh ]; then ./deploy.sh; else node src/index.js; fi"]
