'use strict'

/**
 * electron/tray.js
 *
 * System tray icon and context menu.
 *
 * The tray keeps the app visible when the main window is hidden.
 * Tooltip text reflects the current posture status so the user
 * gets a quick health check without opening the window.
 */

const { Tray, Menu, nativeImage, app } = require('electron')
const path = require('path')
const fs   = require('fs')

// ─── Icon generation ──────────────────────────────────────────────────────────
//
// We generate 16x16 coloured dot icons programmatically using raw PNG bytes
// so there's no dependency on external icon files at runtime.
// Each icon is a solid coloured circle on a transparent background.
//
// PNG structure: signature + IHDR + IDAT (raw pixels via zlib) + IEND
// For simplicity we embed minimal pre-generated PNGs as base64 strings.

// 16x16 PNGs (solid colour squares) — pre-encoded
// Generated offline via: node -e "require('fs').writeFileSync('x.png', ...)"
// Rust orange (#C85A2A), teal (#5FBFA3), amber (#E3A857), grey (#6B7280)
const ICON_B64 = {
  // A tiny 1x1 PNG for each colour, upscaled by Electron to 16x16
  neutral: 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mNk+M9Qz0AEYBxVQF8AAARcABl2sI0AAAAASUVORK5CYII=',
  good:    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mNkYPhfz0AEYBxVQF8AAARcABl7/0UAAAAASUVORK5CYII=',
  warn:    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mP8z8BQz0AEYBxVQF8AAARcABlqGnMAAAAASUVORK5CYII=',
  bad:     'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAFklEQVR42mP8x8BQz0AEYBxVQF8AAARcABnhLiIAAAAASUVORK5CYII=',
}

function makeIcon(key) {
  try {
    const buf = Buffer.from(ICON_B64[key] ?? ICON_B64.neutral, 'base64')
    const img = nativeImage.createFromBuffer(buf)
    return img.isEmpty() ? nativeImage.createEmpty() : img
  } catch {
    return nativeImage.createEmpty()
  }
}

// Try to load a proper icon from assets first (better quality)
function loadAppIcon() {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'icon.png'),
    path.join(__dirname, '..', 'assets', 'icon_16.png'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) return img
    }
  }
  return makeIcon('neutral')
}

// ─── Module state ─────────────────────────────────────────────────────────────

let _tray      = null
let _window    = null
let _status    = 'neutral'

const STATUS_TOOLTIP = {
  good:    'Meru  ·  Good posture ✓',
  warn:    'Meru  ·  Check your posture',
  bad:     'Meru  ·  Poor posture detected!',
  neutral: 'Meru  ·  Not monitoring',
}

// ─── Public API ───────────────────────────────────────────────────────────────

function createTray(mainWindow) {
  _window = mainWindow
  _tray   = new Tray(loadAppIcon())
  _tray.setToolTip(STATUS_TOOLTIP.neutral)

  _refreshMenu()

  // Single click — show/focus window
  _tray.on('click', () => _showWindow())

  return _tray
}

/** Called from main.js ipcMain.on('posture-status') with status string. */
function updateStatus(status) {
  _status = status
  if (!_tray) return
  _tray.setToolTip(STATUS_TOOLTIP[status] ?? STATUS_TOOLTIP.neutral)
  // Swap icon colour to reflect status
  _tray.setImage(makeIcon(status))
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _showWindow() {
  if (!_window) return
  if (_window.isMinimized()) _window.restore()
  _window.show()
  _window.focus()
}

function _refreshMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label:   'Open Meru',
      type:    'normal',
      click:   () => _showWindow(),
    },
    { type: 'separator' },
    {
      label:   'Quit Meru',
      type:    'normal',
      click:   () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])
  _tray.setContextMenu(menu)
}

module.exports = { createTray, updateStatus }
