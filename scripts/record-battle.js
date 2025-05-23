import puppeteer from 'puppeteer';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RECORD_DURATION = 600; // 10 minutes max
const VIEWPORT_WIDTH = 1920;
const VIEWPORT_HEIGHT = 1080;

async function ensureOutputDirectory() {
  const outputDir = join(__dirname, '../recordings');
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir);
  }
  return outputDir;
}

async function recordBattle() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = await ensureOutputDirectory();
  const outputPath = join(outputDir, `dotgame-${timestamp}.mp4`);

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--window-size=${VIEWPORT_WIDTH},${VIEWPORT_HEIGHT}`,
      '--start-maximized'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ 
      width: VIEWPORT_WIDTH, 
      height: VIEWPORT_HEIGHT 
    });

    console.log('Navigating to The Dot Games...');
    await page.goto('http://localhost:5173');
    
    // Wait for the battle arena to be visible
    await page.waitForSelector('#arena-container', { timeout: 10000 });
    
    // Click the start button if available
    try {
      await page.click('button:has-text("Start Simulation")');
    } catch (e) {
      console.log('Start button not found - battle may already be in progress');
    }

    console.log('Starting screen recording...');
    
    // Determine OS-specific FFmpeg command
    const isWindows = process.platform === 'win32';
    const ffmpegCmd = isWindows
      ? `ffmpeg -y -f gdigrab -framerate 30 -video_size ${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT} -i desktop -t ${RECORD_DURATION} "${outputPath}"`
      : `ffmpeg -y -f x11grab -framerate 30 -video_size ${VIEWPORT_WIDTH}x${VIEWPORT_HEIGHT} -i :0.0 -t ${RECORD_DURATION} "${outputPath}"`;

    return new Promise((resolve, reject) => {
      const recording = exec(ffmpegCmd);

      recording.stdout?.on('data', data => {
        console.log(`FFmpeg: ${data}`);
      });

      recording.stderr?.on('data', data => {
        console.error(`FFmpeg Error: ${data}`);
      });

      recording.on('close', async (code) => {
        await browser.close();
        if (code === 0) {
          console.log(`Recording saved successfully: ${outputPath}`);
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      // Set a timeout to force stop after RECORD_DURATION
      setTimeout(async () => {
        await browser.close();
        recording.kill();
      }, RECORD_DURATION * 1000 + 5000); // Add 5 seconds buffer
    });
  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Start recording
recordBattle()
  .then(outputPath => {
    console.log('Battle recording completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error recording battle:', error);
    process.exit(1);
  });