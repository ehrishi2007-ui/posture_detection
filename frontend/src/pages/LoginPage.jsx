import React, { useState } from "react";
import { ArrowRight, UserCheck } from "lucide-react";

export default function LoginPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("user@meru.local");
  const [password, setPassword] = useState("password123");
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    const userProfile = {
      name: isRegister ? (name || "Rishitha") : (name || "Rishitha"),
      email: email,
    };
    if (rememberMe) {
      localStorage.setItem("meru_user", JSON.stringify(userProfile));
    }
    onLoginSuccess(userProfile);
  };

  const handleGuestLogin = () => {
    const guestUser = { name: "Guest User", email: "guest@meru.local" };
    onLoginSuccess(guestUser);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        background: "var(--bg)",
        padding: "20px",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "36px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.45)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, var(--accent), #ff7a45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "24px",
              margin: "0 auto 14px",
              boxShadow: "0 4px 20px var(--accent-glow)",
            }}
          >
            M
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700 }}>
            {isRegister ? "Create Meru Account" : "Welcome to Meru"}
          </h1>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Intelligent Desktop Posture &amp; Ergonomic Health Platform
          </p>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {isRegister && (
            <div>
              <label style={{ display: "block", fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Rishitha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--glass-border)",
                  background: "var(--glass-raised)",
                  color: "var(--text)",
                  fontSize: "13.5px",
                  outline: "none",
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="user@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass-raised)",
                color: "var(--text)",
                fontSize: "13.5px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11.5px", color: "var(--text-muted)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass-raised)",
                color: "var(--text)",
                fontSize: "13.5px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", marginTop: "2px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-muted)" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "var(--accent)" }}
              />
              <span>Remember on this device</span>
            </label>

            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}
            >
              {isRegister ? "Sign in instead" : "Create account"}
            </button>
          </div>

          <button type="submit" className="btn-rust" style={{ width: "100%", marginTop: "6px" }}>
            <span>{isRegister ? "Register & Enter Meru" : "Sign In"}</span>
            <ArrowRight size={15} />
          </button>
        </form>

        <div style={{ position: "relative", textAlign: "center", margin: "4px 0" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", background: "var(--glass-border)" }} />
          <span style={{ position: "relative", background: "var(--bg)", padding: "0 10px", fontSize: "11px", color: "var(--text-muted)" }}>
            OR
          </span>
        </div>

        <button className="btn-outline" onClick={handleGuestLogin} style={{ width: "100%" }}>
          <UserCheck size={16} />
          <span>Continue as Guest</span>
        </button>
      </div>
    </div>
  );
}
