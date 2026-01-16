#!/bin/bash

echo "🚀 CMS Project - Quick Start"
echo "=============================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if ports are available
echo "Checking if ports are available..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 3000 is in use. Please stop the service using this port."
    exit 1
fi

if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8000 is in use. Please stop the service using this port."
    exit 1
fi

if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 5432 is in use. Please stop PostgreSQL or change the port."
    exit 1
fi

echo "✅ Ports are available"
echo ""

# Start Docker Compose
echo "📦 Building and starting containers..."
echo "This may take a few minutes on first run..."
echo ""

docker compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Services are running!"
    echo ""
    echo "🌐 Access the application:"
    echo "   Frontend:  http://localhost:3000"
    echo "   API Docs:  http://localhost:8000/docs"
    echo "   Health:    http://localhost:8000/health"
    echo ""
    echo "🔐 Demo Credentials:"
    echo "   Admin:  admin@example.com / admin123"
    echo "   Editor: editor@example.com / editor123"
    echo "   Viewer: viewer@example.com / viewer123"
    echo ""
    echo "📝 View logs: docker compose logs -f"
    echo "🛑 Stop services: docker compose down"
    echo ""
    echo "⏰ The worker will auto-publish the scheduled lesson in ~2 minutes!"
    echo ""
else
    echo "❌ Something went wrong. Check logs with: docker compose logs"
    exit 1
fi
