import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vite = path.join(root, "node_modules", "vite", "bin", "vite.js");
const origin = "http://127.0.0.1:4173";
const paths = ["/", "/demo", "/manifest.webmanifest", "/sw.js"];

const server = spawn(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", "4173"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"]
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error("Production preview did not become ready.");
}

try {
  await Promise.race([
    waitForServer(),
    once(server, "exit").then(([code]) => {
      throw new Error(`Production preview exited early with code ${code}.`);
    })
  ]);
  for (const route of paths) {
    const response = await fetch(`${origin}${route}`);
    if (!response.ok) throw new Error(`${route} returned HTTP ${response.status}.`);
    console.log(`${route} -> ${response.status}`);
  }
  console.log("Production smoke check passed.");
} finally {
  server.kill("SIGTERM");
}
