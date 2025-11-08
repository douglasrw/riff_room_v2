#!/bin/bash
set -e

echo "🎸 Setting up RiffRoom development environment..."

# Check Node version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ required. Current version: $(node -v)"
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

# Check Python
if ! command -v python3.14 &> /dev/null; then
    echo "❌ Python 3.14 not found. Please install Python 3.14 first."
    exit 1
fi

# Check uv
if ! command -v uv &> /dev/null; then
    echo "📦 Installing uv..."
    pip install uv
fi

# Install Node dependencies
echo "📦 Installing Node dependencies..."
pnpm install

# Setup Python environment
echo "🐍 Setting up Python environment..."
cd packages/backend
uv sync
cd ../..

# Create .env file
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "✏️  Please edit .env with your configuration"
fi

# Create cache directory
mkdir -p ~/.riffroom/stems

echo "✅ Development environment ready!"
echo ""
echo "Next steps:"
echo "  1. Edit .env file if needed"
echo "  2. Run 'pnpm dev' to start all services"
echo ""
echo "Services will be available at:"
echo "  - Web frontend: http://localhost:5173"
echo "  - Backend API: http://localhost:8007"
