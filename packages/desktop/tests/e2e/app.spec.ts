import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import waitOn from 'wait-on';

let backendProcess: ChildProcess | null = null;

/**
 * E2E test for full drag-drop workflow:
 * Upload MP3 → Backend processing → WebSocket progress → Stems loaded → Playback
 */
test.describe('RiffRoom E2E - Full Workflow', () => {
  test.beforeAll(async () => {
    // Start backend server
    const backendPath = path.join(__dirname, '../../../../packages/backend');
    const startScript = path.join(backendPath, 'start-backend.sh');

    backendProcess = spawn(startScript, [], {
      cwd: backendPath,
      detached: false,
      stdio: 'pipe',
    });

    // Wait for backend to be ready
    await waitOn({
      resources: ['http://localhost:8007/health/live'],
      timeout: 30000,
    });
  });

  test.afterAll(async () => {
    // Kill backend server
    if (backendProcess) {
      backendProcess.kill('SIGTERM');
      // Give it time to shutdown gracefully
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  });

  test('drag MP3 → process → load stems → playback', async () => {
    // Launch Electron app in production mode (uses built web files)
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    // Get main window
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Wait for React to render
    await window.waitForSelector('h1:has-text("RiffRoom")', { timeout: 10000 });

    // Verify drag-drop zone is visible
    const dragZone = window.locator('[data-testid="drag-drop-zone"]').first();
    await expect(dragZone).toBeVisible({ timeout: 5000 });

    // Simulate file upload (Playwright's setInputFiles for file input)
    const testAudioPath = path.join(__dirname, 'fixtures/test-audio.mp3');

    // Find file input (hidden) and upload file
    const fileInput = window.locator('input[type="file"]');
    await fileInput.setInputFiles(testAudioPath);

    // Wait for processing to start
    // Should see progress indicator or status message
    await window.waitForSelector('[data-testid="processing-status"]', {
      timeout: 5000,
      state: 'visible',
    });

    // Wait for processing to complete (up to 45s for ML model)
    // Should see waveform display when stems are loaded
    await window.waitForSelector('[data-testid="waveform-display"]', {
      timeout: 45000,
      state: 'visible',
    });

    // Verify playback controls are visible
    const playButton = window.locator('[data-testid="play-button"]');
    await expect(playButton).toBeVisible();

    // Verify stems are loaded
    // Check for stem mixer controls (bass, drums, vocals, other)
    const bassControl = window.locator('[data-testid="stem-control-bass"]');
    const drumsControl = window.locator('[data-testid="stem-control-drums"]');
    const vocalsControl = window.locator('[data-testid="stem-control-vocals"]');
    const otherControl = window.locator('[data-testid="stem-control-other"]');

    await expect(bassControl).toBeVisible();
    await expect(drumsControl).toBeVisible();
    await expect(vocalsControl).toBeVisible();
    await expect(otherControl).toBeVisible();

    // Test playback
    await playButton.click();

    // Wait a moment for playback to start
    await window.waitForTimeout(500);

    // Verify play button changed to pause button
    const pauseButton = window.locator('[data-testid="pause-button"]');
    await expect(pauseButton).toBeVisible();

    // Pause playback
    await pauseButton.click();

    // Wait a moment
    await window.waitForTimeout(200);

    // Verify back to play button
    await expect(playButton).toBeVisible();

    // Close app
    await electronApp.close();
  });

  test('handles invalid file gracefully', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForSelector('h1:has-text("RiffRoom")');

    // Try to upload a non-audio file (this test file itself)
    const invalidFilePath = __filename;
    const fileInput = window.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidFilePath);

    // Should show error message
    const errorMessage = window.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/invalid|unsupported|error/i);

    await electronApp.close();
  });
});
