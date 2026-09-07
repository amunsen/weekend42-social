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

  // Data URLs are written to temp files in /public so Puppeteer can load them
  const materialize = (src: unknown, name: string): unknown => {
    if (typeof src !== "string" || !src.startsWith("data:")) return src;
    const match = src.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return src;
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    fs.writeFileSync(path.join(rootDir, "public", `${name}.${ext}`), Buffer.from(match[2], "base64"));
    return `/${name}.${ext}`;
  };
  const settings = {
    ...body,
    imageSrc: materialize(body.imageSrc, "tmp-export"),
    image2Src: materialize(body.image2Src, "tmp-export-2"),
  };

  // Write settings for Puppeteer to read
  fs.writeFileSync(settingsPath, JSON.stringify(settings));

  // Stream export script output back to the client
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (msg: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`));
      };

      const scriptPath = [rootDir, "scripts", "export-video.mjs"].join(path.sep);
      const child = spawn(process.execPath, [scriptPath], {
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
