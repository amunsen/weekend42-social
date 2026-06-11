import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export async function GET() {
  const rootDir = process.cwd();
  const videoPath = path.join(rootDir, "out", "story.mp4");

  if (!fs.existsSync(videoPath)) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = fs.readFileSync(videoPath);

  // Cleanup after serving
  try { fs.unlinkSync(videoPath); } catch {}

  return new Response(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": "attachment; filename=story.mp4",
      "Content-Length": String(buffer.length),
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const rootDir = process.cwd();
  const settingsPath = path.join(rootDir, ".export-settings.json");

  // If imageSrc is a data URL, write it to a temp file
  let { imageSrc, ...rest } = body;
  if (imageSrc && imageSrc.startsWith("data:")) {
    const match = imageSrc.match(/^data:image\/(\w+);base64,(.+)$/);
    if (match) {
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const tmpPath = path.join(rootDir, "public", `tmp-export.${ext}`);
      fs.writeFileSync(tmpPath, Buffer.from(match[2], "base64"));
      imageSrc = `/tmp-export.${ext}`;
    }
  }

  // Write settings for Puppeteer to read
  fs.writeFileSync(settingsPath, JSON.stringify({ ...rest, imageSrc }));

  // Stream export script output back to the client
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      };

      const child = spawn("node", ["scripts/export-video.mjs"], {
        cwd: rootDir,
        stdio: "pipe",
      });

      child.stdout.on("data", (chunk) => {
        const text = chunk.toString().trim();
        if (text) send(text);
      });

      child.stderr.on("data", (chunk) => {
        const text = chunk.toString().trim();
        if (text) send(`[error] ${text}`);
      });

      child.on("close", (code) => {
        try { fs.unlinkSync(settingsPath); } catch {}
        if (code === 0) {
          send("[done]");
        } else {
          send(`[failed] Exit code ${code}`);
        }
        controller.close();
      });

      child.on("error", (err) => {
        send(`[failed] ${err.message}`);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
