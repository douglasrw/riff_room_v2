# Testing Guide

## Frontend Testing (Web Package)

### Setup

Install dependencies:
```bash
cd packages/web
pnpm install
```

### Unit Tests (Vitest)

Run all unit tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test -- --watch
```

Run tests with UI:
```bash
pnpm test:ui
```

Run tests with coverage:
```bash
pnpm test:coverage
```

Coverage reports are generated in `packages/web/coverage/`

### E2E Tests (Playwright)

Run E2E tests:
```bash
pnpm test:e2e
```

Run E2E tests with UI:
```bash
pnpm test:e2e:ui
```

### Test Structure

- Unit tests: `src/**/*.test.ts(x)` - Co-located with source files
- E2E tests: `tests/e2e/**/*.spec.ts`
- Test setup: `src/test/setup.ts` - Mocks for Web Audio API, WebSocket

### Writing Tests

Example unit test:
```typescript
import { describe, it, expect } from 'vitest';
import { useAudioStore } from './audioStore';

describe('audioStore', () => {
  it('should initialize with default state', () => {
    const state = useAudioStore.getState();
    expect(state.isPlaying).toBe(false);
  });
});
```

Example E2E test:
```typescript
import { test, expect } from '@playwright/test';

test('should load the app', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('RiffRoom');
});
```

## Backend Testing (Python)

### Setup

Install dev dependencies:
```bash
cd packages/backend
uv sync --group dev
```

### Running Tests

Run all tests:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=app --cov-report=html
```

Run specific test file:
```bash
pytest tests/test_cache_manager.py
```

Skip slow tests:
```bash
pytest -m "not slow"
```

### Test Structure

- Tests: `tests/test_*.py`
- Markers: `@pytest.mark.slow`, `@pytest.mark.integration`
- Async support: Automatic via pytest-asyncio

### Writing Tests

Example test:
```python
import pytest

def test_cache_manager_init(temp_cache_dir):
    manager = CacheManager(temp_cache_dir, max_size_mb=100)
    assert manager.cache_dir == temp_cache_dir
```

Example async test:
```python
@pytest.mark.asyncio
async def test_process_song(cache_manager):
    stems = await processor.process_song(audio_path)
    assert len(stems) == 4
```

## CI/CD Integration

Tests run automatically on GitHub Actions:
- `.github/workflows/ci.yml` - Lint, type-check, unit tests
- `.github/workflows/release.yml` - Full test suite before release

## Coverage Targets

- Frontend: Aim for 70%+ coverage on core logic
- Backend: Aim for 80%+ coverage on business logic
- E2E: Cover critical user flows (upload, playback, keyboard shortcuts)

## Common Issues

### Frontend

**Issue**: Tests fail with "AudioContext is not defined"
**Fix**: Ensure `src/test/setup.ts` is imported in vitest.config.ts

**Issue**: WebSocket tests timeout
**Fix**: Mock WebSocket in test setup

### Backend

**Issue**: Tests fail with module import errors
**Fix**: Ensure running from `packages/backend` directory and venv is activated

**Issue**: Async tests not running
**Fix**: Add `@pytest.mark.asyncio` decorator or set `asyncio_mode = "auto"` in pytest.ini

## Best Practices

1. **Keep tests fast** - Mock external dependencies (API calls, file I/O)
2. **Test behavior, not implementation** - Focus on inputs/outputs
3. **One assertion per test** - Makes failures easy to debug
4. **Use descriptive test names** - Should describe what's being tested
5. **Clean up resources** - Use fixtures and cleanup handlers
6. **Run tests before committing** - Catch issues early
