#!/usr/bin/env bash
#
# RiffRoom Backend Startup Script
# Starts the FastAPI backend using uv and performs health checks
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8007}"
RELOAD="${RELOAD:-true}"
HEALTH_CHECK_URL="http://localhost:${PORT}/health/detailed"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_DELAY=2

echo -e "${BLUE}🎸 RiffRoom Backend Startup${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${RED}✗ uv not found${NC}"
    echo "  Install with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi
echo -e "${GREEN}✓${NC} uv found: $(uv --version)"

# Check Python version
PYTHON_VERSION=$(uv run python --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
REQUIRED_VERSION="3.12"
if ! python3 -c "import sys; exit(0 if tuple(map(int, '${PYTHON_VERSION}'.split('.'))) >= tuple(map(int, '${REQUIRED_VERSION}'.split('.'))) else 1)" 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC}  Python ${PYTHON_VERSION} found, ${REQUIRED_VERSION}+ recommended"
else
    echo -e "${GREEN}✓${NC} Python ${PYTHON_VERSION}"
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠${NC}  No .env file found"
    if [ -f ".env.example" ]; then
        echo "  Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Created .env file"
    fi
else
    echo -e "${GREEN}✓${NC} .env file exists"
fi

# Check cache directory
CACHE_DIR="${CACHE_DIR:-$HOME/.riffroom/stems}"
if [ ! -d "$CACHE_DIR" ]; then
    echo "  Creating cache directory: $CACHE_DIR"
    mkdir -p "$CACHE_DIR"
fi
echo -e "${GREEN}✓${NC} Cache directory: $CACHE_DIR"

# Check if port is already in use
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  Port ${PORT} is already in use"
    echo "  Checking if it's a RiffRoom backend..."

    # Try to hit health endpoint
    if curl -s -f "${HEALTH_CHECK_URL}" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} RiffRoom backend already running on port ${PORT}"
        echo ""
        echo "Health check: ${HEALTH_CHECK_URL}"
        exit 0
    else
        echo -e "${RED}✗${NC} Another process is using port ${PORT}"
        echo "  Kill it with: lsof -ti:${PORT} | xargs kill -9"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}Starting backend...${NC}"
echo "  Host: ${HOST}"
echo "  Port: ${PORT}"
echo "  Reload: ${RELOAD}"
echo ""

# Start backend in background
if [ "$RELOAD" = "true" ]; then
    RELOAD_FLAG="--reload"
else
    RELOAD_FLAG=""
fi

# Use uv run to start the backend
uv run uvicorn app.main:app \
    --host "${HOST}" \
    --port "${PORT}" \
    ${RELOAD_FLAG} \
    --log-level info &

BACKEND_PID=$!

echo -e "${GREEN}✓${NC} Backend started (PID: ${BACKEND_PID})"

# Wait for backend to be ready
echo ""
echo "Waiting for backend to be ready..."

for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    sleep $HEALTH_CHECK_DELAY

    if curl -s -f "${HEALTH_CHECK_URL}" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend is healthy!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo -e "${GREEN}🎸 RiffRoom Backend Ready${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "  API Docs:     http://localhost:${PORT}/docs"
        echo "  Health Check: ${HEALTH_CHECK_URL}"
        echo "  Logs:         Follow uvicorn output above"
        echo ""
        echo "  Press Ctrl+C to stop"
        echo ""

        # Display detailed health check
        echo "Detailed Health Status:"
        curl -s "${HEALTH_CHECK_URL}" | python3 -m json.tool 2>/dev/null || echo "  (Could not format JSON)"
        echo ""

        # Wait for Ctrl+C
        wait $BACKEND_PID
        exit 0
    fi

    echo -n "."
done

echo ""
echo -e "${RED}✗${NC} Backend failed to start or health check timed out"
echo ""
echo "Try checking the logs above for errors."
echo "Or run manually: uv run uvicorn app.main:app --host ${HOST} --port ${PORT} --reload"

# Kill the backend process if it's still running
if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "Killing backend process ${BACKEND_PID}..."
    kill $BACKEND_PID 2>/dev/null || true
fi

exit 1
