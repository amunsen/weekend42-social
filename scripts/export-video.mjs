import puppeteer from "puppeteer-core";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FRAME_DIR = path.join(ROOT, ".frames");
const OUT_DIR = path.join(ROOT, "out");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const HOLD_FRAMES = 15; // 0.5s hold at the end
const DEV_SERVER = "http://localhost:3000";

async function main() {
  // Prepare directories
  if (fs.existsSync(FRAME_DIR)) fs.rmSync(FRAME_DIR, { recursive: true });
  fs.mkdirSync(FRAME_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      "--no-sandbox",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
  });

  // Load export settings if available
  const settingsPath = path.join(ROOT, ".export-settings.json");
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    console.log("Injecting export settings:", JSON.stringify(settings).slice(0, 200));
    await page.evaluateOnNewDocument((s) => {
      window.__exportSettings = s;
    }, settings);
  }

  console.log("Loading page in export mode...");
  await page.goto(`${DEV_SERVER}?export`, { waitUntil: "networkidle2", timeout: 60000 });

  // Hide any injected badges (e.g. Netlify dev toolbar)
  await page.evaluate(() => {
    document.querySelectorAll('[data-netlify], [id*="netlify"], [class*="netlify"]').forEach(el => el.remove());
    const style = document.createElement("style");
    style.textContent = "iframe[src*='netlify'], [data-netlify-identity-widget], .netlify-identity-widget { display: none !important; }";
    document.head.appendChild(style);
  });

  // Wait for GSAP timeline to be exposed
  await page.waitForFunction(() => "__timeline" in window, { timeout: 10000 });

  // Get total timeline duration (including delay)
  const totalDuration = await page.evaluate(() => {
    const tl = /** @type {any} */ (window).__timeline;
    return tl.totalDuration();
  });

  const totalFrames = Math.ceil(totalDuration * FPS) + HOLD_FRAMES;
  console.log(
    `Animation: ${totalDuration.toFixed(2)}s | ${totalFrames} frames @ ${FPS}fps`
  );

  // Capture frames
  for (let i = 0; i < totalFrames; i++) {
    const time = Math.min(i / FPS, totalDuration);

    await page.evaluate((t) => {
      /** @type {any} */ (window).__timeline.totalTime(t);
    }, time);

    // Small wait for rendering to settle
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));

    const frameNum = String(i).padStart(4, "0");
    await page.screenshot({
      path: path.join(FRAME_DIR, `frame_${frameNum}.png`),
    });

    if (i % 10 === 0) {
      process.stdout.write(
        `\r  Capturing frame ${i + 1}/${totalFrames} (${((time / totalDuration) * 100).toFixed(0)}%)`
      );
    }
  }
  console.log("\n  Done capturing.");

  await browser.close();

  // Stitch with ffmpeg
  const outFile = path.join(OUT_DIR, "story.mp4");
  console.log("Encoding video with ffmpeg...");
  execSync(
    `ffmpeg -y -framerate ${FPS} -i "${FRAME_DIR}/frame_%04d.png" ` +
      `-c:v libx264 -pix_fmt yuv420p -preset slow -crf 18 ` +
      `"${outFile}"`,
    { stdio: "inherit" }
  );

  // Cleanup frames
  fs.rmSync(FRAME_DIR, { recursive: true });

  console.log(`\nExported: ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
