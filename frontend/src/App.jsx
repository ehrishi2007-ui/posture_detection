import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "./layout/Sidebar.jsx";
import TopBar from "./layout/TopBar.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LiveMonitorPage from "./pages/LiveMonitorPage.jsx";
import SessionReportPage from "./pages/SessionReportPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ComingSoonPage from "./pages/ComingSoonPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SetupGuideModal from "./components/SetupGuideModal.jsx";
import ExitSessionModal from "./components/ExitSessionModal.jsx";
import BreakReminderModal from "./components/BreakReminderModal.jsx";

import {
  analyzeFrame,
  calibratePosture,
  configureCameraSetup,
  setAlertThreshold,
  getCoachReport,
  getSessions,
  getStatsSummary,
} from "./api.js";
import { statusForPosture } from "./utils.js";

const ALERT_DISPLAY_MS = 4000;

const EMPTY_READING = {
  posture: "",
  spine_angle: 0,
  shoulder_tilt: 0,
  neck_angle: 0,
  head_tilt: 0,
  tip: "",
  score: 0,
  alert: false,
  low_light: false,
  issues: [],
};

export default function App() {
  const sessionId = useRef(crypto.randomUUID()).current;

  // ── Auth State ──
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("meru_user") || localStorage.getItem("vitalframe_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // ── Setup Guide State ──
  const [showSetupGuide, setShowSetupGuide] = useState(() => {
    return user && !localStorage.getItem("meru_setup_completed");
  });

  // ── Theme State ──
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("meru_theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("meru_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // ── Navigation ──
  const [currentTab, setCurrentTab] = useState("dashboard");

  // ── Live Monitoring State ──
  const [running, setRunning] = useState(false);
  const [reading, setReading] = useState(EMPTY_READING);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [analyzeError, setAnalyzeError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [calibratedMsg, setCalibratedMsg] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [alertThreshold, setAlertThresholdState] = useState(() => {
    return Number(localStorage.getItem("meru_alert_threshold")) || 10;
  });

  // ── Sedentary & Movement Break Reminder State ──
  const [breakIntervalMin, setBreakIntervalMin] = useState(() => {
    return Number(localStorage.getItem("meru_break_interval")) || 60;
  });
  const [breakReminderEnabled, setBreakReminderEnabled] = useState(() => {
    return localStorage.getItem("meru_break_enabled") !== "false";
  });
  const [continuousSeatedSec, setContinuousSeatedSec] = useState(0);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const awayFromDeskSecRef = useRef(0);

  const handleAlertThresholdChange = useCallback(async (secs) => {
    setAlertThresholdState(secs);
    localStorage.setItem("meru_alert_threshold", String(secs));
    try {
      await setAlertThreshold(sessionId, secs);
    } catch (err) {
      console.warn("Could not sync alert threshold with backend:", err);
    }
  }, [sessionId]);

  const handleAcknowledgeBreak = () => {
    setShowBreakReminder(false);
    setContinuousSeatedSec(0);
  };

  const handleSnoozeBreak = () => {
    setShowBreakReminder(false);
    const targetSec = breakIntervalMin * 60;
    setContinuousSeatedSec(Math.max(0, targetSec - 600)); // remind again in 10 minutes
  };

  const lastBlobRef = useRef(null);
  const bgVideoRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // ── Coaching / Report State ──
  const [ending, setEnding] = useState(false);
  const [coachReport, setCoachReport] = useState(null);
  const [coachStats, setCoachStats] = useState(null);

  // ── Analytics / History State ──
  const [statsSummary, setStatsSummary] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);

  const alertTimeoutRef = useRef(null);

  // ── Attach Camera Stream to Background Video ──
  useEffect(() => {
    if (bgVideoRef.current && cameraStream) {
      bgVideoRef.current.srcObject = cameraStream;
      bgVideoRef.current.play().catch((err) => console.warn("Background video autoplay error:", err));
    }
  }, [cameraStream]);

  // ── Persistent Background Capture & Timer Loop ──
  useEffect(() => {
    if (running) {
      // Session duration & sedentary continuous seated timer
      timerIntervalRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);

        setContinuousSeatedSec((prev) => {
          const next = prev + 1;
          const targetSec = (breakIntervalMin || 60) * 60;
          if (breakReminderEnabled && next >= targetSec && next % targetSec === 0) {
            setShowBreakReminder(true);
            if (window.electron?.showNotification) {
              window.electron.showNotification(
                "Time to Stand Up & Stretch!",
                `You've been seated for ${breakIntervalMin} minutes. Take a short walk or stretch your body!`
              );
            }
          }
          return next;
        });
      }, 1000);

      // 400ms frame capture loop
      const canvas = bgCanvasRef.current || document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      let capturing = false;

      captureIntervalRef.current = setInterval(() => {
        const video = bgVideoRef.current;
        if (!video || video.readyState < 2 || capturing) return;

        try {
          capturing = true;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                handleFrame(blob);
              }
              capturing = false;
            },
            "image/jpeg",
            0.7
          );
        } catch (err) {
          capturing = false;
          console.warn("Background frame capture error:", err);
        }
      }, 400);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    };
  }, [running]); // handleFrame is stable via useCallback

  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  // ── Electron & Web Window Close Interception ──
  useEffect(() => {
    if (window.electron?.onAppCloseRequested) {
      const unsubscribe = window.electron.onAppCloseRequested(() => {
        if (runningRef.current) {
          setShowExitModal(true);
        } else {
          window.electron.quitApp();
        }
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (runningRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── Load Dashboard Analytics ──
  const loadDashboardData = useCallback(async () => {
    try {
      const summary = await getStatsSummary(7);
      setStatsSummary(summary);
    } catch (err) {
      console.warn("Could not fetch stats summary:", err);
    }
    try {
      const hist = await getSessions(15);
      setSessions(hist);
    } catch (err) {
      console.warn("Could not fetch sessions list:", err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // ── Load Session History for History Tab ──
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const data = await getSessions(50);
      setSessions(data);
    } catch (err) {
      setSessionsError(err.message);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentTab === "history") {
      loadSessions();
    }
  }, [currentTab, loadSessions]);

  // ── Handle Frame Transmission ──
  const handleFrame = useCallback(
    async (blob) => {
      lastBlobRef.current = blob;
      try {
        const result = await analyzeFrame(sessionId, blob);
        setReading(result);
        setAnalyzeError(null);

        if (result.posture !== "No Pose Detected") {
          setScoreHistory((prev) => [...prev.slice(-59), result.score]);
          awayFromDeskSecRef.current = 0;
        } else {
          // User is away from desk: if away for 45+ seconds, reset seated timer
          awayFromDeskSecRef.current += 0.4;
          if (awayFromDeskSecRef.current >= 45) {
            setContinuousSeatedSec(0);
          }
        }

        // Report posture status to Electron system tray
        if (window.electron?.reportPostureStatus) {
          const tier = statusForPosture(result.posture);
          window.electron.reportPostureStatus(tier);
        }

        if (result.alert) {
          setShowAlert(true);
          clearTimeout(alertTimeoutRef.current);
          alertTimeoutRef.current = setTimeout(() => setShowAlert(false), ALERT_DISPLAY_MS);

          // Trigger native OS notification if running inside Electron
          if (window.electron?.showNotification) {
            window.electron.showNotification(
              "Meru Posture Alert",
              `Poor posture sustained for over ${alertThreshold} seconds. Straighten your back!`
            );
          }
        }
      } catch (err) {
        setAnalyzeError(err.message);
      }
    },
    [sessionId, alertThreshold]
  );

  const startSession = async () => {
    setReading(EMPTY_READING);
    setScoreHistory([]);
    setCoachReport(null);
    setCoachStats(null);
    setAnalyzeError(null);
    setCameraError(null);
    setSessionSeconds(0);
    setContinuousSeatedSec(0);
    awayFromDeskSecRef.current = 0;
    setCurrentTab("monitor");

    try {
      setAlertThreshold(sessionId, alertThreshold).catch(() => {});
      let stream = cameraStream;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });
        setCameraStream(stream);
      }
      setRunning(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied or unavailable: " + err.message);
    }
  };

  const endSession = async () => {
    setRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }

    setEnding(true);
    try {
      const { report, stats } = await getCoachReport(sessionId);
      setCoachReport(report);
      setCoachStats(stats);
      loadDashboardData();
      setCurrentTab("report");
    } catch (err) {
      setAnalyzeError(err.message);
    } finally {
      setEnding(false);
    }
  };

  const handleRequestExit = () => {
    if (runningRef.current) {
      setShowExitModal(true);
    } else {
      if (window.electron?.quitApp) {
        window.electron.quitApp();
      } else {
        if (window.confirm("Close Meru application?")) {
          window.close();
        }
      }
    }
  };

  const handleEndSessionFromModal = async () => {
    setShowExitModal(false);
    await endSession();
  };

  const handleEndAndExit = async () => {
    setShowExitModal(false);
    await endSession();
    if (window.electron?.quitApp) {
      window.electron.quitApp();
    } else {
      window.close();
    }
  };

  const handleContinueBackground = () => {
    setShowExitModal(false);
    if (window.electron?.minimizeToTray) {
      window.electron.minimizeToTray();
    } else {
      alert(
        "Meru is continuing posture monitoring in the background. Keep this browser tab open, or launch the Meru desktop app to minimize directly to your system tray."
      );
    }
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const handleCalibrate = async () => {
    if (lastBlobRef.current) {
      try {
        await calibratePosture(sessionId, lastBlobRef.current);
        setCalibratedMsg(true);
        setTimeout(() => setCalibratedMsg(false), 3000);
      } catch (err) {
        console.warn("Calibration error:", err);
      }
    }
  };

  const handleSetupComplete = async (cameraType, position) => {
    setShowSetupGuide(false);
    try {
      await configureCameraSetup(sessionId, cameraType, position);
    } catch (err) {
      console.warn("Could not sync camera setup:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("meru_user");
    localStorage.removeItem("vitalframe_user");
    setUser(null);
  };

  // If user is not logged in, display LoginPage
  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={(u) => {
          setUser(u);
          if (!localStorage.getItem("meru_setup_completed")) {
            setShowSetupGuide(true);
          }
        }}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Exit / Close Interception Confirmation Modal */}
      {showExitModal && (
        <ExitSessionModal
          onEndSession={handleEndSessionFromModal}
          onEndAndExit={handleEndAndExit}
          onContinueBackground={handleContinueBackground}
          onCancel={handleCancelExit}
        />
      )}

      {/* Sedentary & Movement Break Reminder Modal */}
      {showBreakReminder && (
        <BreakReminderModal
          minutesSeated={Math.floor(continuousSeatedSec / 60) || breakIntervalMin}
          onAcknowledge={handleAcknowledgeBreak}
          onSnooze={handleSnoozeBreak}
          onClose={() => setShowBreakReminder(false)}
        />
      )}

      {/* Persistent Background Video & Canvas for Uninterrupted Monitoring */}
      <video
        ref={bgVideoRef}
        playsInline
        muted
        style={{ display: "none" }}
      />
      <canvas
        ref={bgCanvasRef}
        width={640}
        height={480}
        style={{ display: "none" }}
      />

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <SetupGuideModal
          onComplete={handleSetupComplete}
          onClose={() => setShowSetupGuide(false)}
        />
      )}

      {/* Icon-Only Left Sidebar Pill */}
      <Sidebar
        currentTab={currentTab}
        setTab={setCurrentTab}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <TopBar
          theme={theme}
          toggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
          onOpenSetup={() => setShowSetupGuide(true)}
        />

        <main className="content-scrollable">
          {currentTab === "dashboard" && (
            <DashboardPage
              stats={statsSummary}
              recentSessions={sessions}
              onStartSession={startSession}
              onEndSession={endSession}
              onViewReport={() => setCurrentTab("report")}
              onNavigateTab={setCurrentTab}
              stream={cameraStream}
              active={running}
              reading={reading}
              sessionSeconds={sessionSeconds}
            />
          )}

          {currentTab === "monitor" && (
            <LiveMonitorPage
              active={running}
              reading={reading}
              scoreHistory={scoreHistory}
              analyzeError={analyzeError}
              showAlert={showAlert}
              onStartSession={startSession}
              onEndSession={endSession}
              ending={ending}
              stream={cameraStream}
              cameraError={cameraError}
              sessionSeconds={sessionSeconds}
              onCalibrate={handleCalibrate}
              calibratedMsg={calibratedMsg}
            />
          )}

          {currentTab === "report" && (
            <SessionReportPage
              report={coachReport}
              stats={coachStats}
              onBackToDashboard={() => setCurrentTab("dashboard")}
            />
          )}

          {currentTab === "history" && (
            <HistoryPage
              sessions={sessions}
              loading={sessionsLoading}
              error={sessionsError}
              onRefresh={loadSessions}
            />
          )}

          {currentTab === "settings" && (
            <SettingsPage
              theme={theme}
              toggleTheme={toggleTheme}
              onOpenSetup={() => setShowSetupGuide(true)}
              alertThreshold={alertThreshold}
              onAlertThresholdChange={handleAlertThresholdChange}
              breakInterval={breakIntervalMin}
              onBreakIntervalChange={setBreakIntervalMin}
              breakReminderEnabled={breakReminderEnabled}
              onBreakReminderToggle={setBreakReminderEnabled}
            />
          )}

          {currentTab === "profiles" && (
            <ComingSoonPage onBackToDashboard={() => setCurrentTab("dashboard")} />
          )}
        </main>
      </div>
    </div>
  );
}
