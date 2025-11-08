# RiffRoom

**Music practice made simple** - ML-powered stem separation for focused practice.

> Isolate any instrument, slow down without pitch change, loop difficult sections, and track your practice streak.

[![CI](https://github.com/douglasrw/riff_room_v2/actions/workflows/ci.yml/badge.svg)](https://github.com/douglasrw/riff_room_v2/actions/workflows/ci.yml)

---

## Features

### 🎸 Intelligent Stem Separation
- **4-stem separation**: Isolate drums, bass, vocals, and other (guitar/keys)
- **ML-powered**: Uses Demucs v4 for state-of-the-art audio separation
- **Fast processing**: <30 seconds for typical songs
- **Smart caching**: SHA256-based file hashing for instant replay

### 🎹 Practice Tools
- **Solo/Mute stems**: Focus on any instrument or combination
- **Speed control**: 70%, 85%, 100% without pitch change
- **Loop markers**: Set start/end points for difficult sections
- **Synchronized playback**: All stems perfectly aligned
- **Keyboard shortcuts**: Space, arrow keys, 1-4 for stems

### 📊 Progress Tracking
- **Practice streaks**: Track consecutive days of practice
- **Session recording**: Log time, songs, and loops practiced
- **Achievements**: Unlock milestones (7-day streak, 10 songs, 100 hours)
- **Statistics**: Weekly practice time and session analytics

### 💾 Smart Caching
- **Multi-layer cache**: Memory (100MB) + IndexedDB (1GB) + Filesystem
- **LRU eviction**: Intelligent cache management
- **Offline support**: Practice without internet after first load

---

## Architecture

```
riff_room_v2/
├── packages/
│   ├── desktop/          # Electron wrapper (cross-platform desktop)
│   ├── web/             # React frontend (Vite + TypeScript + Tailwind)
│   └── backend/         # Python ML backend (FastAPI + Demucs)
├── scripts/             # Build & setup automation
└── .github/workflows/   # CI/CD pipelines
```

**Tech Stack:**
- **Frontend**: React 18, TypeScript 5, Vite 5, Tailwind CSS, Zustand, Tone.js, WaveSurfer.js
- **Backend**: Python 3.12, FastAPI, Demucs v4, librosa, SQLite, WebSockets
- **Desktop**: Electron 33 with context isolation & CSP security

---

## Development Setup

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** 9+ (`npm install -g pnpm`)
- **Python** 3.12+ ([Download](https://www.python.org/downloads/))
- **uv** (Python package manager: `pip install uv`)

### Quick Start

1. **Clone repository**
   ```bash
   git clone https://github.com/douglasrw/riff_room_v2.git
   cd riff_room_v2
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   pnpm install

   # Backend dependencies
   cd packages/backend
   uv sync
   cd ../..
   ```

3. **Configure environment**
   ```bash
   # Frontend configuration
   cd packages/web
   cp .env.example .env
   # Edit .env if needed (defaults work for local dev)

   # Backend configuration
   cd ../backend
   cp .env.example .env
   # Edit .env if needed (defaults work for local dev)
   ```

4. **Start development servers**

   **Option A: All services (recommended)**
   ```bash
   # From project root
   pnpm dev
   ```

   **Option B: Backend only with health checks**
   ```bash
   cd packages/backend
   ./start-backend.sh
   ```

   The backend startup script:
   - ✓ Checks prerequisites (uv, Python version)
   - ✓ Creates .env from .env.example if needed
   - ✓ Verifies cache directory access
   - ✓ Detects port conflicts
   - ✓ Waits for backend to be healthy
   - ✓ Shows detailed system status

   **Services**:
   - **Web frontend**: http://localhost:5173
   - **Backend API**: http://localhost:8007
   - **API docs**: http://localhost:8007/docs (FastAPI Swagger UI)
   - **Health check**: http://localhost:8007/health (comprehensive diagnostics)

5. **Verify setup**
   - Open http://localhost:5173
   - Drag & drop an MP3/WAV/M4A file
   - Wait ~30s for stem separation
   - Play with isolated stems!

---

## Environment Configuration

### Frontend (`packages/web/.env`)

```bash
# Backend API URL
# Development: http://localhost:8007
# Production: https://api.riffroom.app
VITE_API_URL=http://localhost:8007
```

### Backend (`packages/backend/.env`)

```bash
# API Base URL (for CORS and client references)
API_BASE_URL=http://localhost:8007

# Cache directory for processed stems
# Stores separated stems for reuse
CACHE_DIR=~/.riffroom/stems

# Debug mode
# true: Verbose logging, auto-reload
# false: Production logging
DEBUG=true

# CORS allowed origins (comma-separated)
# Add your frontend URLs
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Database

**Location**: `~/.riffroom/riffroom.db` (SQLite)

**Tables**:
- `songs` - Uploaded tracks and metadata
- `stems` - Processed stem files (drums, bass, other, vocals)
- `sessions` - Practice sessions with duration, loops, stems used
- `streaks` - Daily practice stats (time, songs, session count)
- `achievements` - Unlocked milestones

**Auto-created** on first backend startup. No manual setup required.

---

## API Endpoints

### Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/process` | Upload audio file for stem separation |
| `GET` | `/api/stems/{client_id}` | Get processed stems (use WebSocket instead) |
| `WS` | `/ws/{client_id}` | Real-time progress updates |

### Practice Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions` | Record practice session |
| `GET` | `/api/sessions?song_id={id}&limit={n}` | List sessions |
| `GET` | `/api/streaks?since={date}&limit={n}` | List daily streaks |
| `GET` | `/api/streaks/{date}` | Get specific day stats |
| `PATCH` | `/api/streaks/{date}` | Update day stats (incremental) |
| `GET` | `/api/achievements` | List unlocked achievements |
| `POST` | `/api/achievements` | Unlock achievement |

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Comprehensive health check (Demucs, DB, cache, system resources) |
| `GET` | `/health/live` | Lightweight liveness probe (always 200 if running) |
| `GET` | `/health/ready` | Readiness probe (200 only if ready to process) |
| `GET` | `/docs` | OpenAPI documentation |

**Health Check Response**:
```json
{
  "status": "healthy",  // "healthy", "degraded", "unhealthy"
  "timestamp": 1699564800.0,
  "checks": {
    "demucs": { "status": "pass", "device": "cpu", "torch_version": "2.2.0" },
    "database": { "status": "pass", "database_path": "~/.riffroom/riffroom.db" },
    "cache": { "status": "pass", "writable": true, "total_size_bytes": 12345 },
    "system": { "status": "pass", "cpu_percent": 15.2, "memory_percent": 45.0 }
  }
}
```

**Full API docs**: http://localhost:8007/docs (when backend is running)

---

## Development Commands

```bash
# Development
pnpm dev                # Start all services (web + backend)
pnpm dev:web           # Frontend only
pnpm dev:backend       # Backend only (Python)

# Build
pnpm build             # Build all packages
pnpm build:web         # Build frontend (production)
pnpm build:desktop     # Build Electron app

# Code Quality
pnpm lint              # Lint TypeScript & Python
pnpm type-check        # TypeScript type checking
pnpm format            # Format code with Prettier

# Testing
pnpm test              # Run all tests
pnpm test:web          # Frontend tests (Vitest)
pnpm test:e2e          # E2E tests (Playwright)
cd packages/backend && pytest  # Backend tests
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` | Skip back 5s |
| `→` | Skip forward 5s |
| `Shift + ←` | Skip back 10s |
| `Shift + →` | Skip forward 10s |
| `1` | Solo drums |
| `2` | Solo bass |
| `3` | Solo other (guitar/keys) |
| `4` | Solo vocals |
| `0` | Unsolo all |
| `Shift + 1-4` | Mute/unmute stem |
| `S` | Cycle speed (70% → 85% → 100%) |
| `[` | Set loop start |
| `]` | Set loop end |
| `Shift + [` | Clear loop |
| `?` | Show shortcuts |
| `Esc` | Close shortcuts |

---

## Troubleshooting

### Backend won't start

**Error**: `ModuleNotFoundError: No module named 'demucs'`

**Solution**:
```bash
cd packages/backend
uv sync  # Reinstall dependencies
```

---

### Stems not processing

**Error**: File upload succeeds but no progress

**Solutions**:
1. Check backend is running: http://localhost:8007/health
2. Check browser console for WebSocket errors
3. Verify CORS_ORIGINS includes your frontend URL
4. Try smaller file (<50MB for testing)

---

### WebSocket connection failed

**Error**: `WebSocket connection to 'ws://localhost:8007/ws/...' failed`

**Solutions**:
1. Verify backend is running
2. Check VITE_API_URL in `packages/web/.env`
3. Check browser console for specific error
4. Try different port if 8007 is in use

---

### Cache directory errors

**Error**: `Permission denied` when writing to cache

**Solution**:
```bash
# Check cache directory exists and is writable
ls -la ~/.riffroom/
# Or change cache location in packages/backend/.env
CACHE_DIR=./local-cache
```

---

### Python version mismatch

**Error**: `Python 3.14 not found` or similar

**Solution**: This project uses **Python 3.12**, not 3.14. Update to Python 3.12:
```bash
# macOS (Homebrew)
brew install python@3.12

# Windows (Chocolatey)
choco install python312

# Verify version
python3 --version  # Should show 3.12.x
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`pnpm test`, `cd packages/backend && pytest`)
4. Run linting (`pnpm lint`)
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

**Commit message format**: [Conventional Commits](https://www.conventionalcommits.org/)
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `chore:` Maintenance
- `test:` Tests

---

## Project Structure

```
riff_room_v2/
├── packages/
│   ├── desktop/
│   │   ├── src/
│   │   │   ├── main/       # Electron main process
│   │   │   └── preload/    # Preload scripts
│   │   └── package.json
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── services/   # Audio engine, WebSocket, cache
│   │   │   ├── stores/     # Zustand state
│   │   │   └── App.tsx     # Root component
│   │   ├── tests/          # Vitest & Playwright tests
│   │   └── package.json
│   └── backend/
│       ├── app/
│       │   ├── api/        # FastAPI routes
│       │   ├── core/       # Demucs processor, loop detection
│       │   ├── models/     # SQLModel schemas
│       │   └── main.py     # FastAPI app
│       ├── tests/          # Pytest tests
│       └── pyproject.toml  # Python dependencies (uv)
├── scripts/
│   ├── setup-dev.sh        # Development environment setup
│   ├── download-models.py  # Download Demucs models
│   └── build-release.sh    # Production build
├── .github/
│   └── workflows/
│       ├── ci.yml          # Continuous integration
│       └── release.yml     # Release builds
└── README.md
```

---

## Performance Notes

- **Stem separation**: ~15-30s depending on song length and CPU/GPU
- **GPU acceleration**: Automatic if CUDA available (10x faster)
- **Memory usage**: ~2GB for backend during processing
- **Cache size**: ~50MB per song (4 stems × ~12MB each)
- **Frontend bundle**: <2MB gzipped

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Demucs**: Alexandre Défossez et al. - [Paper](https://arxiv.org/abs/2211.08553)
- **librosa**: Music and audio analysis in Python
- **Tone.js**: Web Audio framework
- **WaveSurfer.js**: Audio waveform visualization

---

## Support

- **Issues**: [GitHub Issues](https://github.com/douglasrw/riff_room_v2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/douglasrw/riff_room_v2/discussions)

---

Built with multi-agent coordination using [Claude Code](https://claude.com/claude-code)
