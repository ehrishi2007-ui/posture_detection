'use strict'

/**
 * electron/main.js
 *
 * Electron main process for VitalFrame.
 *
 * Responsibilities:
 *  1. Spawn the FastAPI/uvicorn backend as a child process (if not already running)
 *  2. Poll /health until the backend is ready, then open the main window
 *  3. Create the system tray so the app persists when the window is closed
 *  4. Register auto-launch at system startup (toggled from Settings screen)
 *  5. Handle OS notifications for sustained bad posture alerts
 *  6. Kill the backend process cleanly on app quit
 */

const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron')
const { spawn }  = require('child_process')
const path       = require('path')
const http       = require('http')
const fs         = require('fs')

// electron-auto-launch is a production dependency
let AutoLaunch
try {
  AutoLaunch = require('electron-auto-launch')
} catch {
  AutoLaunch = null   // gracefully skip in environments where it fails to load
}

// ─── Environment ─────────────────────────────────────────────────────────────

const isDev        = !app.isPackaged
const BACKEND_PORT = 8000
const BACKEND_URL  = `http://127.0.0.1:${BACKEND_PORT}`
const VITE_URL     = 'http://127.0.0.1:5173'

// Project root is two levels up from frontend/electron/
const PROJECT_ROOT  = path.join(__dirname, '..', '..')
const BACKEND_DIR   = path.join(PROJECT_ROOT, 'backend')
const UVICORN_PATH  = path.join(PROJECT_ROOT, '.venv', 'Scripts', 'uvicorn.exe')

// ─── State ───────────────────────────────────────────────────────────────────

let mainWindow     = null
let backendProcess = null
let trayModule     = null

const autoLauncher = AutoLaunch
  ? new AutoLaunch({ name: 'Meru', path: app.getPath('exe') })
  : null

// ─── Backend management ───────────────────────────────────────────────────────

/** Returns true if the FastAPI backend is already responding on BACKEND_PORT. */
function isBackendAlive() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/health`, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(1500, () => { req.destroy(); resolve(false) })
  })
}

/** Polls /health until the backend is ready or the timeout expires. */
async function waitForBackend(maxMs = 20000) {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    if (await isBackendAlive()) return true
    await new Promise(r => setTimeout(r, 600))
  }
  return false
}

/** Spawns uvicorn as a hidden child process. */
function spawnBackend() {
  // Validate paths before spawning
  if (!fs.existsSync(UVICORN_PATH)) {
    console.error(`[backend] uvicorn not found at: ${UVICORN_PATH}`)
    console.error('[backend] Make sure the .venv is set up: python -m venv .venv && pip install -r requirements.txt')
    return null
  }
  if (!fs.existsSync(BACKEND_DIR)) {
    console.error(`[backend] backend directory not found: ${BACKEND_DIR}`)
    return null
  }

  console.log('[backend] spawning:', UVICORN_PATH)
  console.log('[backend] cwd:', BACKEND_DIR)

  const proc = spawn(
    UVICORN_PATH,
    ['main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)],
    {
      cwd:         BACKEND_DIR,
      stdio:       ['ignore', 'pipe', 'pipe'],
      windowsHide: true,   // don't flash a console window on Windows
    }
  )

  proc.stdout.on('data', d => console.log('[backend]', d.toString().trimEnd()))
  proc.stderr.on('data', d => console.error('[backend]', d.toString().trimEnd()))
  proc.on('close', code => console.log(`[backend] process exited (code ${code})`))

  return proc
}

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1280,
    height:          820,
    minWidth:        960,
    minHeight:       640,
    backgroundColor: '#0A0A0A',
    title:           'Meru',
    show:            false,   // shown after ready-to-show to avoid white flash
    webPreferences: {
      preload:          path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
    },
  })

  if (isDev) {
    mainWindow.loadURL(VITE_URL).catch((err) => {
      console.warn('[electron] loadURL failed, falling back to dist/index.html:', err.message)
      mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
    })
    // Open devtools detached so they don't shrink the app window
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Reveal the window once the page is ready — prevents blank flash on startup
  mainWindow.once('ready-to-show', () => mainWindow.show())

  // ── Intercept close: ask renderer or minimize ─────────────────────────────
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('app-close-requested')
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Check whether the backend is already running (user started it manually)
  const alreadyRunning = await isBackendAlive()

  if (!alreadyRunning) {
    backendProcess = spawnBackend()

    if (!backendProcess) {
      // uvicorn executable not found — show a clear error
      dialog.showErrorBox(
        'VitalFrame — Setup required',
        `Could not find the Python environment.\n\nExpected uvicorn at:\n${UVICORN_PATH}\n\nSetup steps:\n1. python -m venv .venv\n2. .venv\\Scripts\\pip install -r requirements.txt\n\nThen relaunch VitalFrame.`
      )
      app.quit()
      return
    }

    console.log('[backend] waiting for startup…')
    const ready = await waitForBackend(20000)

    if (!ready) {
      dialog.showErrorBox(
        'VitalFrame — Backend timeout',
        'The posture detection backend did not respond within 20 seconds.\n\nCheck the console for errors and try relaunching.'
      )
      if (backendProcess) backendProcess.kill()
      app.quit()
      return
    }

    console.log('[backend] ready ✓')
  } else {
    console.log('[backend] already running — skipping spawn')
  }

  createWindow()

  // Load tray after window exists so it can reference mainWindow
  trayModule = require('./tray.cjs')
  trayModule.createTray(mainWindow)
})

// Re-show window if app is activated with no window (macOS convention)
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
  } else {
    createWindow()
  }
})

// Don't quit when all windows close — we live in the tray
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') app.quit()
  // On Windows: keep running in tray
})

app.on('before-quit', () => {
  app.isQuitting = true
  if (backendProcess) {
    console.log('[backend] terminating on app quit…')
    backendProcess.kill('SIGTERM')
    // Give it 2 seconds to shut down gracefully before force-killing
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL')
      }
    }, 2000)
  }
})

// ─── IPC handlers ─────────────────────────────────────────────────────────────

/** Settings screen: toggle startup registration */
ipcMain.handle('set-auto-launch', async (_, enabled) => {
  if (!autoLauncher) return { ok: false, error: 'AutoLaunch not available' }
  try {
    enabled ? await autoLauncher.enable() : await autoLauncher.disable()
    return { ok: true, enabled }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

/** Settings screen: read current startup state */
ipcMain.handle('get-auto-launch', async () => {
  if (!autoLauncher) return { ok: true, enabled: false }
  try {
    const enabled = await autoLauncher.isEnabled()
    return { ok: true, enabled }
  } catch {
    return { ok: true, enabled: false }
  }
})

/** Renderer requests an OS notification (sustained bad posture alert) */
ipcMain.handle('show-notification', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
})

/** Renderer tells us to bring the window to front */
ipcMain.handle('show-window', () => {
  if (mainWindow) { mainWindow.show(); mainWindow.focus() }
})

/** Renderer tells us to minimize/hide the window to tray */
ipcMain.handle('minimize-to-tray', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide()
    if (Notification.isSupported()) {
      new Notification({
        title: 'Meru is monitoring in the background',
        body:  'Your camera session continues. Right-click the tray icon to reopen or quit.',
        silent: true,
      }).show()
    }
  }
})

/** Renderer signals to quit the app completely */
ipcMain.handle('quit-app', () => {
  app.isQuitting = true
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy()
  }
  app.quit()
})

/** Renderer reports current posture status → tray tooltip updates */
ipcMain.on('posture-status', (_, status) => {
  if (trayModule) trayModule.updateStatus(status)
})

/** Open external links in the system browser, not inside Electron */
ipcMain.handle('open-external', (_, url) => shell.openExternal(url))
