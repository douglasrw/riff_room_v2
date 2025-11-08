#!/bin/bash
set -e

echo "<� Building RiffRoom Release..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_TESTS=false
PLATFORM="all"

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--skip-tests] [--platform mac|win|linux|all]"
      exit 1
      ;;
  esac
done

# Check required tools
echo "= Checking build tools..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}L Node.js not found${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}L pnpm not found${NC}"
    exit 1
fi

# FIXED: Check for Python 3.12 (actual version used, not 3.14)
if ! command -v python3.12 &> /dev/null && ! command -v python3 &> /dev/null; then
    echo -e "${RED}L Python 3.12+ not found${NC}"
    exit 1
fi

echo -e "${GREEN} Build tools ready${NC}"
echo ""

# Clean previous builds
echo ">� Cleaning previous builds..."
rm -rf dist/
rm -rf packages/web/dist/
rm -rf packages/desktop/dist/

# Install dependencies
echo "=� Installing dependencies..."
pnpm install --frozen-lockfile

# Run tests (unless skipped)
if [ "$SKIP_TESTS" = false ]; then
    echo ">� Running tests..."
    pnpm test || {
        echo -e "${RED}L Tests failed${NC}"
        exit 1
    }
    echo -e "${GREEN} Tests passed${NC}"
else
    echo -e "${YELLOW}�  Skipping tests${NC}"
fi
echo ""

# Build web frontend
echo "< Building web frontend..."
cd packages/web
pnpm build
cd ../..
echo -e "${GREEN} Web frontend built${NC}"
echo ""

# Build backend (Python)
echo "= Preparing Python backend..."
cd packages/backend

# Ensure venv exists
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    uv venv
fi

# Install dependencies
uv sync

# Could optionally package Python as standalone binary here
# For now, we bundle the source + venv with electron

cd ../..
echo -e "${GREEN} Backend prepared${NC}"
echo ""

# Build Electron app
echo "� Building Electron app for platform: $PLATFORM..."
cd packages/desktop

case $PLATFORM in
  mac)
    pnpm build:mac
    ;;
  win)
    pnpm build:win
    ;;
  linux)
    pnpm build:linux
    ;;
  all)
    # Build for current platform only by default
    # Multi-platform builds typically done in CI
    pnpm build
    ;;
esac

cd ../..
echo -e "${GREEN} Electron app built${NC}"
echo ""

# Summary
echo "=" * 60
echo -e "${GREEN} Build complete!${NC}"
echo "=" * 60
echo ""
echo "Build artifacts:"
echo "  - Electron app: packages/desktop/dist/"
echo "  - Web bundle: packages/web/dist/"
echo ""

# Show build size
if [ -d "packages/desktop/dist" ]; then
    echo "Package sizes:"
    du -sh packages/desktop/dist/* 2>/dev/null || echo "  (No packages found)"
fi

echo ""
echo "Next steps:"
echo "  - Test the app: open packages/desktop/dist/mac/RiffRoom.app"
echo "  - Upload to release: gh release create v0.1.0 packages/desktop/dist/*"
