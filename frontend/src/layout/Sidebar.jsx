import React from "react";
import {
  LayoutDashboard,
  Video,
  History,
  Settings,
  Lock,
  LogOut,
  Power,
} from "lucide-react";

export default function Sidebar({ currentTab, setTab, onLogout, onExitApp }) {
  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "monitor", icon: Video, label: "Live Monitor" },
    { id: "history", icon: History, label: "History" },
    { id: "settings", icon: Settings, label: "Settings" },
    { id: "profiles", icon: Lock, label: "Caregiver Mode (Coming Soon)", disabled: false },
  ];

  return (
    <aside className="sidebar-wrapper">
      <div className="sidebar-pill">
        <div className="sidebar-logo" title="Meru">
          M
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => setTab(item.id)}
                title={item.label}
              >
                <Icon size={19} />
              </button>
            );
          })}
        </nav>

        <button
          className="nav-item nav-item-bottom"
          onClick={onLogout}
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
