import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { setupProxy } from "./proxy";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// Python backend process
let pythonProcess: ChildProcess | null = null;

function startPythonBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("[Launcher] Starting Python backend...");
    
    const backendPath = path.join(process.cwd(), "backend");
    pythonProcess = spawn("python", ["main.py"], {
      cwd: backendPath,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: "8000",
      },
    });

    pythonProcess.stdout?.on("data", (data) => {
      const output = data.toString();
      process.stdout.write(`[Python] ${output}`);
      // Resolve when we see the server is ready
      if (output.includes("Application startup complete") || output.includes("Uvicorn running")) {
        resolve();
      }
    });

    pythonProcess.stderr?.on("data", (data) => {
      const output = data.toString();
      // FastAPI/uvicorn logs to stderr
      process.stderr.write(`[Python] ${output}`);
      if (output.includes("Application startup complete") || output.includes("Uvicorn running")) {
        resolve();
      }
    });

    pythonProcess.on("error", (err) => {
      console.error("[Launcher] Failed to start Python backend:", err);
      reject(err);
    });

    pythonProcess.on("close", (code) => {
      console.log(`[Launcher] Python backend exited with code ${code}`);
      pythonProcess = null;
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      resolve(); // Resolve anyway to let Express start
    }, 30000);
  });
}

// Graceful shutdown
function setupGracefulShutdown() {
  const shutdown = (signal: string) => {
    console.log(`[Launcher] Received ${signal}, shutting down...`);
    if (pythonProcess) {
      pythonProcess.kill("SIGTERM");
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  setupGracefulShutdown();

  let httpServer;

  if (isProduction) {
    // Production: Start Python backend and proxy to it
    console.log("[Launcher] Production mode - starting Python backend...");
    
    try {
      await startPythonBackend();
      console.log("[Launcher] Python backend started, setting up proxy...");
    } catch (err) {
      console.error("[Launcher] Warning: Python backend may not be fully ready:", err);
    }

    // Give Python a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Setup proxy to Python backend
    setupProxy(app);
    
    // Create HTTP server
    httpServer = createServer(app);

    // Serve static files
    serveStatic(app);
  } else {
    // Development: Use Node.js routes directly
    httpServer = await registerRoutes(app);
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error(err);
  });

  // Health check endpoint for deployment
  app.get("/", (_req, res) => {
    res.json({ status: "ok", mode: isProduction ? "production" : "development" });
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
