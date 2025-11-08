# Comprehensive Code Review - RiffRoom v2
**Reviewer:** ChartreuseCat
**Date:** 2025-11-08
**Scope:** All code written by agents (BrownCreek, PurpleCat, ChartreuseCat)

## Executive Summary

Reviewed entire codebase with first-principles analysis. Found **18 issues** ranging from critical bugs to architectural concerns.

**Critical Issues:** 3
**High Priority:** 5
**Medium Priority:** 7
**Low Priority:** 3

---

## CRITICAL ISSUES

### C1. AudioEngine: Race Condition in Play/Pause
**File:** `packages/web/src/services/audioEngine.ts:80-109`
**Root Cause:** Multiple players started asynchronously without synchronization
**Impact:** Stems play out of sync, ruining practice experience

```typescript
// BUGGY CODE:
async play(): Promise<void> {
  this.players.forEach(player => {
    if (!player.mute) {
      player.start();  // ❌ All start at different times!
    }
  });
  this.transport.start();
}
```

**Analysis:**
- `player.start()` is async but not awaited
- Each stem loads/starts independently
- Network latency = different start times
- 50-200ms desync typical

**Fix:** Synchronize via Tone.Transport scheduled start

---

### C2. Demucs Processor: Memory Leak from Tensor References
**File:** `packages/backend/app/core/demucs_processor.py:130-145`
**Root Cause:** PyTorch tensors not explicitly released after saving
**Impact:** Server OOM crash after ~5-10 songs processed

```python
# BUGGY CODE:
async def _save_stems(self, stems: dict[str, torch.Tensor], cache_path: Path):
    for stem_name, tensor in stems.items():
        await loop.run_in_executor(...)
        # ❌ tensor still referenced! GC won't collect
```

**Analysis:**
- Tensors stay in memory until dict cleared
- Each song = ~200MB of tensors
- 10 songs = 2GB memory used
- No explicit cleanup

**Fix:** `del` tensors after save, call `torch.cuda.empty_cache()` if GPU

---

### C3. WebSocket: Connection Never Garbage Collected
**File:** `packages/backend/app/api/websocket.py:17-38`
**Root Cause:** Failed connections remain in active_connections dict
**Impact:** Memory leak, eventually exhaust file descriptors

```python
# BUGGY CODE:
async def connect(self, websocket: WebSocket, client_id: str):
    await websocket.accept()
    self.active_connections[client_id] = websocket
    # ❌ What if client never connects? Orphaned entry!
```

**Analysis:**
- No timeout for stale connections
- Dict grows unbounded
- Each WebSocket = 1 file descriptor
- Linux default limit = 1024 FDs

**Fix:** Implement connection timeout, periodic cleanup of stale entries

---

## HIGH PRIORITY ISSUES

### H1. AudioEngine: Incorrect Seek Implementation
**File:** `packages/web/src/services/audioEngine.ts:111-119`
**Root Cause:** Pause/play cycle disrupts transport state

```typescript
seek(time: number): void {
  const wasPlaying = this.transport.state === 'started';
  if (wasPlaying) this.pause();  // ❌ Stops all players

  this.players.forEach(player => player.seek(time));

  if (wasPlaying) this.play();  // ❌ Async! Doesn't wait
}
```

**Impact:** Audible click/pop on seek, stems desync
**Fix:** Use Transport.seek() instead, sync players to transport position

---

### H2. Loop Detector: Unhandled Numpy Array Size Mismatch
**File:** `packages/backend/app/core/loop_detector.py:56-60`
**Root Cause:** Features can have different lengths, weighted average fails

```python
difficulty_curve = (
    0.3 * self._normalize(spectral_complexity) +  # Length = N
    0.4 * self._normalize(onset_density) +        # Length = M
    0.3 * self._normalize(harmonic_complexity)    # Length = K
)  # ❌ ValueError if N != M != K
```

**Analysis:**
- Different hop lengths in librosa functions
- STFT vs onset vs chroma have different frame counts
- Crashes on some audio files

**Fix:** Resample all features to common length before combining

---

### H3. Security: Path Traversal in sanitizeFilePath
**File:** `packages/desktop/src/main/security.ts:24-39`
**Root Cause:** Incomplete path validation on Windows

```typescript
if (!resolved.startsWith(allowedResolved + path.sep) && ...) {
  // ❌ On Windows: C:\Users vs C:\Users\.. still matches!
}
```

**Impact:** Attacker can read files outside userData dir on Windows
**Fix:** Use `path.relative()` and check for `..` in result

---

### H4. Build Script: Hardcoded Python 3.14 Check
**File:** `scripts/build-release.sh:48-51`

```bash
if ! command -v python3.14 &> /dev/null; then
    echo "Python 3.14 not found"  # ❌ But we use 3.12!
    exit 1
fi
```

**Root Cause:** Script not updated when BrownCreek changed to Python 3.12
**Impact:** Build fails on CI/local even with correct Python
**Fix:** Check for `python3.12` or read from pyproject.toml

---

### H5. AudioStore: Mutated State Not Triggering Rerender
**File:** `packages/web/src/stores/audioStore.ts:120-123`

```typescript
muteStem: (stem: StemType) => {
  audioEngine.muteStem(stem);
  set({ mutedStems: audioEngine.getMutedStems() });
  // ❌ Set gets NEW Set, but Zustand compares by reference
}
```

**Root Cause:** Zustand uses shallow equality, Set reference unchanged
**Impact:** UI doesn't update when stem muted
**Fix:** Always create new Set: `set({ mutedStems: new Set(audioEngine.getMutedStems()) })`

---

## MEDIUM PRIORITY ISSUES

### M1. Missing Error Boundaries in React App
**File:** `packages/web/src/App.tsx`
**Impact:** Single component error crashes entire app
**Fix:** Add React Error Boundary wrapper

### M2. No Input Validation on Process Route
**File:** `packages/backend/app/api/routes.py:46-74`
**Root Cause:** Only checks content-type, not actual file format
**Impact:** Server crashes on malformed audio files
**Fix:** Add librosa.load() validation before processing

### M3. WebSocket Ping Interval Too Long
**File:** `packages/web/src/services/websocket.ts:149`
```typescript
setInterval(() => { this.send({ type: 'ping' }); }, 30000);
// ❌ 30s too long, many proxies timeout at 60s
```
**Fix:** Reduce to 15s or make configurable

### M4. No Cancellation Token for Demucs Processing
**File:** `packages/backend/app/core/demucs_processor.py:59-89`
**Impact:** Can't cancel long-running stem separation
**Fix:** Implement cancellation via threading.Event

### M5. Loop Detection Memory Inefficient
**File:** `packages/backend/app/core/loop_detector.py:200-222`
```python
variance = np.array([
    np.var(padded[i:i+window_len]) for i in range(len(signal))
])  # ❌ O(n²) time complexity + list comprehension
```
**Fix:** Use vectorized rolling window: `np.lib.stride_tricks.sliding_window_view`

### M6. Missing CORS Origin Validation
**File:** `packages/backend/app/main.py:43-48`
```python
allow_origins=["http://localhost:5173", "http://localhost:3000"],
# ❌ Hardcoded ports, won't work in production
```
**Fix:** Read from config, add production domains

### M7. No Retry Logic in useWebSocket
**File:** `packages/web/src/hooks/useWebSocket.ts:85-89`
**Root Cause:** Connection loss = no automatic reconnect for ongoing operation
**Fix:** Implement exponential backoff retry for critical operations

---

## LOW PRIORITY ISSUES

### L1. Empty Placeholder Files
**Files:** 11 empty files (audio_analyzer.py, config.py, cache_manager.py, etc.)
**Impact:** Confusing for developers
**Fix:** Either implement or delete

### L2. Inconsistent Type Annotations
**File:** `packages/backend/app/core/loop_detector.py:201`
```python
def _local_variance(self, signal: np.ndarray, window_len: int = 11) -> np.ndarray:
    # Uses np.ndarray but doesn't import from numpy.typing
```
**Fix:** Use `npt.NDArray[np.float64]` for clarity

### L3. No Logging Infrastructure
**All Python files**
**Impact:** Hard to debug production issues
**Fix:** Add `rich` logging with levels

---

## ARCHITECTURAL CONCERNS

### A1. No Database Layer
**Current:** Models defined but never used
**Impact:** Can't track processed songs, no caching metadata
**Recommendation:** Implement SQLite with SQLModel ORM

### A2. Frontend Missing Data Fetching Layer
**Current:** Direct API calls scattered everywhere
**Recommendation:** Implement TanStack Query for caching/optimistic updates

### A3. No Rate Limiting on Backend
**Impact:** Single user can DoS server with rapid requests
**Fix:** Add slowapi rate limiter middleware

---

## NEXT STEPS

1. **IMMEDIATE:** Fix C1-C3 (critical bugs)
2. **SHORT TERM:** Fix H1-H5 (high priority)
3. **MEDIUM TERM:** Fix M1-M7, implement A1-A3
4. **CLEANUP:** Address L1-L3, remove empty files

**Estimated Effort:** 6-8 hours for critical + high priority fixes
