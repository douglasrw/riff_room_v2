# RiffRoom Deployment Guide

## Desktop Application Build & Packaging

### Overview

RiffRoom desktop app uses [electron-builder](https://www.electron.build/) for creating platform-specific installers.

### Supported Platforms

**macOS:**
-  DMG installer (98MB)
-  ZIP archive (95MB)
-   Code signing: Requires "Developer ID Application" certificate (currently unsigned)

**Windows:**
- =§ NSIS installer (configured, requires Windows build machine)
- =§ Portable executable (configured, requires Windows build machine)

**Linux:**
- =§ AppImage (configured, requires Docker for cross-compilation from macOS)
- =§ DEB package (configured, requires Docker for cross-compilation from macOS)

### Build Commands

#### Mac Build (from macOS)

```bash
cd packages/desktop
pnpm build              # Builds both DMG and ZIP
pnpm build -- --mac dmg # DMG only
pnpm build -- --mac zip # ZIP only
```

**Output:** `dist/RiffRoom-0.1.0.dmg` and `dist/RiffRoom-0.1.0-mac.zip`

#### Windows Build (from Windows)

```bash
cd packages/desktop
pnpm build -- --win nsis     # NSIS installer
pnpm build -- --win portable # Portable .exe
```

**Note:** Cross-compilation from macOS/Linux is not supported for Windows.

#### Linux Build (with Docker)

```bash
cd packages/desktop
pnpm build -- --linux AppImage # Requires Docker
pnpm build -- --linux deb      # Requires Docker
```

**Note:** Building Linux targets from macOS requires Docker. Install with: `brew install --cask docker`

### Build Configuration

Configuration is in `packages/desktop/package.json` under the `"build"` field:

```json
{
  "build": {
    "appId": "com.riffroom.app",
    "productName": "RiffRoom",
    "mac": {
      "category": "public.app-category.music",
      "target": ["dmg", "zip"]
    },
    "win": {
      "target": ["nsis", "portable"]
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "category": "Audio"
    }
  }
}
```

### Known Issues

#### 1. hdiutil Transient Failures (macOS DMG)

**Symptom:**
```
/ unable to execute hdiutil args=["resize"...]
hdiutil: resize: failed. Device not configured (6)
```

**Cause:** macOS disk image utility (`hdiutil`) occasionally fails when creating DMG files, especially if:
- Multiple disk images are mounted
- System is under heavy I/O load
- Temporary directory permissions are restricted

**Workaround:**
- Retry the build command
- Unmount existing disk images: `hdiutil detach "/Volumes/RiffRoom 0.1.0"`
- Use ZIP target instead: `pnpm build -- --mac zip`

#### 2. Code Signing (macOS)

**Symptom:**
```
" skipped macOS application code signing
  reason=cannot find valid "Developer ID Application" identity
```

**Impact:**
- App runs but shows "unidentified developer" warning
- macOS Gatekeeper may block launch on first run (user must right-click ’ Open)

**Solution:**
1. Join [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Create "Developer ID Application" certificate in Keychain Access
3. Configure in `package.json`:

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

#### 3. No Custom App Icon

**Symptom:**
```
" default Electron icon is used
  reason=application icon is not set
```

**Solution:**
1. Create icon files:
   - macOS: `assets/icon.icns` (512x512 PNG ’ ICNS)
   - Windows: `assets/icon.ico` (256x256 PNG ’ ICO)
   - Linux: `assets/icon.png` (512x512 PNG)

2. Tools:
   - macOS: `iconutil` (built-in) or [Image2Icon](https://img2icnsapp.com/)
   - Windows: [IcoFX](https://icofx.ro/) or online converters

### Backend Requirements

The desktop app requires the backend server running on `localhost:8007`.

**Start backend:**
```bash
./scripts/start-backend.sh
```

**Known backend issues:**
-   `demucs.api` import error: Backend code expects demucs 5.0+ API, but package includes 4.0.1
- Fix: Update demucs or use mocking (see `packages/backend/tests/conftest.py` for mock pattern)

### Release Process

#### Manual Release

1. **Build all platforms:**
   ```bash
   # macOS
   cd packages/desktop && pnpm build

   # Windows (from Windows machine)
   cd packages/desktop && pnpm build -- --win

   # Linux (with Docker)
   cd packages/desktop && pnpm build -- --linux
   ```

2. **Test installers:**
   - macOS: Mount DMG, drag to Applications, launch
   - Windows: Run NSIS installer, verify Start Menu entry
   - Linux: `chmod +x RiffRoom-*.AppImage && ./RiffRoom-*.AppImage`

3. **Upload to release platform:**
   - GitHub Releases
   - S3 bucket
   - CDN

#### Automated Release (GitHub Actions)

=§ Not yet implemented. Planned workflow:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  build-mac:
    runs-on: macos-latest
    # Build DMG/ZIP
  build-win:
    runs-on: windows-latest
    # Build NSIS/portable
  build-linux:
    runs-on: ubuntu-latest
    # Build AppImage/deb
  release:
    needs: [build-mac, build-win, build-linux]
    # Upload to GitHub Releases
```

### Auto-Update

=§ Not yet implemented. Planned using [electron-updater](https://www.electron.build/auto-update):

1. Configure update server in `package.json`:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "riffroom"
    }
  }
}
```

2. Add update check to main process (see bead `riff_room_v2-6v5`)

### Distribution Channels

**Direct Download:**
- Host DMG/NSIS/AppImage on website
- Provide SHA256 checksums for verification

**Mac App Store:**
- Requires Apple Developer Program
- Additional entitlements and sandboxing
- Review process: 1-2 weeks

**Microsoft Store:**
- Requires Microsoft Partner Center account
- MSIX packaging (electron-builder supports this)
- Review process: ~24 hours

**Linux Package Managers:**
- Flatpak: Universal format, recommended
- Snap: Ubuntu Software Center
- AUR: Arch User Repository (community-maintained)

### File Sizes

| Platform | Format | Size | Compressed |
|----------|--------|------|------------|
| macOS | DMG | 98MB | - |
| macOS | ZIP | 95MB | - |
| Windows | NSIS | ~90MB* | - |
| Windows | Portable | ~85MB* | - |
| Linux | AppImage | ~95MB* | - |
| Linux | DEB | ~90MB* | - |

*Estimated (not yet built)

### Security Considerations

1. **Code Signing:** Always sign releases to prevent malware warnings
2. **HTTPS Only:** Serve downloads over HTTPS to prevent MITM
3. **Checksum Verification:** Provide SHA256 for all downloads
4. **Auto-Update Security:** Use HTTPS for update manifests
5. **Electron Security:** Follow [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)

### Troubleshooting

**Build fails with "command not found: electron-builder"**
- Run: `pnpm install` in `packages/desktop`

**DMG creation hangs indefinitely**
- Kill build: `pkill -f electron-builder`
- Unmount images: `hdiutil detach /Volumes/RiffRoom*`
- Retry build

**App launches but backend connection fails**
- Verify backend running: `curl http://localhost:8007/health`
- Check VITE_API_URL in `packages/web/.env`

**Windows build fails on macOS**
- Expected - use Windows machine or GitHub Actions

**Linux build fails with "Docker not found"**
- Install Docker Desktop: `brew install --cask docker`
- Start Docker app before building

### References

- [electron-builder docs](https://www.electron.build/)
- [Electron app distribution](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
- [macOS code signing](https://developer.apple.com/support/code-signing/)
- [Windows code signing](https://docs.microsoft.com/en-us/windows/win32/seccrypto/signtool)
