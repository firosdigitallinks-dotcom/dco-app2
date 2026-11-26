import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import next from "next";

const require_ = createRequire(import.meta.url);

function log(msg) {
  try {
    fs.appendFileSync("debug.log", `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}

const originalConsoleError = console.error;
console.error = function (...args) {
  log(`[CONSOLE_ERROR] ${args.map((a) => (a && a.stack ? a.stack : typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")}`);
  originalConsoleError.apply(console, args);
};

const originalConsoleWarn = console.warn;
console.warn = function (...args) {
  log(`[CONSOLE_WARN] ${args.map((a) => (a && a.stack ? a.stack : typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")}`);
  originalConsoleWarn.apply(console, args);
};

process.on("uncaughtException", (err) => {
  log(`[UNCAUGHT_EXCEPTION] ${err?.stack || err}`);
});

process.on("unhandledRejection", (err) => {
  log(`[UNHANDLED_REJECTION] ${err?.stack || err}`);
});

log("app.js booting...");

// Automatically load production environment variables if present
for (const file of [".env.production", ".env"]) {
  if (fs.existsSync(file)) {
    try {
      if (typeof process.loadEnvFile === "function") {
        process.loadEnvFile(file);
      } else {
        const content = fs.readFileSync(file, "utf8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const idx = trimmed.indexOf("=");
          if (idx > 0) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
    } catch {}
  }
}

const defaultPreview = {
  previewModeId: "96ce9ee8b87cd46d9b263b7faeb842d2",
  previewModeSigningKey: "e078bf5f8087ef793e2a2e8156db2044d037483465da526bb76f4b42b1d29ef2",
  previewModeEncryptionKey: "521cea14542309f6e0f61ba9bff4efe69d5f58c82bbbba53b5238d0f79a61edc",
};

// Ensure .next/server/preview-props.json exists and has valid previewModeId
try {
  const previewPropsPath = path.join(process.cwd(), ".next", "server", "preview-props.json");
  let valid = false;
  if (fs.existsSync(previewPropsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(previewPropsPath, "utf8"));
      if (data && data.previewModeId) valid = true;
    } catch {}
  }
  if (!valid) {
    fs.mkdirSync(path.dirname(previewPropsPath), { recursive: true });
    fs.writeFileSync(previewPropsPath, JSON.stringify(defaultPreview, null, 2));
    log("Wrote valid preview-props.json");
  }
} catch (e) {
  log(`Failed to write preview-props.json: ${e}`);
}

// Ensure .next/prerender-manifest.json always has valid preview object
try {
  const prerenderPath = path.join(process.cwd(), ".next", "prerender-manifest.json");
  let pm = {};
  if (fs.existsSync(prerenderPath)) {
    try {
      pm = JSON.parse(fs.readFileSync(prerenderPath, "utf8"));
    } catch {}
  }
  if (!pm.preview || !pm.preview.previewModeId) {
    pm.version = pm.version || 4;
    pm.routes = pm.routes || {};
    pm.dynamicRoutes = pm.dynamicRoutes || {};
    pm.notFoundRoutes = pm.notFoundRoutes || [];
    pm.preview = defaultPreview;
    fs.writeFileSync(prerenderPath, JSON.stringify(pm, null, 2));
    log("Injected valid preview into prerender-manifest.json");
  }
} catch (e) {
  log(`Failed to fix prerender-manifest.json: ${e}`);
}

// Self-heal Next.js 16.4.x runtime app-page.runtime.prod.js if present to ensure previewProps is never undefined
try {
  const nextRuntimePath = path.join(
    path.dirname(require_.resolve("next/package.json")),
    "dist",
    "compiled",
    "next-server",
    "app-page.runtime.prod.js",
  );
  if (fs.existsSync(nextRuntimePath)) {
    let content = fs.readFileSync(nextRuntimePath, "utf8");
    let changed = false;
    if (content.includes("this.previewProps=o,") && !content.includes("this.previewProps=o||")) {
      content = content.replace("this.previewProps=o,", `this.previewProps=o||${JSON.stringify(defaultPreview)},`);
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(nextRuntimePath, content);
      log("Patched next-server app-page.runtime.prod.js with default previewProps fallback");
    }
  }
} catch (e) {
  log(`Note on runtime patch: ${e?.message || e}`);
}

// Auto-clean any legacy /diamondcapitaloasis redirects from compiled Next.js manifests on disk
try {
  const routesManifestPath = path.join(process.cwd(), ".next", "routes-manifest.json");
  if (fs.existsSync(routesManifestPath)) {
    const raw = fs.readFileSync(routesManifestPath, "utf8");
    if (raw.includes("diamondcapitaloasis")) {
      const manifest = JSON.parse(raw);
      manifest.basePath = "";
      if (Array.isArray(manifest.redirects)) {
        manifest.redirects = manifest.redirects.filter(
          (r) =>
            !r.destination?.includes("diamondcapitaloasis") &&
            !r.source?.includes("diamondcapitaloasis"),
        );
      }
      fs.writeFileSync(routesManifestPath, JSON.stringify(manifest, null, 2));
      log("Auto-cleaned legacy /diamondcapitaloasis redirects from routes-manifest.json");
    }
  }

  const reqFilesPath = path.join(process.cwd(), ".next", "required-server-files.json");
  if (fs.existsSync(reqFilesPath)) {
    const raw = fs.readFileSync(reqFilesPath, "utf8");
    if (raw.includes("diamondcapitaloasis")) {
      const parsed = JSON.parse(raw);
      if (parsed.config) {
        parsed.config.basePath = "";
      }
      fs.writeFileSync(reqFilesPath, JSON.stringify(parsed, null, 2));
      log("Auto-cleaned legacy basePath from required-server-files.json");
    }
  }
} catch (e) {
  log(`Failed to auto-clean manifests: ${e}`);
}

const rawPort = process.env.PORT;
const isNumericPort = rawPort && !isNaN(Number(rawPort));
const port = isNumericPort ? Number(rawPort) : 3000;
const hostname = process.env.HOST || "0.0.0.0";
const basePath = (
  process.env.NEXT_PUBLIC_BASE_PATH !== undefined
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : (process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : "")
).replace(/\/$/, "");

const dev = false;
const application = next({ dev, hostname, port });
const handle = application.getRequestHandler();

let isReady = false;
let startupError = null;

const server = createServer((req, res) => {
  const origWriteHead = res.writeHead;
  res.writeHead = function (code, ...rest) {
    if (code >= 400) {
      log(`[HTTP_${code}] ${req.method} ${req.url}`);
    }
    return origWriteHead.call(this, code, ...rest);
  };
  if (req.url && (req.url.endsWith("/__status") || req.url === "/__status")) {
    let buildId = "unknown";
    try {
      buildId = fs.readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
    } catch {}
    let recentLog = "";
    try {
      if (fs.existsSync("debug.log")) {
        const lines = fs.readFileSync("debug.log", "utf8").trim().split("\n");
        recentLog = lines.slice(-20).join("\n");
      }
    } catch {}
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        {
          status: "online",
          version: "dco-app-v2-production",
          timestamp: new Date().toISOString(),
          cwd: process.cwd(),
          buildId,
          basePath,
          node: process.version,
          isReady,
          startupError: startupError ? startupError.message : null,
          recentLog,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (startupError) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#fff5f5;color:#900"><h2>Application Startup Error</h2><pre style="background:#fff;padding:20px;border:1px solid #fcc;border-radius:6px;overflow:auto">${startupError?.stack || startupError}</pre></body></html>`,
    );
    return;
  }

  if (!isReady) {
    res.writeHead(503, {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "2",
    });
    res.end(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Application Starting Up...</h2><p>Please refresh in a few seconds.</p></body></html>`,
    );
    return;
  }

  // If someone requests the old legacy /diamondcapitaloasis subpath, redirect them cleanly to root
  if (req.url && req.url.startsWith("/diamondcapitaloasis")) {
    const target = req.url.replace(/^\/diamondcapitaloasis/, "") || "/";
    res.writeHead(301, { Location: target });
    res.end();
    return;
  }

  if (basePath && req.url && !req.url.startsWith(basePath)) {
    req.url = `${basePath}${req.url === "/" ? "" : req.url}`;
  }

  try {
    handle(req, res).catch((err) => {
      log(`Handler error on ${req.url}: ${err?.stack || err}`);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px"><h2>Page Rendering Error</h2><p>URL: ${req.url}</p><pre style="background:#f4f4f4;padding:15px;border-radius:5px;overflow:auto">${err?.stack || err}</pre></body></html>`,
        );
      }
    });
  } catch (err) {
    log(`Sync handler error: ${err?.stack || err}`);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px"><h2>Server Error</h2><pre>${err?.stack || err}</pre></body></html>`,
      );
    }
  }
});

if (typeof globalThis.PhusionPassenger !== "undefined") {
  server.listen("passenger", () => {
    log("Listening on Phusion Passenger");
  });
} else if (rawPort && !isNumericPort) {
  server.listen(rawPort, () => {
    log(`Listening on socket: ${rawPort}`);
  });
} else {
  server.listen(port, hostname, () => {
    log(`Listening on ${hostname}:${port}`);
  });
}

log("Calling application.prepare()...");
application
  .prepare()
  .then(() => {
    isReady = true;
    log("Next.js prepared successfully! Ready for requests.");
  })
  .catch((err) => {
    startupError = err;
    log(`Startup error: ${err?.stack || err}`);
  });
