# CI/CD Documentation

## Overview

RiffRoom uses GitHub Actions for automated testing, security auditing, and releases.

## Workflows

### CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main`, `develop`, `doug/**` branches
- Pull requests to `main`, `develop`

**Jobs:**

1. **Lint** (parallel)
   - TypeScript linting (`pnpm lint`)
   - Type checking (`pnpm type-check`)

2. **Python Lint** (parallel)
   - Ruff linting with GitHub annotations
   - Pyright type checking

3. **Security Audit** (parallel)
   - npm production dependency audit (high/critical only)
   - Fails build on high/critical vulnerabilities

4. **Test** (runs after lint, python-lint, security pass)
   - Web unit tests (Vitest)
   - Backend tests with coverage (pytest)
   - Backend health check integration test
   - Uploads HTML coverage reports (7-day retention)

5. **Build** (runs after test passes)
   - Web production build
   - Desktop production build
   - Uploads artifacts (7-day retention)

**Caching:**
- pnpm store cached by lock file hash
- Python pip cache enabled

### Release Pipeline (`.github/workflows/release.yml`)

**Triggers:**
- Git tags matching `v*` pattern (e.g., `v1.0.0`)

**Jobs:**

1. **Build Release** (matrix: macOS, Windows, Linux)
   - Builds Electron app for all platforms
   - Code signing (requires secrets)
   - Uploads platform-specific installers

2. **Create GitHub Release**
   - Downloads all platform artifacts
   - Creates GitHub release with auto-generated notes
   - Attaches installers (.dmg, .exe, .AppImage, .deb)

**Required Secrets:**
- `APPLE_ID`, `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID` (macOS signing)
- `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD` (Windows signing)

## Security

**Dependency Auditing:**
- Production dependencies audited on every CI run
- Build fails on high/critical vulnerabilities
- Current status: 0 production vulnerabilities

**Security Checklist (from audit):**
- [x] Zero production vulnerabilities
- [x] File upload validation (magic bytes)
- [x] SQL injection prevention (SQLModel)
- [x] CORS configuration
- [x] Path traversal prevention
- [x] File size limits (100MB)
- [ ] Rate limiting (planned for production)
- [ ] Security headers (planned)

## Local Testing

**Run CI checks locally:**
```bash
# Lint
pnpm lint && pnpm type-check

# Python lint
cd packages/backend
uv run ruff check app/
uv run pyright app/

# Security audit
pnpm audit --prod --audit-level=high

# Tests
cd packages/web && pnpm test
cd packages/backend && uv run pytest -v --cov=app

# Health check
./scripts/start-backend.sh
curl http://localhost:8007/health/ready
```

## Troubleshooting

**Build Failures:**
1. Check dependency audit output
2. Review test failures in job logs
3. Check coverage reports in artifacts

**Release Failures:**
- Verify all required secrets are set
- Check platform-specific build logs
- Ensure tag follows `v*` pattern

## Maintenance

**Dependencies:**
- Update `actions/*` versions quarterly
- Pin critical Python deps (torch, numpy)
- Monitor security advisories

**Coverage Goals:**
- Backend: >80% (current: monitored)
- Frontend: >70% (current: monitored)
