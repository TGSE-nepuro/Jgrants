import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { ensureStore } from "./favorites-store";
import { logError, logInfo } from "./logger";
import "./ipc";

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(join(__dirname, "../../dist/index.html"));
  }
  return win;
}

app.whenReady().then(async () => {
  await ensureStore();
  logInfo("Application ready", { platform: process.platform });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (error) => {
  logError("Uncaught exception", { error: error.message, stack: error.stack });
});

process.on("unhandledRejection", (reason) => {
  logError("Unhandled rejection", { reason });
});
