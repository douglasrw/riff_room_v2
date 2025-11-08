# GitHub Actions Workflows

Automated CI/CD pipelines for RiffRoom.

## Workflows

### 1. CI (`ci.yml`)

**Trigger:** Push to main/develop/doug/**, Pull Requests

**Jobs:**

#### Lint
- ESLint for TypeScript/React
- TypeScript type checking
- Runs on: ubuntu-latest

#### Python Lint
- Ruff linting (fast Python linter)
- Pyright type checking
- Runs on: ubuntu-latest

#### Test
- **Frontend tests**: Vitest unit tests
- **Backend tests**: Pytest with coverage
- **Health check**: Validates backend can start and /health/ready returns 200
- Runs on: ubuntu-latest
- Requires: lint, python-lint jobs to pass

#### Build
- Build web (Vite production build)
- Build desktop (Electron)
- Upload build artifacts (retained for 7 days)
- Runs on: ubuntu-latest
- Requires: test job to pass

**Caching:**
- pnpm store (dependencies)
- pip cache (Python dependencies)

**Duration:** ~5-8 minutes

---

### 2. E2E Tests (`e2e.yml`)

**Trigger:**
- Push to main
- Pull Requests to main
- Manual trigger (workflow_dispatch)
- Nightly at 2 AM UTC

**Jobs:**

#### E2E Tests (Matrix)
Runs E2E integration tests across 3 browsers in parallel:
- Chromium
- Firefox
- WebKit (Safari engine)

**Steps:**
1. Setup Node.js 20 + Python 3.12
2. Install dependencies (pnpm + uv)
3. Install Playwright browsers
4. Generate test fixtures (3-second test audio)
5. Start backend server
6. Wait for health check (/health/ready)
7. Run Playwright tests
8. Upload test results and traces

**Artifacts:**
- Test reports (playwright-report/)
- Screenshots on failure
- Traces on failure (for debugging)
- Retained for 7 days

**Duration:** ~10-15 minutes per browser (30-45 min total parallel)

**Timeout:** 20 minutes per browser

---

### 3. Release (`release.yml`)

**Trigger:** Git tags matching `v*` (e.g., v1.0.0)

**Permissions:** `contents: write` (to create GitHub releases)

**Jobs:**

#### Build Release (Matrix)
Builds desktop apps for all platforms in parallel:
- **macOS**: DMG installer (code-signed if secrets provided)
- **Windows**: NSIS installer (code-signed if secrets provided)
- **Linux**: AppImage + DEB package

**Platform-specific builds:**
- macOS: `pnpm build:mac`
- Windows: `pnpm build:win`
- Linux: `pnpm build:linux`

**Artifacts:**
- DMG files (macOS)
- EXE installers (Windows)
- AppImage + DEB (Linux)

#### Create GitHub Release
- Downloads all platform artifacts
- Creates GitHub release from tag
- Attaches binaries to release
- Auto-generates release notes from commits

**Required Secrets (for code signing):**
- `APPLE_ID` - Apple Developer account email
- `APPLE_ID_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Apple Developer Team ID
- `WIN_CSC_LINK` - Windows code signing certificate (base64)
- `WIN_CSC_KEY_PASSWORD` - Certificate password

**Duration:** ~20-30 minutes (parallel builds)

---

### 4. Security Scan (`security-scan.yml`)

**Trigger:**
- Push to main
- Pull Requests to main
- Weekly schedule (Mondays 9 AM UTC)

**Jobs:**

#### NPM Audit
- Scans JavaScript/TypeScript dependencies for vulnerabilities
- Runs audit-level=high for web and desktop packages
- Uploads audit results as artifacts

#### Python Security
- Runs safety check on Python dependencies
- Auto-installs safety if not present
- Uploads safety results as artifacts

#### CodeQL Analysis
- Static code analysis for JavaScript and Python
- Scans for security vulnerabilities and code quality issues
- Uses GitHub's security-and-quality queries
- Results appear in Security tab

**Artifacts:**
- NPM audit reports (JSON)
- Python safety reports (JSON)
- Retained for 30 days

**Duration:** ~5-10 minutes

---

## Running Workflows Locally

### CI Checks
```bash
# Lint
pnpm lint
pnpm type-check

# Backend lint
cd packages/backend
uv run ruff check app/
uv run pyright app/

# Tests
pnpm test                     # Web tests
cd packages/backend && pytest  # Backend tests

# Health check
cd packages/backend
./start-backend.sh
curl http://localhost:8007/health/ready
```

### E2E Tests
```bash
# Start backend
cd packages/backend
./start-backend.sh

# In another terminal
cd packages/web
npm run test:e2e            # All browsers
npm run test:e2e:headed     # See browser
```

### Release Build
```bash
# macOS
cd packages/desktop
pnpm build:mac

# Windows (on Windows machine)
pnpm build:win

# Linux
pnpm build:linux
```

---

## Workflow Status Badges

Add to README.md:

```markdown
[![CI](https://github.com/douglasrw/riff_room_v2/actions/workflows/ci.yml/badge.svg)](https://github.com/douglasrw/riff_room_v2/actions/workflows/ci.yml)
[![E2E Tests](https://github.com/douglasrw/riff_room_v2/actions/workflows/e2e.yml/badge.svg)](https://github.com/douglasrw/riff_room_v2/actions/workflows/e2e.yml)
[![Security Scan](https://github.com/douglasrw/riff_room_v2/actions/workflows/security-scan.yml/badge.svg)](https://github.com/douglasrw/riff_room_v2/actions/workflows/security-scan.yml)
[![Release](https://github.com/douglasrw/riff_room_v2/actions/workflows/release.yml/badge.svg)](https://github.com/douglasrw/riff_room_v2/actions/workflows/release.yml)
```

---

## Troubleshooting

### CI Failures

**Lint errors:**
- Run `pnpm lint --fix` locally
- Check `pnpm type-check` output

**Test failures:**
- Review test logs in GitHub Actions
- Run tests locally: `pnpm test`
- Check backend logs if integration tests fail

**Health check timeout:**
- Verify backend starts correctly
- Check for missing dependencies
- Review backend logs in CI output

### E2E Test Failures

**Backend not ready:**
- Increase wait timeout in workflow (currently 30 attempts × 2s)
- Check backend logs for startup errors

**Playwright errors:**
- View uploaded traces: Actions → E2E Tests → Artifacts → playwright-traces
- Download and view: `npx playwright show-trace trace.zip`

**Timeout errors:**
- Processing can take 10-15s for test audio
- Increase timeout if needed (currently 90s for processing)

### Release Failures

**Code signing:**
- Verify secrets are set correctly in repo settings
- For macOS: App-specific password (not Apple ID password)
- For Windows: Certificate must be base64 encoded

**Build errors:**
- Check electron-builder configuration
- Verify Python 3.12 is available
- Test build locally before tagging

---

## Best Practices

### Pull Requests
1. **Always** wait for CI to pass before merging
2. Review test coverage in CI output
3. Check E2E test results if workflow ran

### Releases
1. **Test locally** before creating release tag
2. **Use semantic versioning**: v1.0.0, v1.1.0, v2.0.0
3. **Review auto-generated release notes** before publishing
4. **Test installers** on each platform after release

### Debugging
1. **Use workflow_dispatch** for manual E2E test runs
2. **Download artifacts** (logs, traces, screenshots)
3. **Check specific job logs** in GitHub Actions UI
4. **Run workflows locally** using [act](https://github.com/nektos/act)

---

## Monitoring

### GitHub Actions Usage

View workflow runs:
```
https://github.com/douglasrw/riff_room_v2/actions
```

Filter by:
- Workflow (CI, E2E, Release)
- Branch
- Status (success, failure, in progress)

### Performance Metrics

**Typical durations:**
- CI: 5-8 minutes
- E2E (all browsers): 30-45 minutes
- Release (all platforms): 20-30 minutes

**Monthly quota:**
- Free tier: 2,000 minutes/month
- Estimated usage: ~3,000 minutes/month (with E2E nightly)
- Consider: Disable nightly E2E or reduce frequency

---

## Future Improvements

Potential enhancements:
- [x] Add security scanning (CodeQL, npm audit, safety)
- [ ] Add dependency update automation (Dependabot, Renovate)
- [ ] Add performance benchmarking workflow
- [ ] Add Docker image builds
- [ ] Add deployment workflows (staging, production)
- [ ] Add changelog generation
- [ ] Add automatic version bumping
- [ ] Add Slack/Discord notifications for releases
