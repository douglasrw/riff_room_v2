#!/usr/bin/env bash
#
# RiffRoom Backend Startup Script
#
# Starts the FastAPI backend server using uv for dependency management.
# Handles environment setup, validation, and graceful shutdown.
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/packages/backend"
ENV_FILE="$BACKEND_DIR/.env"
DEFAULT_HOST="${HOST:-0.0.0.0}"
DEFAULT_PORT="${PORT:-8007}"
DEFAULT_WORKERS="${WORKERS:-1}"
DEFAULT_LOG_LEVEL="${LOG_LEVEL:-info}"

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    # Check for uv
    if ! command -v uv &> /dev/null; then
        log_error "uv not found. Install from: https://github.com/astral-sh/uv"
        exit 1
    fi
    log_success "uv found: $(uv --version)"

    # Check backend directory exists
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi

    # Check if dependencies are installed
    if [ ! -f "$BACKEND_DIR/uv.lock" ]; then
        log_warn "uv.lock not found. Running 'uv sync' to install dependencies..."
        cd "$BACKEND_DIR"
        uv sync
        log_success "Dependencies installed"
    fi
}

check_environment() {
    log_info "Checking environment configuration..."

    # Check for .env file
    if [ ! -f "$ENV_FILE" ]; then
        log_warn ".env file not found at: $ENV_FILE"
        if [ -f "$ENV_FILE.example" ]; then
            log_info "Creating .env from .env.example..."
            cp "$ENV_FILE.example" "$ENV_FILE"
            log_success "Created .env file"
        else
            log_warn "No .env.example found. Using defaults."
        fi
    else
        log_success ".env file found"
    fi

    # Create cache directory if it doesn't exist
    CACHE_DIR="${CACHE_DIR:-$HOME/.riffroom/stems}"
    if [ ! -d "$CACHE_DIR" ]; then
        log_info "Creating cache directory: $CACHE_DIR"
        mkdir -p "$CACHE_DIR"
        log_success "Cache directory created"
    fi
}

start_server() {
    log_info "Starting RiffRoom backend server..."
    log_info "  Host: $DEFAULT_HOST"
    log_info "  Port: $DEFAULT_PORT"
    log_info "  Workers: $DEFAULT_WORKERS"
    log_info "  Log Level: $DEFAULT_LOG_LEVEL"
    echo ""
    log_info "Press Ctrl+C to stop the server"
    echo ""

    cd "$BACKEND_DIR"

    # Start uvicorn with uv
    exec uv run uvicorn app.main:app \
        --host "$DEFAULT_HOST" \
        --port "$DEFAULT_PORT" \
        --workers "$DEFAULT_WORKERS" \
        --log-level "$DEFAULT_LOG_LEVEL" \
        --reload
}

# Cleanup function for graceful shutdown
cleanup() {
    echo ""
    log_info "Shutting down gracefully..."
    exit 0
}

# Trap SIGINT and SIGTERM for graceful shutdown
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    echo ""
    log_info "RiffRoom Backend Startup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    check_dependencies
    check_environment

    echo ""
    log_success "Pre-flight checks passed"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    start_server
}

main "$@"
