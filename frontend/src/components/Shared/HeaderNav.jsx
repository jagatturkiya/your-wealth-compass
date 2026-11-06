import React from "react";
import { User, LogOut, Plus, FileText } from "lucide-react";
import { useAuth, AUTH_REQUIRED } from "../../context/AuthContext";

export default function HeaderNav({ activeTab, setActiveTab, onResetWizard, onOpenAssessments }) {
  const { user, logout, openAuthModal, setPortalMode } = useAuth();

  const handleGoHome = () => {
    setPortalMode("client");
    if (onResetWizard) onResetWizard();
    setActiveTab("landing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartForm = () => {
    setPortalMode("client");
    if (AUTH_REQUIRED && !user) {
      openAuthModal("signup");
      return;
    }
    if (onResetWizard) onResetWizard();
    setActiveTab("wizard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenAssessments = () => {
    if (onOpenAssessments) onOpenAssessments();
  };

  const handleLogout = () => {
    logout();
    setActiveTab("landing");
  };

  return (
    <header className="ff-navbar no-print">
      <div className="ff-navbar-inner">
        {/* Brand Logo on the Left */}
        <div className="ff-brand" onClick={handleGoHome} style={{ cursor: "pointer" }}>
          Your<span style={{ color: "var(--accent-gold)", margin: "0 3px" }}>Wealth</span>Compass
        </div>

        {/* Corner Controls: New Assessment CTA (Single Plus, No 3-Bars Hamburger) */}
        <div className="ff-nav-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {user && (
            <button
              className="ff-btn-ghost ff-nav-assessments-btn"
              onClick={handleOpenAssessments}
              title="View Previous Assessments"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--accent-gold)",
                border: "1px solid rgba(201, 154, 75, 0.3)"
              }}
            >
              <FileText size={15} color="var(--accent-gold)" />
              <span className="ff-btn-text-full">My Assessments</span>
            </button>
          )}

          {/* New Assessment CTA Button with single plus icon */}
          <button
            className="ff-btn-gold ff-nav-new-btn"
            onClick={handleStartForm}
            style={{
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13.5,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--accent-gold)",
              color: "#07080C",
              border: "none",
              cursor: "pointer",
              
              whiteSpace: "nowrap"
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Assessment</span>
          </button>

          {user ? (
            <button
              className="ff-user-initial-dot"
              onClick={handleLogout}
              title={`Signed in as ${user.name} (Click to Sign Out)`}
              style={{ border: "none", width: 34, height: 34, fontSize: 13 }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </button>
          ) : AUTH_REQUIRED ? (
            <button
              onClick={() => openAuthModal("signin")}
              className="ff-btn-ghost ff-corner-signin-btn"
            >
              <User size={14} />
              <span>Sign In</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
