version: '3.8'

services:
  # Backend API
  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    env_file:
      - ./server/.env
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped

  # Frontend (built and served by nginx)
  web:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  uploads:
