# RIFF ROOM IMPLEMENTATION PLAN
## Chief Software Architect's Technical Blueprint
### "30 Seconds to Practice: Ultra-Optimized Tech Stack"

---

## Executive Technical Summary

**Core Architecture:** Desktop-first Electron app with Python ML backend, optimized for sub-30s stem separation
**Stack:** Electron + React + Python 3.13 (uv) + Demucs + SQLite + WebAudio API
**Development Timeline:** 16 weeks to profitable MVP, 32 weeks to full platform
**Performance Target:** <30s stem separation, <100ms UI response, <5MB initial load

---

## 1. TECHNOLOGY STACK SELECTION

### 1.1 Frontend Stack
```
PRIMARY UI FRAMEWORK:
├── Electron v28+ (desktop wrapper)
├── React 18.3 (UI framework)
├── TypeScript 5.3+ (type safety)
├── Vite 5.0+ (build tool, HMR)
├── TanStack Query v5 (data fetching)
└── Zustand 4.5+ (state management)

STYLING & COMPONENTS:
├── Tailwind CSS 3.4+ (utility-first CSS)
├── Radix UI (accessible primitives)
├── Lucide React (icon system)
├── Framer Motion (animations)
└── React Hook Form (form handling)

AUDIO PROCESSING:
├── WaveSurfer.js v7 (waveform visualization)
├── Tone.js (audio manipulation)
├── Web Audio API (native processing)
└── Custom WebWorkers (heavy processing)
```

**Rationale:** Electron enables keyboard shortcuts + local file access. React ecosystem mature for rapid development. Tailwind + Radix = fast, accessible UI.

### 1.2 Backend Stack (Python ML Engine)
```
PYTHON ENVIRONMENT:
├── Python 3.13.0 (latest stable)
├── uv 0.4.18+ (package manager)
├── pyproject.toml (dependency management)
└── .venv (isolated environment)

ML/AUDIO PROCESSING:
├── Demucs v4.0.1 (stem separation)
├── librosa 0.10.2 (audio analysis)
├── scipy 1.14.1 (signal processing)
├── numpy 2.0.2 (numerical computing)
├── torch 2.2.0 (ML runtime)
└── onnxruntime 1.18+ (optimized inference)

API & COMMUNICATION:
├── FastAPI 0.115.0 (REST API)
├── Pydantic v2.9+ (data validation)
├── python-multipart (file uploads)
├── uvicorn 0.32+ (ASGI server)
└── WebSockets (real-time progress)
```

**Rationale:** Python dominates audio ML. Demucs is SOTA for stem separation. FastAPI enables async processing with WebSocket progress updates.

### 1.3 Data & Storage
```
LOCAL STORAGE:
├── SQLite (metadata, sessions, settings)
├── File System (audio stems cache)
├── IndexedDB (browser-side cache)
└── Electron Store (user preferences)

SCHEMA DESIGN:
├── songs (id, title, artist, path, hash)
├── stems (song_id, type, path, processed_at)
├── sessions (id, song_id, loops, duration)
├── settings (key, value, updated_at)
└── streaks (date, practice_time, songs_count)
```

### 1.4 Build & Development Tools
```
BUILD PIPELINE:
├── electron-builder (desktop packaging)
├── Vite (frontend bundling)
├── PyInstaller (Python binary)
├── GitHub Actions (CI/CD)
└── Sentry (error tracking)

DEVELOPMENT:
├── ESLint + Prettier (code quality)
├── Vitest (unit testing)
├── Playwright (E2E testing)
├── Storybook (component development)
└── Docker (containerization)
```

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                 │
│  ├── App lifecycle management                            │
│  ├── Native menus & shortcuts                            │
│  ├── File system access                                  │
│  └── Python process spawning                             │
└─────────────────────────────────────────────────────────┘
                              │
                              ├── IPC Bridge
                              │
┌─────────────────────────────────────────────────────────┐
│                   ELECTRON RENDERER                      │
│  ┌──────────────────┐  ┌─────────────────────────┐     │
│  │   React App      │  │   Audio Engine          │     │
│  │  ├── UI Layer    │  │  ├── Web Audio API      │     │
│  │  ├── State Mgmt  │  │  ├── WaveSurfer.js      │     │
│  │  └── Router      │  │  └── Tone.js            │     │
│  └──────────────────┘  └─────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                              │
                              ├── HTTP/WebSocket
                              │
┌─────────────────────────────────────────────────────────┐
│                    PYTHON ML BACKEND                     │
│  ┌──────────────────┐  ┌─────────────────────────┐     │
│  │  FastAPI Server  │  │   ML Processing         │     │
│  │  ├── REST API    │  │  ├── Demucs Engine      │     │
│  │  ├── WebSocket   │  │  ├── Audio Analysis     │     │
│  │  └── Queue Mgmt  │  │  └── Loop Detection     │     │
│  └──────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                              ├── File System
                              │
┌─────────────────────────────────────────────────────────┐
│                     STORAGE LAYER                        │
│  ├── SQLite (metadata)                                   │
│  ├── Audio cache (~/.riffroom/stems/)                    │
│  └── Settings (~/.riffroom/config.json)                 │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Architecture
```
USER ACTION: Drag MP3 file
    │
    ├──> Electron Main (file path validation)
    │
    ├──> React UI (show processing state)
    │
    ├──> Python Backend (via HTTP)
    │       │
    │       ├──> Hash check (avoid reprocessing)
    │       ├──> Demucs processing
    │       ├──> WebSocket progress updates
    │       └──> Return stem paths
    │
    ├──> Audio Engine (load stems)
    │       │
    │       ├──> Web Audio API setup
    │       ├──> WaveSurfer visualization
    │       └──> Playback controls ready
    │
    └──> UI Update (ready to practice)

TOTAL TIME: <30 seconds (target)
```

---

## 3. PROJECT STRUCTURE

### 3.1 Directory Layout
```
riff_room_v2/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── release.yml
│   │   └── test.yml
│   └── ISSUE_TEMPLATE/
│
├── packages/
│   ├── desktop/                 # Electron app
│   │   ├── src/
│   │   │   ├── main/           # Main process
│   │   │   │   ├── index.ts
│   │   │   │   ├── ipc.ts
│   │   │   │   ├── menu.ts
│   │   │   │   └── shortcuts.ts
│   │   │   ├── preload/        # Preload scripts
│   │   │   └── shared/         # Shared types
│   │   ├── electron-builder.json
│   │   └── package.json
│   │
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── AudioPlayer/
│   │   │   │   ├── WaveformDisplay/
│   │   │   │   ├── LoopControls/
│   │   │   │   ├── KeyboardShortcuts/
│   │   │   │   └── SessionTracker/
│   │   │   ├── hooks/
│   │   │   │   ├── useAudioEngine.ts
│   │   │   │   ├── useKeyboardShortcuts.ts
│   │   │   │   └── useStemProcessor.ts
│   │   │   ├── services/
│   │   │   │   ├── api.ts
│   │   │   │   ├── audio.ts
│   │   │   │   └── storage.ts
│   │   │   ├── stores/
│   │   │   │   ├── audioStore.ts
│   │   │   │   ├── sessionStore.ts
│   │   │   │   └── settingsStore.ts
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── backend/                # Python ML engine
│       ├── app/
│       │   ├── api/
│       │   │   ├── __init__.py
│       │   │   ├── routes.py
│       │   │   └── websocket.py
│       │   ├── core/
│       │   │   ├── config.py
│       │   │   ├── demucs_processor.py
│       │   │   ├── audio_analyzer.py
│       │   │   └── loop_detector.py
│       │   ├── models/
│       │   │   ├── song.py
│       │   │   └── stem.py
│       │   ├── services/
│       │   │   ├── cache_manager.py
│       │   │   ├── queue_processor.py
│       │   │   └── file_handler.py
│       │   └── main.py
│       ├── tests/
│       ├── pyproject.toml
│       └── uv.lock
│
├── scripts/
│   ├── setup-dev.sh
│   ├── build-release.sh
│   └── download-models.py
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── .env.example
├── docker-compose.yml
├── LICENSE
└── README.md
```

---

## 4. PHASE 1 MVP IMPLEMENTATION (Weeks 3-8)

### 4.1 Core Feature: Drag-and-Drop Stem Separation

#### 4.1.1 Frontend Implementation
```typescript
// packages/web/src/components/DragDropZone.tsx
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useStemProcessor } from '@/hooks/useStemProcessor';

export const DragDropZone = () => {
  const { processSong, isProcessing, progress } = useStemProcessor();

  const onDrop = useCallback(async (files: File[]) => {
    const audioFile = files[0];
    if (!audioFile) return;

    // Validate file type
    const validTypes = ['audio/mp3', 'audio/wav', 'audio/m4a'];
    if (!validTypes.includes(audioFile.type)) {
      toast.error('Unsupported file type');
      return;
    }

    // Start processing
    await processSong(audioFile);
  }, [processSong]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a'] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-12 text-center',
        isDragActive && 'border-blue-500 bg-blue-50',
        isProcessing && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      {isProcessing ? (
        <ProcessingIndicator progress={progress} />
      ) : (
        <DropPrompt />
      )}
    </div>
  );
};
```

#### 4.1.2 Backend Stem Processing
```python
# packages/backend/app/core/demucs_processor.py
import hashlib
import asyncio
from pathlib import Path
from typing import Dict, Optional
import torch
import demucs.api

class DemucsProcessor:
    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.separator = demucs.api.Separator(
            model="htdemucs_ft",  # Fine-tuned model
            device="cuda" if torch.cuda.is_available() else "cpu",
            shifts=1,  # Balance speed vs quality
        )

    async def process_song(
        self,
        audio_path: Path,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Path]:
        """Process audio file into 4 stems."""

        # Generate cache key
        file_hash = self._get_file_hash(audio_path)
        cache_path = self.cache_dir / file_hash

        # Check cache
        if cache_path.exists():
            return self._load_cached_stems(cache_path)

        # Process with Demucs
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            stems = await loop.run_in_executor(
                None,
                self._run_separation,
                audio_path,
                progress_callback
            )

            # Save to cache
            self._save_stems(stems, cache_path)

            return {
                'drums': cache_path / 'drums.wav',
                'bass': cache_path / 'bass.wav',
                'other': cache_path / 'other.wav',  # guitar/keys
                'vocals': cache_path / 'vocals.wav',
            }

        except Exception as e:
            raise ProcessingError(f"Stem separation failed: {e}")

    def _run_separation(self, audio_path: Path, callback):
        """Run Demucs separation with progress tracking."""
        origin, separated = self.separator.separate_audio_file(
            str(audio_path)
        )

        # Demucs returns dictionary of stems
        return separated

    def _get_file_hash(self, path: Path) -> str:
        """Generate SHA256 hash of file for caching."""
        sha256_hash = hashlib.sha256()
        with open(path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()[:16]
```

#### 4.1.3 WebSocket Progress Updates
```python
# packages/backend/app/api/websocket.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    async def send_progress(self, client_id: str, progress: float, status: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json({
                "type": "progress",
                "data": {
                    "progress": progress,
                    "status": status
                }
            })

    async def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

manager = ConnectionManager()

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        await manager.disconnect(client_id)
```

### 4.2 Keyboard-Only Playback Controls

#### 4.2.1 Keyboard Hook Implementation
```typescript
// packages/web/src/hooks/useKeyboardShortcuts.ts
import { useEffect, useCallback } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { useHotkeys } from 'react-hotkeys-hook';

export const useKeyboardShortcuts = () => {
  const {
    isPlaying,
    togglePlay,
    soloStem,
    muteStem,
    setSpeed,
    setLoopStart,
    setLoopEnd,
    skipForward,
    skipBackward,
  } = useAudioStore();

  // Play/Pause
  useHotkeys('space', (e) => {
    e.preventDefault();
    togglePlay();
  }, { enableOnFormTags: false });

  // Solo stems (1-4)
  useHotkeys('1', () => soloStem('drums'));
  useHotkeys('2', () => soloStem('bass'));
  useHotkeys('3', () => soloStem('other'));
  useHotkeys('4', () => soloStem('vocals'));

  // Mute stems (Shift+1-4)
  useHotkeys('shift+1', () => muteStem('drums'));
  useHotkeys('shift+2', () => muteStem('bass'));
  useHotkeys('shift+3', () => muteStem('other'));
  useHotkeys('shift+4', () => muteStem('vocals'));

  // Speed control
  useHotkeys('s', () => {
    const speeds = [0.7, 0.85, 1.0];
    const currentSpeed = useAudioStore.getState().playbackSpeed;
    const nextIndex = (speeds.indexOf(currentSpeed) + 1) % speeds.length;
    setSpeed(speeds[nextIndex]);
  });

  // Loop markers
  useHotkeys('[', () => setLoopStart());
  useHotkeys(']', () => setLoopEnd());

  // Navigation
  useHotkeys('left', () => skipBackward(5));
  useHotkeys('right', () => skipForward(5));

  // Show shortcuts overlay
  useHotkeys('?', () => {
    useAudioStore.setState({ showShortcuts: true });
  });
};
```

#### 4.2.2 Audio Engine Integration
```typescript
// packages/web/src/services/audioEngine.ts
import * as Tone from 'tone';

export class AudioEngine {
  private players: Map<string, Tone.Player> = new Map();
  private transport: typeof Tone.Transport;
  private currentSpeed: number = 1.0;

  constructor() {
    this.transport = Tone.Transport;
    this.setupAudioContext();
  }

  async loadStems(stems: StemPaths) {
    // Dispose old players
    this.dispose();

    // Load new stems
    const loadPromises = Object.entries(stems).map(async ([name, url]) => {
      const player = new Tone.Player({
        url,
        loop: true,
        onload: () => console.log(`${name} loaded`),
      }).toDestination();

      this.players.set(name, player);
    });

    await Promise.all(loadPromises);
    await Tone.loaded();
  }

  play() {
    if (Tone.context.state === 'suspended') {
      Tone.start();
    }
    this.transport.start();
  }

  pause() {
    this.transport.pause();
  }

  setSpeed(speed: number) {
    this.currentSpeed = speed;
    this.transport.bpm.value = 120 * speed; // Adjust tempo
  }

  soloStem(stemName: string) {
    this.players.forEach((player, name) => {
      player.mute = name !== stemName;
    });
  }

  muteStem(stemName: string) {
    const player = this.players.get(stemName);
    if (player) {
      player.mute = !player.mute;
    }
  }

  setLoop(start: number, end: number) {
    this.transport.loopStart = start;
    this.transport.loopEnd = end;
    this.transport.loop = true;
  }

  seek(time: number) {
    this.transport.seconds = time;
  }

  dispose() {
    this.players.forEach(player => player.dispose());
    this.players.clear();
  }
}
```

### 4.3 Auto-Loop Detection

#### 4.3.1 ML-Based Loop Detection
```python
# packages/backend/app/core/loop_detector.py
import librosa
import numpy as np
from scipy.signal import find_peaks
from typing import List, Tuple

class LoopDetector:
    def __init__(self):
        self.hop_length = 512
        self.frame_rate = 44100 / self.hop_length

    def detect_difficult_sections(
        self,
        audio_path: str,
        num_sections: int = 3
    ) -> List[Tuple[float, float]]:
        """Detect difficult sections using audio complexity analysis."""

        # Load audio
        y, sr = librosa.load(audio_path, sr=44100)

        # Extract features
        spectral_complexity = self._compute_spectral_complexity(y, sr)
        onset_density = self._compute_onset_density(y, sr)
        harmonic_complexity = self._compute_harmonic_complexity(y, sr)

        # Combine features
        difficulty_curve = (
            0.4 * spectral_complexity +
            0.3 * onset_density +
            0.3 * harmonic_complexity
        )

        # Smooth curve
        difficulty_curve = librosa.util.normalize(difficulty_curve)

        # Find peaks (difficult sections)
        peaks, properties = find_peaks(
            difficulty_curve,
            height=0.5,
            distance=int(4 * self.frame_rate)  # Min 4 seconds apart
        )

        # Convert to time segments
        sections = []
        for peak in peaks[:num_sections]:
            start_frame = max(0, peak - int(2 * self.frame_rate))
            end_frame = min(len(difficulty_curve), peak + int(2 * self.frame_rate))

            start_time = start_frame / self.frame_rate
            end_time = end_frame / self.frame_rate

            sections.append((start_time, end_time))

        return sections

    def _compute_spectral_complexity(self, y, sr):
        """Measure spectral complexity (more complex = harder)."""
        stft = librosa.stft(y, hop_length=self.hop_length)
        spectral_centroid = librosa.feature.spectral_centroid(S=np.abs(stft))
        spectral_rolloff = librosa.feature.spectral_rolloff(S=np.abs(stft))

        # Variance indicates complexity
        complexity = np.var(spectral_centroid) + np.var(spectral_rolloff)
        return complexity[0]

    def _compute_onset_density(self, y, sr):
        """Measure note onset density (more notes = harder)."""
        onset_envelope = librosa.onset.onset_strength(
            y=y,
            sr=sr,
            hop_length=self.hop_length
        )

        # Use sliding window to compute local density
        window_size = int(2 * self.frame_rate)  # 2-second windows
        density = np.convolve(
            onset_envelope,
            np.ones(window_size) / window_size,
            mode='same'
        )

        return density

    def _compute_harmonic_complexity(self, y, sr):
        """Measure harmonic complexity (more harmonics = harder)."""
        harmonic, percussive = librosa.effects.hpss(y)
        chroma = librosa.feature.chroma_stft(
            y=harmonic,
            sr=sr,
            hop_length=self.hop_length
        )

        # Entropy of chroma indicates harmonic complexity
        entropy = -np.sum(chroma * np.log2(chroma + 1e-6), axis=0)
        return entropy
```

### 4.4 Session Streak Tracker

#### 4.4.1 Database Schema
```sql
-- SQLite schema for streak tracking
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    loops_practiced INTEGER DEFAULT 0,
    stems_used TEXT,  -- JSON array
    FOREIGN KEY (song_id) REFERENCES songs(id)
);

CREATE TABLE streaks (
    date DATE PRIMARY KEY,
    practice_time_seconds INTEGER DEFAULT 0,
    songs_practiced INTEGER DEFAULT 0,
    sessions_count INTEGER DEFAULT 0
);

CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,  -- 'streak_7', 'streak_30', 'songs_10', etc.
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT  -- JSON with details
);

-- Index for fast streak queries
CREATE INDEX idx_streaks_date ON streaks(date DESC);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
```

#### 4.4.2 Streak Service
```typescript
// packages/web/src/services/streakService.ts
import { db } from '@/services/database';
import { differenceInDays, startOfDay } from 'date-fns';

export class StreakService {
  async recordSession(songId: number, duration: number, loops: number) {
    const today = startOfDay(new Date());

    // Record session
    await db.sessions.create({
      songId,
      startedAt: new Date(),
      duration,
      loopsPracticed: loops,
    });

    // Update daily streak
    await db.streaks.upsert({
      date: today,
      practiceTimeSeconds: { increment: duration },
      songsPracticed: { increment: 1 },
      sessionsCount: { increment: 1 },
    });

    // Check achievements
    await this.checkAchievements();
  }

  async getCurrentStreak(): Promise<number> {
    const streaks = await db.streaks.findMany({
      orderBy: { date: 'desc' },
      take: 365,
    });

    if (streaks.length === 0) return 0;

    let consecutiveDays = 0;
    let expectedDate = startOfDay(new Date());

    for (const streak of streaks) {
      const streakDate = new Date(streak.date);
      const daysDiff = differenceInDays(expectedDate, streakDate);

      if (daysDiff === 0) {
        consecutiveDays++;
        expectedDate = new Date(expectedDate.getTime() - 86400000);
      } else if (daysDiff === 1 && consecutiveDays === 0) {
        // Allow for today not practiced yet
        expectedDate = streakDate;
        expectedDate.setDate(expectedDate.getDate() - 1);
        consecutiveDays = 1;
      } else {
        break;
      }
    }

    return consecutiveDays;
  }

  async getWeeklyStats() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const stats = await db.streaks.aggregate({
      where: { date: { gte: weekAgo } },
      _sum: {
        practiceTimeSeconds: true,
        songsPracticed: true,
      },
    });

    return {
      totalMinutes: Math.floor((stats._sum.practiceTimeSeconds || 0) / 60),
      totalSongs: stats._sum.songsPracticed || 0,
    };
  }

  private async checkAchievements() {
    const streak = await this.getCurrentStreak();

    // Check milestone achievements
    const milestones = [7, 30, 100];
    for (const milestone of milestones) {
      if (streak === milestone) {
        await this.unlockAchievement(`streak_${milestone}`, {
          streak,
          date: new Date(),
        });
      }
    }
  }

  private async unlockAchievement(type: string, metadata: any) {
    // Check if already unlocked
    const existing = await db.achievements.findFirst({
      where: { type },
    });

    if (!existing) {
      await db.achievements.create({
        type,
        metadata: JSON.stringify(metadata),
      });

      // Trigger notification
      this.notifyAchievement(type);
    }
  }

  private notifyAchievement(type: string) {
    // Show toast notification
    const messages = {
      streak_7: "🔥 7-day streak! You're on fire!",
      streak_30: "⚡ 30-day streak! Legendary dedication!",
      streak_100: "🏆 100-day streak! You're unstoppable!",
    };

    toast.success(messages[type] || "Achievement unlocked!");
  }
}
```

### 4.5 Minimal UI Implementation

#### 4.5.1 Main App Layout
```tsx
// packages/web/src/App.tsx
import { DragDropZone } from '@/components/DragDropZone';
import { WaveformDisplay } from '@/components/WaveformDisplay';
import { PlaybackControls } from '@/components/PlaybackControls';
import { RecentSongs } from '@/components/RecentSongs';
import { StreakIndicator } from '@/components/StreakIndicator';
import { KeyboardOverlay } from '@/components/KeyboardOverlay';

export default function App() {
  const { currentSong, isProcessing } = useAudioStore();

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">RiffRoom</h1>
          <StreakIndicator />
        </div>
        <button
          onClick={() => setShowShortcuts(true)}
          className="text-gray-400 hover:text-white"
        >
          Shortcuts (?)
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-800 p-4">
          <RecentSongs />
        </aside>

        {/* Practice Area */}
        <main className="flex-1 flex flex-col">
          {currentSong ? (
            <>
              <WaveformDisplay />
              <PlaybackControls />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <DragDropZone />
            </div>
          )}
        </main>
      </div>

      {/* Keyboard Overlay */}
      <KeyboardOverlay />
    </div>
  );
}
```

#### 4.5.2 Waveform Component
```tsx
// packages/web/src/components/WaveformDisplay.tsx
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';
import { useEffect, useRef } from 'react';

export const WaveformDisplay = ({ audioUrl, loops }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WaveSurfer
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4F46E5',
      progressColor: '#818CF8',
      cursorColor: '#F3F4F6',
      barWidth: 2,
      barGap: 1,
      responsive: true,
      height: 128,
      normalize: true,
    });

    // Add regions plugin for loops
    const regions = ws.registerPlugin(RegionsPlugin.create());

    // Load audio
    ws.load(audioUrl);

    // Add loop regions
    loops.forEach((loop, index) => {
      regions.addRegion({
        start: loop.start,
        end: loop.end,
        color: `rgba(79, 70, 229, 0.2)`,
        drag: false,
        resize: false,
      });
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [audioUrl, loops]);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full" />

      {/* Time indicators */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-xs text-gray-500">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};
```

---

## 5. PERFORMANCE OPTIMIZATION

### 5.1 Stem Processing Optimization
```python
# Optimization strategies for <30s processing

class OptimizedDemucsProcessor:
    def __init__(self):
        # Use optimized model
        self.model = self._load_optimized_model()

        # Pre-allocate buffers
        self.buffer_size = 44100 * 60 * 5  # 5 minutes max
        self.buffer = np.zeros(self.buffer_size, dtype=np.float32)

    def _load_optimized_model(self):
        """Load quantized ONNX model for faster inference."""
        import onnxruntime as ort

        # Use ONNX for 2-3x speedup
        providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        session = ort.InferenceSession("models/demucs_quantized.onnx", providers=providers)

        return session

    async def process_parallel(self, audio_path: Path):
        """Process chunks in parallel for speedup."""
        # Split audio into chunks
        chunks = self._split_audio(audio_path, chunk_duration=30)

        # Process in parallel
        tasks = [self._process_chunk(chunk) for chunk in chunks]
        results = await asyncio.gather(*tasks)

        # Merge results
        return self._merge_stems(results)
```

### 5.2 UI Responsiveness (<100ms)
```typescript
// Debounced updates for smooth UI
const useDebouncedAudioState = () => {
  const audioState = useAudioStore();
  const [debouncedState, setDebouncedState] = useState(audioState);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedState(audioState);
    }, 16); // 60fps update rate

    return () => clearTimeout(timer);
  }, [audioState]);

  return debouncedState;
};

// Use Web Workers for heavy computations
const processAudioInWorker = async (audioBuffer: AudioBuffer) => {
  const worker = new Worker('/workers/audio-processor.js');

  return new Promise((resolve) => {
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };

    worker.postMessage({ buffer: audioBuffer });
  });
};
```

### 5.3 Cache Strategy
```typescript
// Multi-layer caching
class CacheManager {
  private memoryCache = new Map();
  private indexedDB: IDBDatabase;
  private fileSystemCache: string;

  async get(key: string): Promise<any> {
    // L1: Memory
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // L2: IndexedDB
    const dbResult = await this.getFromIndexedDB(key);
    if (dbResult) {
      this.memoryCache.set(key, dbResult);
      return dbResult;
    }

    // L3: File system
    const fsResult = await this.getFromFileSystem(key);
    if (fsResult) {
      await this.setInIndexedDB(key, fsResult);
      this.memoryCache.set(key, fsResult);
      return fsResult;
    }

    return null;
  }
}
```

---

## 6. TESTING STRATEGY

### 6.1 Unit Testing
```typescript
// packages/web/src/__tests__/audioEngine.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AudioEngine } from '@/services/audioEngine';

describe('AudioEngine', () => {
  let engine: AudioEngine;

  beforeEach(() => {
    engine = new AudioEngine();
  });

  it('should load stems correctly', async () => {
    const stems = {
      drums: '/test/drums.wav',
      bass: '/test/bass.wav',
    };

    await engine.loadStems(stems);
    expect(engine.players.size).toBe(2);
  });

  it('should solo stem correctly', () => {
    engine.soloStem('drums');
    expect(engine.players.get('drums').mute).toBe(false);
    expect(engine.players.get('bass').mute).toBe(true);
  });
});
```

### 6.2 E2E Testing
```typescript
// packages/web/e2e/practice-flow.test.ts
import { test, expect } from '@playwright/test';

test('complete practice flow', async ({ page }) => {
  await page.goto('/');

  // Drag and drop file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('./test-files/sample.mp3');

  // Wait for processing
  await expect(page.locator('.processing-indicator')).toBeVisible();
  await expect(page.locator('.waveform-display')).toBeVisible({ timeout: 30000 });

  // Test keyboard shortcuts
  await page.keyboard.press('Space'); // Play
  await expect(page.locator('.playing-indicator')).toBeVisible();

  await page.keyboard.press('1'); // Solo drums
  await expect(page.locator('.stem-drums')).toHaveClass(/active/);

  await page.keyboard.press('s'); // Change speed
  await expect(page.locator('.speed-indicator')).toContainText('85%');
});
```

---

## 7. CI/CD PIPELINE

### 7.1 GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'

      - name: Install uv
        run: pip install uv

      - name: Install Python dependencies
        run: |
          cd packages/backend
          uv pip install -e .

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install Node dependencies
        run: pnpm install

      - name: Run tests
        run: |
          pnpm test
          cd packages/backend && pytest

      - name: Build
        run: pnpm build

  release:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v4

      - name: Build Electron App
        run: |
          pnpm install
          pnpm build:electron

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: riffroom-${{ matrix.os }}
          path: dist/
```

---

## 8. SECURITY CONSIDERATIONS

### 8.1 Security Implementation
```typescript
// Electron security best practices
// packages/desktop/src/main/index.ts

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "connect-src 'self' ws://localhost:* http://localhost:*",
        ].join('; '),
      },
    });
  });
});

// Input sanitization
const sanitizeFilePath = (filePath: string): string => {
  // Prevent path traversal
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(filePath);

  // Ensure file is within allowed directory
  const allowedDir = app.getPath('userData');
  if (!resolved.startsWith(allowedDir)) {
    throw new Error('Invalid file path');
  }

  return resolved;
};
```

---

## 9. DEPLOYMENT & DISTRIBUTION

### 9.1 Auto-Update System
```typescript
// packages/desktop/src/main/updater.ts
import { autoUpdater } from 'electron-updater';

export class UpdateManager {
  constructor() {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update available',
        message: 'A new version of RiffRoom is available. It will be downloaded in the background.',
        buttons: ['OK'],
      });
    });

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: 'Update downloaded. RiffRoom will restart to apply the update.',
        buttons: ['Restart Now', 'Later'],
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }
}
```

### 9.2 License Activation
```typescript
// Simple license key validation
class LicenseManager {
  private readonly LICENSE_KEY_PATTERN = /^RF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

  async validateLicense(key: string): Promise<boolean> {
    if (!this.LICENSE_KEY_PATTERN.test(key)) {
      return false;
    }

    // Check with license server
    try {
      const response = await fetch('https://api.riffroom.app/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          machineId: getMachineId(),
        }),
      });

      const { valid, trial } = await response.json();

      if (valid) {
        await this.storeLicense(key);
        return true;
      }

      return false;
    } catch (error) {
      // Offline validation fallback
      return this.validateOffline(key);
    }
  }

  private validateOffline(key: string): boolean {
    // Simple checksum validation for offline mode
    const checksum = this.calculateChecksum(key);
    return checksum % 97 === 0;
  }
}
```

---

## 10. DEVELOPMENT WORKFLOW

### 10.1 Development Setup Script
```bash
#!/bin/bash
# scripts/setup-dev.sh

echo "🎸 Setting up RiffRoom development environment..."

# Check Python version
if ! python3.13 --version &> /dev/null; then
    echo "❌ Python 3.13 not found. Please install it first."
    exit 1
fi

# Install uv
pip install uv

# Setup Python environment
cd packages/backend
uv venv
source .venv/bin/activate
uv pip install -e .

# Download ML models
python ../../scripts/download-models.py

# Setup Node environment
cd ../..
npm install -g pnpm
pnpm install

# Setup database
cd packages/backend
alembic upgrade head

# Create config file
cp .env.example .env

echo "✅ Development environment ready!"
echo "Run 'pnpm dev' to start the application"
```

### 10.2 Development Commands
```json
// package.json scripts
{
  "scripts": {
    "dev": "concurrently \"pnpm:dev:*\"",
    "dev:electron": "cd packages/desktop && pnpm dev",
    "dev:web": "cd packages/web && pnpm dev",
    "dev:backend": "cd packages/backend && uvicorn app.main:app --reload",
    "build": "pnpm build:web && pnpm build:electron",
    "build:web": "cd packages/web && pnpm build",
    "build:electron": "cd packages/desktop && pnpm build",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
  }
}
```

---

## 11. MONITORING & ANALYTICS

### 11.1 Privacy-First Analytics
```typescript
// Anonymous usage tracking
class AnalyticsService {
  private readonly BATCH_SIZE = 10;
  private events: AnalyticsEvent[] = [];

  track(event: string, properties?: Record<string, any>) {
    // No PII collected
    const anonymousEvent = {
      event,
      properties: {
        ...properties,
        sessionId: this.getSessionId(),
        timestamp: Date.now(),
        version: app.getVersion(),
        platform: process.platform,
      },
    };

    this.events.push(anonymousEvent);

    if (this.events.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  private async flush() {
    const events = [...this.events];
    this.events = [];

    try {
      await fetch('https://analytics.riffroom.app/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      // Silently fail, don't impact user experience
      console.error('Analytics failed:', error);
    }
  }
}
```

---

## 12. PHASE 2 & 3 TECHNICAL SPECS

### 12.1 Band Features (Phase 2)
```typescript
// Band collaboration via magic links
class BandService {
  async createBandSession(hostId: string, songId: string) {
    const sessionId = generateId();
    const magicLink = `riffroom://join/${sessionId}`;

    await db.bandSessions.create({
      id: sessionId,
      hostId,
      songId,
      members: [hostId],
      createdAt: new Date(),
    });

    return { sessionId, magicLink };
  }

  async joinBandSession(magicLink: string, userId: string) {
    const sessionId = this.extractSessionId(magicLink);

    // Validate and join
    const session = await db.bandSessions.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Invalid session');

    // Add member
    await db.bandSessions.update({
      where: { id: sessionId },
      data: { members: { push: userId } },
    });

    // Share stems
    return this.getSharedStems(session.songId);
  }
}
```

### 12.2 Retention Features (Phase 3)
```typescript
// Smart practice recommendations
class PracticeCoach {
  async getDailyGoal(userId: string) {
    const history = await this.getUserHistory(userId);
    const difficulty = await this.assessUserLevel(history);

    return {
      goal: `Master the bridge of ${this.getSuggestedSong(difficulty)}`,
      estimatedTime: 15,
      focusArea: 'timing',
      tips: ['Start at 70% speed', 'Focus on clean transitions'],
    };
  }
}
```

---

## 13. COST PROJECTIONS

### 13.1 Development Costs
```
TOOLING & SERVICES (Annual):
├── Apple Developer Account: $99
├── Windows Code Signing: $200
├── Sentry.io (error tracking): $26/month = $312
├── Analytics hosting: $10/month = $120
├── Domain + SSL: $50
└── Total: ~$781/year

INFRASTRUCTURE (Monthly):
├── License server (Vercel): $0 (free tier)
├── Analytics DB (Supabase): $0 (free tier)
├── Model hosting (optional cloud): $20/month
└── Total: $20/month = $240/year

MARKETING:
├── Phase 1 Ads: $1,500 (one-time)
├── Content creation tools: $20/month = $240/year
└── Total Year 1: $1,740

TOTAL YEAR 1 COST: ~$2,761
```

---

## 14. RISK MITIGATION

### 14.1 Technical Risks
```
RISK: Demucs processing too slow on min-spec hardware
MITIGATION:
├── Implement progressive quality (draft → high quality)
├── Pre-process popular songs server-side
├── Offer cloud processing fallback ($5/month optional)

RISK: Electron app too large (>200MB)
MITIGATION:
├── Lazy-load ML models on first use
├── Use electron-builder compression
├── Ship core features only, plugins for extras

RISK: Audio sync issues between stems
MITIGATION:
├── Use Web Audio API scheduling (not setTimeout)
├── Implement audio clock synchronization
├── Test on various hardware configurations
```

---

## 15. SUCCESS METRICS & MONITORING

### 15.1 Key Performance Indicators
```typescript
interface SuccessMetrics {
  // Performance
  avgStemProcessingTime: number; // Target: <30s
  uiResponseTime: number;        // Target: <100ms
  appLoadTime: number;            // Target: <3s

  // Business
  trialToPayConversion: number;   // Target: >15%
  weeklyActiveUsers: number;      // Target: >40%
  avgSessionLength: number;       // Target: >20 min

  // Technical
  crashFreeRate: number;          // Target: >99.5%
  apiSuccessRate: number;         // Target: >99%
  cacheHitRate: number;           // Target: >80%
}
```

---

## APPENDIX A: QUICK START COMMANDS

```bash
# Clone and setup
git clone https://github.com/yourusername/riff_room_v2
cd riff_room_v2
./scripts/setup-dev.sh

# Development
pnpm dev                    # Start all services
pnpm dev:web               # Frontend only
pnpm dev:backend           # Backend only
pnpm test                  # Run tests
pnpm build                 # Production build

# Deployment
pnpm release:patch         # Bug fix release
pnpm release:minor         # Feature release
pnpm release:major         # Breaking change
```

---

## APPENDIX B: API REFERENCE

### REST Endpoints
```
POST   /api/process    # Process audio file
GET    /api/stems/:id  # Get stem URLs
GET    /api/sessions   # Get practice sessions
POST   /api/sessions   # Record session
GET    /api/streak     # Get current streak
```

### WebSocket Events
```
Client → Server:
├── process:start { fileId, quality }
└── process:cancel { fileId }

Server → Client:
├── process:progress { percent, status }
├── process:complete { stems }
└── process:error { message }
```

---

**END OF TECHNICAL IMPLEMENTATION PLAN**

*Status: Ready for Phase 1 Development*
*Estimated Timeline: 8 weeks to MVP, 16 weeks to market*
*Budget Required: $2,761 (Year 1)*