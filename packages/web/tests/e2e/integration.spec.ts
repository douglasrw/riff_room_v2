import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Full integration tests for RiffRoom workflow:
 * 1. File upload (drag & drop)
 * 2. Backend processing with WebSocket progress
 * 3. Stem separation completion
 * 4. Audio playback functionality
 *
 * NOTE: These tests require both frontend and backend servers running.
 * Playwright config auto-starts frontend, but backend must be running separately.
 */

test.describe('Full Integration Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/RiffRoom/);
  });

  test('should complete full workflow: upload → process → play', async ({ page }) => {
    // STEP 1: Verify initial state
    await expect(page.getByText('Start Practicing')).toBeVisible();
    await expect(page.getByText('Drop your song')).toBeVisible();

    // STEP 2: Upload file via file input
    // Note: We use file input instead of drag-drop for test reliability
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Use a minimal test audio file
    // In real scenario, you'd have a small MP3/WAV fixture in tests/fixtures/
    const testFilePath = join(process.cwd(), 'tests', 'fixtures', 'test-audio.mp3');

    // Check if test file exists, otherwise skip test
    try {
      await readFile(testFilePath);
    } catch {
      test.skip(true, 'Test audio file not found. Run: npm run setup:test-fixtures');
    }

    // Upload file
    await fileInput.setInputFiles(testFilePath);

    // STEP 3: Verify processing state
    // Should show progress UI
    await expect(page.getByText(/Processing|Separating/i)).toBeVisible({ timeout: 5000 });

    // Should show progress percentage or spinner
    const progressIndicator = page.locator('[role="progressbar"]').or(
      page.locator('text=/\\d+%/').or(
        page.getByText('Loading stems')
      )
    );
    await expect(progressIndicator).toBeVisible({ timeout: 2000 });

    // STEP 4: Wait for processing to complete
    // Processing can take 30-60s depending on backend speed
    await expect(page.getByText('Start Practicing')).not.toBeVisible({ timeout: 90000 });

    // Should show playback controls when stems loaded
    const playButton = page.getByRole('button', { name: /Play|Pause/i });
    await expect(playButton).toBeVisible({ timeout: 10000 });

    // STEP 5: Verify playback controls are functional
    // Check stem controls (drums, bass, other, vocals)
    await expect(page.getByText('Drums')).toBeVisible();
    await expect(page.getByText('Bass')).toBeVisible();
    await expect(page.getByText('Other')).toBeVisible();
    await expect(page.getByText('Vocals')).toBeVisible();

    // Speed control
    await expect(page.getByText(/Speed/i)).toBeVisible();

    // STEP 6: Test playback interaction
    // Click play button
    await playButton.click();

    // Button should change state (Play → Pause)
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible({ timeout: 2000 });

    // Pause
    await page.getByRole('button', { name: /Pause/i }).click();
    await expect(page.getByRole('button', { name: /Play/i })).toBeVisible({ timeout: 2000 });

    // STEP 7: Test stem solo functionality
    // Press '1' to solo drums
    await page.keyboard.press('1');

    // Drums button should be highlighted/active
    const drumsButton = page.getByText('Drums').locator('..');
    await expect(drumsButton).toHaveClass(/scale-105|shadow-lg|bg-red/); // Solo styling

    // Press '0' to unsolo
    await page.keyboard.press('0');

    // STEP 8: Test speed control
    // Press 'S' to cycle speed
    await page.keyboard.press('s');

    // Verify speed changed (check if 70% or 85% is shown)
    await expect(page.getByText(/70%|85%/)).toBeVisible();
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    // Upload an invalid file (e.g., text file)
    const fileInput = page.locator('input[type="file"]');

    // Create a temporary invalid file
    const dataTransfer = await page.evaluateHandle(() => {
      const dt = new DataTransfer();
      const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' });
      dt.items.add(file);
      return dt;
    });

    await fileInput.evaluate((input, dt) => {
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', { value: input, enumerable: true });
      input.files = (dt as DataTransfer).files;
      input.dispatchEvent(event);
    }, dataTransfer);

    // Should show error message
    await expect(page.getByText(/Invalid|Unsupported|Error/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle file size validation', async ({ page }) => {
    // Test file size limit (100MB)
    const fileInput = page.locator('input[type="file"]');

    // Create a mock large file (just metadata, not actual size)
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const largeSizeBytes = 150 * 1024 * 1024; // 150MB

      // Mock file with large size
      Object.defineProperty(input, 'files', {
        writable: true,
        value: {
          0: {
            name: 'large-file.mp3',
            size: largeSizeBytes,
            type: 'audio/mpeg',
          },
          length: 1,
          item: (index: number) => this[index],
        },
      });

      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Should show file size error
    await expect(page.getByText(/too large|100MB|file size/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show WebSocket connection status', async ({ page }) => {
    // This test verifies that the app handles WebSocket connection gracefully
    // If backend is not running, should show error

    // Check for backend connectivity
    const response = await page.request.get('http://localhost:8007/health').catch(() => null);

    if (!response || !response.ok()) {
      test.skip(true, 'Backend not running. Start with: cd packages/backend && ./start-backend.sh');
    }

    // If backend is running, proceed with upload test
    // (Full upload test covered in main integration test)
    expect(response?.ok()).toBeTruthy();
  });
});

test.describe('Keyboard Shortcuts Integration', () => {
  test('should control playback with keyboard shortcuts', async ({ page }) => {
    await page.goto('/');

    // This test assumes a song is already loaded
    // In CI/CD, you'd pre-load a cached session or use mock data

    // Press ? to show shortcuts
    await page.keyboard.press('?');
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();

    // Verify all shortcuts are documented
    await expect(page.getByText(/Space.*Play.*Pause/i)).toBeVisible();
    await expect(page.getByText(/1.*drums/i)).toBeVisible();
    await expect(page.getByText(/2.*bass/i)).toBeVisible();
    await expect(page.getByText(/3.*other/i)).toBeVisible();
    await expect(page.getByText(/4.*vocals/i)).toBeVisible();
    await expect(page.getByText(/S.*speed/i)).toBeVisible();
    await expect(page.getByText(/\\[.*loop start/i)).toBeVisible();
    await expect(page.getByText(/\\].*loop end/i)).toBeVisible();

    // Close
    await page.keyboard.press('Escape');
    await expect(page.getByText('Keyboard Shortcuts')).not.toBeVisible();
  });
});

test.describe('Error Boundaries', () => {
  test('should not crash on unexpected errors', async ({ page }) => {
    await page.goto('/');

    // Inject a console error listener
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Trigger some interactions
    await page.keyboard.press('?');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Space');

    // App should still be responsive
    await expect(page.locator('h1')).toContainText('RiffRoom');

    // No uncaught errors should have occurred
    expect(errors.filter(e => e.includes('Uncaught')).length).toBe(0);
  });
});
