import React, { useState, useEffect } from "react";
import { Sliders, Sun, Moon, Power, Check, Laptop, Bell, Footprints } from "lucide-react";

export default function SettingsPage({
  theme,
  toggleTheme,
  onOpenSetup,
  alertThreshold = 10,
  onAlertThresholdChange,
  breakInterval = 60,
  onBreakIntervalChange,
  breakReminderEnabled = true,
  onBreakReminderToggle,
}) {
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [spineThreshold, setSpineThreshold] = useState(148);
  const [currentAlertThreshold, setCurrentAlertThreshold] = useState(() => {
    return Number(localStorage.getItem("meru_alert_threshold")) || alertThreshold || 10;
  });
  const [breakEnabled, setBreakEnabled] = useState(() => {
    const val = localStorage.getItem("meru_break_enabled");
    return val !== null ? val === "true" : (breakReminderEnabled ?? true);
  });
  const [currentBreakInterval, setCurrentBreakInterval] = useState(() => {
    return Number(localStorage.getItem("meru_break_interval")) || breakInterval || 60;
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (window.electron?.getAutoLaunch) {
      window.electron.getAutoLaunch().then((res) => {
        if (res?.ok) setAutoLaunch(res.enabled);
      });
    }
  }, []);

  const handleToggleAutoLaunch = async () => {
    const nextState = !autoLaunch;
    setAutoLaunch(nextState);
    if (window.electron?.setAutoLaunch) {
      await window.electron.setAutoLaunch(nextState);
    }
  };

  const handleSelectThreshold = (secs) => {
    setCurrentAlertThreshold(secs);
    localStorage.setItem("meru_alert_threshold", String(secs));
    if (onAlertThresholdChange) {
      onAlertThresholdChange(secs);
    }
  };

  const handleToggleBreak = () => {
    const next = !breakEnabled;
    setBreakEnabled(next);
    localStorage.setItem("meru_break_enabled", String(next));
    if (onBreakReminderToggle) onBreakReminderToggle(next);
  };

  const handleSelectBreakInterval = (mins) => {
    setCurrentBreakInterval(mins);
    localStorage.setItem("meru_break_interval", String(mins));
    if (onBreakIntervalChange) onBreakIntervalChange(mins);
  };

  const handleSave = () => {
    localStorage.setItem("meru_alert_threshold", String(currentAlertThreshold));
    localStorage.setItem("meru_break_interval", String(currentBreakInterval));
    localStorage.setItem("meru_break_enabled", String(breakEnabled));
    if (onAlertThresholdChange) onAlertThresholdChange(currentAlertThreshold);
    if (onBreakIntervalChange) onBreakIntervalChange(currentBreakInterval);
    if (onBreakReminderToggle) onBreakReminderToggle(breakEnabled);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const cameraType = localStorage.getItem("meru_camera_type") || "integrated";
  const cameraPos = localStorage.getItem("meru_camera_position") || "desk_low";
  const posLabels = {
    desk_low: "Flat on Desk (Looking upward)",
    stand_eye: "Stand / Eye-Level (Horizontal)",
    monitor_high: "Monitor Top (Slight downward)",
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "19px", fontWeight: 700 }}>
          Meru Preferences &amp; Settings
        </h2>
        <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: 2 }}>
          Customize workspace alignment, detection sensitivity, and startup options
        </p>
      </div>

      {/* Workspace Camera Setup Section */}
      <div className="glass-panel" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "14.5px" }}>Workspace Camera &amp; Laptop Placement</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
              Currently configured: {cameraType === "integrated" ? "Integrated" : "External"} · {posLabels[cameraPos] || "Flat on Desk"}
            </div>
          </div>

          <button className="btn-rust" onClick={onOpenSetup} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Laptop size={15} />
            <span>Reconfigure Setup</span>
          </button>
        </div>
      </div>

      {/* Appearance Section (Cleaned up, no rust orange selector) */}
      <div className="glass-panel" style={{ padding: 22 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 600, marginBottom: 14 }}>
          Appearance &amp; Theme
        </h3>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: "14px" }}>Theme Mode</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Toggle between solid dark glass (`#0A0A0A`) and solid light glass (`#F5F6F9`)
            </div>
          </div>

          <button className="btn-outline" onClick={toggleTheme} style={{ display: "flex", gap: 8 }}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
          </button>
        </div>
      </div>

      {/* Detection Sensitivity Section */}
      <div className="glass-panel" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Sliders size={18} color="var(--accent)" />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 600 }}>
            Fine-Grained Sensitivity Calibration
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: 6 }}>
              <span>Min Spine Angle Threshold (Slouching)</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--accent)" }}>
                {spineThreshold}°
              </span>
            </div>
            <input
              type="range"
              min="135"
              max="165"
              value={spineThreshold}
              onChange={(e) => setSpineThreshold(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 4 }}>
              Higher values increase sensitivity to minor spinal curvature and slouching.
            </div>
          </div>
        </div>
      </div>

      {/* Posture Alert Frequency & Timing Section */}
      <div className="glass-panel" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Bell size={18} color="var(--accent)" />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 600 }}>
            Posture Alert Frequency &amp; Timing
          </h3>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: "13.5px" }}>Sustained Poor Posture Duration</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                How long bad posture must persist before triggering a warning alert
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "14px",
                color: "var(--accent)",
                background: "var(--accent-dim)",
                padding: "3px 10px",
                borderRadius: "8px",
              }}
            >
              {currentAlertThreshold}s
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "12px" }}>
            {[
              { sec: 5, label: "5s (High)" },
              { sec: 10, label: "10s (Standard)" },
              { sec: 15, label: "15s (Moderate)" },
              { sec: 20, label: "20s (Relaxed)" },
              { sec: 30, label: "30s (Low)" },
            ].map(({ sec, label }) => {
              const active = currentAlertThreshold === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleSelectThreshold(sec)}
                  style={{
                    padding: "8px 4px",
                    borderRadius: "8px",
                    border: active ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                    background: active ? "var(--accent-dim)" : "var(--glass-raised)",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    fontSize: "12px",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sedentary & Movement Break Reminder Section */}
      <div className="glass-panel" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Footprints size={18} color="var(--accent)" />
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 600 }}>
              Sedentary &amp; Movement Break Reminders
            </h3>
          </div>

          <button
            type="button"
            className={breakEnabled ? "btn-rust" : "btn-outline"}
            onClick={handleToggleBreak}
            style={{ padding: "6px 14px", fontSize: "12.5px" }}
          >
            {breakEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: "13.5px" }}>Continuous Seated Threshold</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Reminds you to stand up, walk, or stretch when seated for an extended duration
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "14px",
                color: breakEnabled ? "var(--accent)" : "var(--text-muted)",
                background: breakEnabled ? "var(--accent-dim)" : "var(--glass-raised)",
                padding: "3px 10px",
                borderRadius: "8px",
              }}
            >
              {currentBreakInterval} mins
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "12px", opacity: breakEnabled ? 1 : 0.45 }}>
            {[
              { min: 30, label: "30m (Pomodoro)" },
              { min: 45, label: "45m (Active)" },
              { min: 60, label: "60m (Recommended)" },
              { min: 90, label: "90m" },
              { min: 120, label: "120m (Relaxed)" },
            ].map(({ min, label }) => {
              const active = currentBreakInterval === min;
              return (
                <button
                  key={min}
                  type="button"
                  disabled={!breakEnabled}
                  onClick={() => handleSelectBreakInterval(min)}
                  style={{
                    padding: "8px 4px",
                    borderRadius: "8px",
                    border: active && breakEnabled ? "1px solid var(--accent)" : "1px solid var(--glass-border)",
                    background: active && breakEnabled ? "var(--accent-dim)" : "var(--glass-raised)",
                    color: active && breakEnabled ? "var(--accent)" : "var(--text-muted)",
                    fontSize: "12px",
                    fontWeight: active && breakEnabled ? 700 : 500,
                    cursor: breakEnabled ? "pointer" : "not-allowed",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: 10 }}>
            💡 Meru intelligently detects when you step away from your camera and automatically resets your seated timer.
          </div>
        </div>
      </div>

      {/* Startup Behavior */}
      <div className="glass-panel" style={{ padding: 22 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 600, marginBottom: 14 }}>
          Desktop Integration &amp; Auto-Launch
        </h3>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: "14px" }}>Start Meru with Windows</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Automatically launch minimized in the system tray when computer turns on
            </div>
          </div>

          <button
            className={autoLaunch ? "btn-rust" : "btn-outline"}
            onClick={handleToggleAutoLaunch}
            style={{ padding: "8px 16px" }}
          >
            <Power size={14} />
            <span>{autoLaunch ? "Enabled" : "Disabled"}</span>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn-rust" onClick={handleSave}>
          {saved ? <Check size={16} /> : null}
          <span>{saved ? "Settings Saved" : "Save Preferences"}</span>
        </button>
      </div>
    </div>
  );
}
