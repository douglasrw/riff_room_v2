# RiffRoom

Music practice made simple - ML-powered stem separation for focused practice.

## Architecture

- **packages/desktop**: Electron wrapper for desktop app
- **packages/web**: React frontend (Vite + TypeScript + Tailwind)
- **packages/backend**: Python ML backend (FastAPI + Demucs)

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.14+
- uv (Python package manager)

### Quick Start

1. **Install dependencies**
   ```bash
   pnpm install
   cd packages/backend && uv sync
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```

3. **Start development servers**
   ```bash
   pnpm dev
   ```

   This runs:
   - Web frontend: http://localhost:5173
   - Backend API: http://localhost:8007
   - Electron desktop app

## Project Structure

```
riff_room_v2/
├── packages/
│   ├── desktop/          # Electron app
│   ├── web/             # React frontend
│   └── backend/         # Python ML backend
├── scripts/             # Build & setup scripts
└── docs/               # Documentation
```

## Development Commands

```bash
# Development
pnpm dev                # Start all services
pnpm dev:web           # Frontend only
pnpm dev:backend       # Backend only

# Build
pnpm build             # Build all packages
pnpm build:web         # Build frontend
pnpm build:desktop     # Build Electron app

# Testing
pnpm test              # Run tests
pnpm lint              # Lint code
pnpm format            # Format code
```

## Tech Stack

### Frontend
- React 18.3
- TypeScript 5.6
- Vite 5.4
- TailwindCSS 3.4
- Zustand (state)
- TanStack Query (data fetching)
- Tone.js + WaveSurfer.js (audio)

### Backend
- Python 3.14
- FastAPI 0.115
- Demucs 4.0 (stem separation)
- librosa (audio analysis)
- SQLite (database)

### Desktop
- Electron 33
- Context isolation + security

## License

MIT
