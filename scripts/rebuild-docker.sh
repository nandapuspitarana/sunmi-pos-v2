#!/bin/bash

# Script to rebuild and restart Docker containers with latest .env configuration

echo "🔄 Stopping existing containers..."
docker-compose down

echo "🔄 Rebuilding backend container..."
docker-compose build backend

echo "🔄 Starting containers with updated configuration..."
docker-compose up -d

echo "✅ Containers restarted successfully!"
echo "📝 Admin credentials from .env are now being used."

# Show admin credentials from .env
ADMIN_EMAIL=$(grep ADMIN_EMAIL .env | cut -d '=' -f2)
ADMIN_NAME=$(grep ADMIN_NAME .env | cut -d '=' -f2)
echo "ℹ️  Admin user configured: $ADMIN_EMAIL ($ADMIN_NAME)"

# Show running containers
echo "🐳 Running containers:"
docker-compose ps