import React, { useState, useRef, useEffect } from "react";
import {
  Sun,
  Moon,
  Bell,
  X,
  User,
  Sliders,
  LogOut,
  Sparkles,
  CheckCircle,
  ShieldCheck,
  Camera,
  Power,
} from "lucide-react";

export default function TopBar({
  theme,
  toggleTheme,
  user,
  onLogout,
  onOpenSetup,
  onExitApp,
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifSection, setNotifSection] = useState("alerts");
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const notifications = [
    {
      id: 1,
      title: "Meru Active Monitoring",
      time: "Live",
      desc: "Real-time posture detection and alignment checks are running.",
      icon: Sparkles,
      color: "var(--good)",
    },
    {
      id: 2,
      title: "Dim-Lighting Assist",
      time: "Active",
      desc: "Adaptive CLAHE contrast enhancement enabled for evening lighting.",
      icon: ShieldCheck,
      color: "var(--accent)",
    },
    {
      id: 3,
      title: "Ergonomic Break Reminder",
      time: "20m ago",
      desc: "Take 20 seconds to look 20 feet away to relax your ocular focus.",
      icon: CheckCircle,
      color: "var(--warn)",
    },
  ];

  // Close notification popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const cameraType = localStorage.getItem("meru_camera_type") || "integrated";
  const cameraPos = localStorage.getItem("meru_camera_position") || "desk_low";

  const posLabels = {
    desk_low: "Flat on Desk",
    stand_eye: "Stand / Eye-Level",
    monitor_high: "Monitor Top",
  };

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>Meru</h1>
        <span className="topbar-date">{today}</span>
      </div>

      <div className="topbar-actions" style={{ position: "relative" }}>
        {/* Theme Toggle */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Notifications Bell */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            className="icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{
              borderColor: showNotifications ? "var(--accent)" : "var(--glass-border)",
              color: showNotifications ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <Bell size={17} />
            <span
              style={{
                position: "absolute",
                top: 7,
                right: 7,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent)",
              }}
            />
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div
              className="glass-panel"
              style={{
                position: "absolute",
                top: "48px",
                right: 0,
                width: "350px",
                padding: "16px",
                zIndex: 200,
                boxShadow: "0 16px 48px rgba(0, 0, 0, 0.6)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderRadius: "16px",
              }}
            >
              {/* Header & Section Toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "14px", fontFamily: "var(--font-display)" }}>
                  Notification Center
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {notifSection === "alerts" ? `${notifications.length} Alerts` : "v2.1.0 Latest"}
                </span>
              </div>

              {/* 2-Section Segmented Pill Toggle */}
              <div
                style={{
                  display: "flex",
                  background: "var(--glass-raised)",
                  borderRadius: "10px",
                  padding: "3px",
                  gap: "4px",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setNotifSection("alerts")}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: notifSection === "alerts" ? 700 : 500,
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    background: notifSection === "alerts" ? "var(--accent)" : "transparent",
                    color: notifSection === "alerts" ? "#fff" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  Alerts &amp; Activity
                </button>
                <button
                  type="button"
                  onClick={() => setNotifSection("updates")}
                  style={{
                    flex: 1,
                    padding: "6px 10px",
                    fontSize: "12px",
                    fontWeight: notifSection === "updates" ? 700 : 500,
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    background: notifSection === "updates" ? "var(--accent)" : "transparent",
                    color: notifSection === "updates" ? "#fff" : "var(--text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  App Updates
                </button>
              </div>

              {/* SECTION 1: Alerts & Notifications */}
              {notifSection === "alerts" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
                  {notifications.map((n) => {
                    const Icon = n.icon;
                    return (
                      <div
                        key={n.id}
                        style={{
                          display: "flex",
                          gap: "10px",
                          padding: "10px",
                          borderRadius: "10px",
                          background: "var(--glass-raised)",
                          border: "1px solid var(--glass-border-subtle)",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "8px",
                            background: "var(--glass)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: n.color,
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{n.title}</span>
                            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{n.time}</span>
                          </div>
                          <p style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.4 }}>
                            {n.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SECTION 2: Meru App Updates */}
              {notifSection === "updates" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto" }}>
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      background: "var(--glass-raised)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: "var(--accent)" }}>Meru v2.1.0</span>
                      <span style={{ fontSize: "10px", background: "var(--accent-dim)", color: "var(--accent)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>Current</span>
                    </div>
                    <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                      <li><strong>Low-Light Vision:</strong> Adaptive CLAHE contrast enhancement for dim rooms.</li>
                      <li><strong>Angle Setup:</strong> Visual eye-level &amp; camera ray calibration.</li>
                      <li><strong>PDF Reports:</strong> Export single-session and consolidated history.</li>
                      <li><strong>Persistent Cam:</strong> Background posture tracking across all tabs.</li>
                    </ul>
                  </div>

                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      background: "var(--glass-raised)",
                      border: "1px solid var(--glass-border-subtle)",
                      opacity: 0.85,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px" }}>Meru v2.0.0</span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Milestone</span>
                    </div>
                    <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.6 }}>
                      <li><strong>AI Ergonomics Coach:</strong> Personalized advice powered by Gemini.</li>
                      <li><strong>Live Gauges:</strong> Real-time spinal curvature &amp; neck tilt tracking.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Avatar Button */}
        <div
          className="user-avatar"
          onClick={() => setShowProfile(true)}
          title="Open Profile & Preferences"
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : "R"}
        </div>
      </div>

      {/* Profile Modal Window */}
      {showProfile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.72)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowProfile(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowProfile(false)}
              className="icon-btn"
              style={{ position: "absolute", top: "18px", right: "18px" }}
            >
              <X size={16} />
            </button>

            {/* Profile Info */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent), #ff7a45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontFamily: "var(--font-display)",
                  fontSize: "22px",
                  fontWeight: 700,
                  boxShadow: "0 4px 16px var(--accent-glow)",
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : "R"}
              </div>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700 }}>
                  {user?.name || "Rishitha"}
                </h2>
                <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                  {user?.email || "user@meru.local"}
                </div>
                <div
                  style={{
                    display: "inline-block",
                    background: "var(--accent-dim)",
                    color: "var(--accent)",
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "10.5px",
                    fontWeight: 600,
                    marginTop: "6px",
                  }}
                >
                  Personal Ergonomics
                </div>
              </div>
            </div>

            {/* Current Camera Setup Card */}
            <div className="glass-panel" style={{ padding: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 600 }}>
                  Current Workspace Setup
                </span>
                <button
                  className="link-rust"
                  onClick={() => {
                    setShowProfile(false);
                    onOpenSetup && onOpenSetup();
                  }}
                  style={{ background: "none", border: "none", fontSize: "11.5px" }}
                >
                  Change
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px" }}>
                <Camera size={16} color="var(--accent)" />
                <span>
                  <strong>Camera:</strong> {cameraType === "integrated" ? "Integrated Webcam" : "External USB Camera"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px", marginTop: "4px" }}>
                <Sliders size={16} color="var(--good)" />
                <span>
                  <strong>Placement:</strong> {posLabels[cameraPos] || "Flat on Desk"}
                </span>
              </div>
            </div>

            {/* Avatar Placeholder */}
            <div
              style={{
                padding: "12px",
                borderRadius: "12px",
                border: "1px dashed var(--glass-border)",
                textAlign: "center",
                fontSize: "12px",
                color: "var(--text-muted)",
              }}
            >
              🎨 Custom 3D Avatar Selector (Coming in Meru 2.2)
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
              <button
                className="btn-outline"
                onClick={() => {
                  setShowProfile(false);
                  onLogout && onLogout();
                }}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
              <button className="btn-rust" onClick={() => setShowProfile(false)} style={{ flex: 1 }}>
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
