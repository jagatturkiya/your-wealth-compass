import React, { useState, useEffect } from "react";
import {
  Users, AlertTriangle, FileCheck2, Clock, Filter, Lock, ShieldCheck,
  LogOut, ArrowRight, KeyRound, Mail, RefreshCw, UserCheck, Shield, Sparkles, User, CheckCircle2, FileSpreadsheet,
  Share2, Copy
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { computeReport } from "../../utils/financialEngine";
import {
  adminLoginApi,
  getLeadsApi,
  getEnquiriesApi,
  fetchAdminTeamUsersApi
} from "../../services/api";
import LeadTable from "./LeadTable";
import LeadDetailModal from "./LeadDetailModal";
import SystemLogsTable from "./SystemLogsTable";
import EnquiryTable from "./EnquiryTable";
import FormResponsesTable from "./FormResponsesTable";
import AdvisorTeamManager from "./AdvisorTeamManager";

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Admin Dashboard rendering error caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 640, margin: "100px auto", padding: 36, textAlign: "center", background: "#141826", color: "#FFF", borderRadius: 20, border: "1px solid var(--border-gold)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
          <h2 style={{ fontSize: 22, color: "var(--accent-gold)", margin: "0 0 12px" }}>Admin Console Dashboard</h2>
          <p style={{ fontSize: 14, color: "var(--text-fog)", marginBottom: 20 }}>
            Dashboard loaded. If an error occurred: {this.state.error?.message || "Render exception caught."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="ff-btn-gold"
            style={{ height: 44, padding: "0 24px", borderRadius: 12, fontSize: 14, fontWeight: 700 }}
          >
            Reset Dashboard View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminPortalContent({ onBackToClient }) {
  const { leads: appLeads, contactEnquiries, formResponses, refreshBackendData, setPortalMode } = useApp();
  const { user: currentAuthUser } = useAuth();

  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("ff_admin_session");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [adminToken, setAdminToken] = useState(() => {
    try {
      const saved = sessionStorage.getItem("ff_admin_token");
      return saved || "";
    } catch (e) {
      return "";
    }
  });

  const [identifierInput, setIdentifierInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedMyLink, setCopiedMyLink] = useState(false);

  const isSuperAdmin = adminUser?.role === "superadmin" || adminUser?.id === "superadmin_master";
  const isAdvisorCreator = adminUser?.role === "advisor_creator" || adminUser?.role === "creator";
  const isAdvisor = adminUser?.role === "advisor";
  const isItManager = adminUser?.role === "it_manager";
  const canManageTeam = isSuperAdmin || isAdvisorCreator || isItManager;

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem("ff_admin_session");
      const user = saved ? JSON.parse(saved) : null;
      if (user?.role === "advisor_creator" || user?.role === "creator") return "team";
    } catch (e) {}
    return "crm";
  });

  const [selectedLead, setSelectedLead] = useState(null);

  // Dynamic Data Lists — initialized from cache so never zero on first render
  const [adminLeads, setAdminLeads] = useState(() => {
    try {
      const saved = localStorage.getItem("ff_leads_db");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [teamUsers, setTeamUsers] = useState([]);

  const advisorRefCode = adminUser?.referralCode || adminUser?.username || (adminUser?.name ? adminUser.name.toLowerCase().replace(/[^a-z0-9]/g, "") : "");
  const advisorRefUrl = `https://www.yourwealthcompass.in/?ref=${advisorRefCode}`;

  const handleCopyMyRefLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(advisorRefUrl);
      setCopiedMyLink(true);
      setTimeout(() => setCopiedMyLink(false), 2000);
    }
  };

  const loadPortalData = async (token = adminToken, retryCount = 0) => {
    setIsRefreshing(true);
    try {
      // 1. Fetch leads (only if not advisor creator)
      if (!isAdvisorCreator) {
        const fetchedLeads = await getLeadsApi(token);

        if (!fetchedLeads && retryCount < 2) {
          await new Promise((r) => setTimeout(r, 2000));
          return loadPortalData(token, retryCount + 1);
        }

        if (Array.isArray(fetchedLeads)) {
          setAdminLeads(fetchedLeads);
          try {
            localStorage.setItem("ff_leads_db", JSON.stringify(fetchedLeads));
          } catch (e) {}
        }
      }

      // 2. Fetch team members (if superadmin, advisor creator, or it manager)
      if (canManageTeam) {
        const teamRes = await fetchAdminTeamUsersApi(token);
        if (teamRes && teamRes.users) setTeamUsers(teamRes.users);
      }

      if (typeof refreshBackendData === "function") {
        await refreshBackendData();
      }
    } catch (err) {
      console.error("Failed to load admin portal data:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (adminToken || adminUser) {
      if (isAdvisorCreator) {
        setActiveTab("team");
      }
      loadPortalData(adminToken);
    }
  }, [adminToken, adminUser?.id, adminUser?.role]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    const cleanUser = identifierInput.trim();
    const trimmedPass = passwordInput.trim();

    if (!trimmedPass) {
      setAuthError("Please enter your password.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await adminLoginApi(cleanUser, trimmedPass);
      if (res && res.success && res.user) {
        const loggedUser = res.user;
        const token = res.token || "admin_session_" + Date.now();

        setAdminUser(loggedUser);
        setAdminToken(token);
        sessionStorage.setItem("ff_admin_session", JSON.stringify(loggedUser));
        sessionStorage.setItem("ff_admin_token", token);

        if (loggedUser.role === "advisor_creator" || loggedUser.role === "creator") {
          setActiveTab("team");
        } else {
          setActiveTab("crm");
        }

        await loadPortalData(token);
      } else {
        setAuthError(res?.error || "Invalid username or password.");
      }
    } catch (err) {
      console.error("Login call error:", err);
      setAuthError("Network error. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    setAdminUser(null);
    setAdminToken("");
    sessionStorage.removeItem("ff_admin_session");
    sessionStorage.removeItem("ff_admin_token");
    setActiveTab("crm");
  };

  const handleExitToClient = () => {
    if (typeof onBackToClient === "function") {
      onBackToClient();
    } else if (typeof setPortalMode === "function") {
      setPortalMode("client");
    }
    const cleanUrl = window.location.pathname.replace(/\/adm(in)?|\/frm/gi, "") || "/";
    window.history.pushState({}, "", cleanUrl);
  };

  // If not authenticated, render Login Screen
  if (!adminUser) {
    return (
      <div style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 24px 60px" }}>
        <div
          className="ff-card-glass"
          style={{
            maxWidth: 480,
            width: "100%",
            padding: "44px 36px",
            borderRadius: 24,
            border: "1px solid var(--border-gold)",
            background: "linear-gradient(135deg, rgba(20, 24, 38, 0.98) 0%, rgba(11, 13, 20, 0.99) 100%)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            textAlign: "center"
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(201, 154, 75, 0.12)",
              border: "1px solid var(--border-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "var(--accent-gold)"
            }}
          >
            <ShieldCheck size={32} />
          </div>

          <div style={{ marginBottom: 18, display: "flex", justifyContent: "center" }}>
            <img src="/apkacoach-logo-dark.png" alt="ApkaCoach" style={{ height: 28, width: "auto" }} />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-main)", margin: "0 0 8px", fontFamily: "var(--font-serif)" }}>
            Advisory & CRM Console
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--text-fog)", marginBottom: 26, lineHeight: 1.5 }}>
            Sign in to access your assigned client lead workspace.
          </p>

          <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Username Input */}
            <div className="ff-form-group" style={{ margin: 0, textAlign: "left" }}>
              <label>Username / Email / Advisor ID</label>
              <input
                type="text"
                className="ff-input"
                placeholder="Enter username, email, or handle..."
                value={identifierInput}
                onChange={(e) => {
                  setIdentifierInput(e.target.value);
                  if (authError) setAuthError("");
                }}
                autoFocus
                required
              />
            </div>

            {/* Password Input */}
            <div className="ff-form-group" style={{ margin: 0, textAlign: "left" }}>
              <label>Password</label>
              <input
                type="password"
                className="ff-input"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (authError) setAuthError("");
                }}
                required
              />
            </div>

            {authError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#F87171",
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: "left"
                }}
              >
                ⚠️ {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="ff-btn-primary"
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                background: "linear-gradient(135deg, var(--accent-gold) 0%, #A87930 100%)",
                color: "#07080C",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: "pointer"
              }}
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> Authenticating...
                </>
              ) : (
                <>
                  <KeyRound size={16} /> Sign In to Workspace →
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
            <button
              type="button"
              className="ff-btn-ghost"
              onClick={handleExitToClient}
              style={{ fontSize: 13, color: "var(--text-fog)", cursor: "pointer" }}
            >
              &larr; Back to Client Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compute live metrics across loaded leads
  const safeLeads = (Array.isArray(adminLeads) && adminLeads.length > 0)
    ? adminLeads
    : (Array.isArray(appLeads) && appLeads.length > 0 ? appLeads : []);
  const safeEnquiries = Array.isArray(contactEnquiries) ? contactEnquiries : [];
  const safeForms = Array.isArray(formResponses) ? formResponses : [];

  const totalLeads = safeLeads.length;
  const totalEnquiries = safeEnquiries.length;
  const totalForms = safeForms.length;
  let highRiskCount = 0;
  let reportsTodayCount = 0;
  let convertedCount = 0;

  const todayStr = new Date().toDateString();

  safeLeads.forEach((l) => {
    if (!l) return;
    try {
      const r = computeReport(l);
      if (r && (r.termGap > 0 || r.healthGap > 0 || (r.scores && r.scores.overallScore < 50))) {
        highRiskCount++;
      }
      if (l.leadStatus === "converted") {
        convertedCount++;
      }
      const rawDate = l.submittedAt || l.updatedAt;
      if (rawDate) {
        const parsedD = new Date(rawDate);
        if (!isNaN(parsedD.getTime()) && parsedD.toDateString() === todayStr) {
          reportsTodayCount++;
        }
      }
    } catch (err) {
      console.error("Error computing lead report in AdminPortal:", err);
    }
  });

  return (
    <div className="ff-admin-page">
      
      {/* 1. ADMIN CONSOLE HEADER */}
      <div className="ff-admin-header-card" style={{ marginBottom: 24 }}>
        <div className="ff-admin-header-content">
          <div>
            {/* Top Bar: Role badge + Active status */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              {isSuperAdmin && (
                <span className="ff-badge ff-badge-gold" style={{ fontSize: 11.5, padding: "5px 12px", fontWeight: 700, borderRadius: 8 }}>
                  👑 Super Admin Console (Full Access)
                </span>
              )}
              {isAdvisorCreator && (
                <span className="ff-badge" style={{ fontSize: 11.5, padding: "5px 12px", fontWeight: 700, borderRadius: 8, background: "rgba(99, 102, 241, 0.18)", color: "#818CF8", border: "1px solid rgba(99, 102, 241, 0.35)" }}>
                  🛠️ Advisor Creator
                </span>
              )}
              {isItManager && (
                <span className="ff-badge" style={{ fontSize: 11.5, padding: "5px 12px", fontWeight: 700, borderRadius: 8, background: "rgba(168, 85, 247, 0.18)", color: "#C084FC", border: "1px solid rgba(168, 85, 247, 0.35)" }}>
                  🖥️ IT & Database Manager
                </span>
              )}
              {isAdvisor && (
                <span className="ff-badge ff-badge-ok" style={{ fontSize: 11.5, padding: "5px 12px", fontWeight: 700, borderRadius: 8 }}>
                  💼 Business Partner: <b>{adminUser?.name || "Advisor"}</b>
                </span>
              )}
              <span style={{ fontSize: 11.5, color: "var(--accent-teal)", fontWeight: 600 }}>
                ● Active Session
              </span>
            </div>

            {/* Title */}
            <h1 className="ff-admin-header-title">
              {isAdvisorCreator
                ? "Advisor Team & Partner Distribution"
                : isSuperAdmin
                ? "Platform Leads CRM & Advisor Distribution"
                : "My Assigned Client Leads & Consultations"}
            </h1>

            {/* Subtitle */}
            <p className="ff-admin-header-sub">
              {isAdvisorCreator
                ? "Create advisor credentials, distribute personalized referral links, and monitor team performance."
                : isSuperAdmin
                ? "Assign client leads, manage advisor team credentials, track conversion rates, and audit system logs."
                : "Manage your assigned clients, review diagnostic assessments, and track consultation progress."}
            </p>

            {/* Transparent Powered By (Clean & Subtle beneath title) */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, opacity: 0.75 }}>
              <span style={{ fontSize: 11, color: "var(--text-fog)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Powered by</span>
              <img src="/apkacoach-logo-dark.png" alt="ApkaCoach" style={{ height: 14, width: "auto" }} />
            </div>
          </div>

          <div className="ff-admin-header-actions">
            <button
              onClick={handleExitToClient}
              className="ff-btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 12,
                border: "1px solid var(--border-subtle)",
                color: "var(--text-main)",
                fontSize: 13,
                cursor: "pointer",
                padding: "8px 14px"
              }}
            >
              &larr; Back to Client Screen
            </button>

            {/* Refined Refresh Button */}
            <button
              onClick={() => loadPortalData(adminToken)}
              disabled={isRefreshing}
              className="ff-btn-gold"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              <RefreshCw size={15} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              onClick={handleLogout}
              className="ff-btn-ghost"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                border: "1px solid var(--border-subtle)",
                color: "var(--text-fog)",
                fontSize: 13.5,
                cursor: "pointer"
              }}
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>
      </div>

      {/* ADVISOR PERSONAL REFERRAL LINK CARD */}
      {isAdvisor && (
        <div
          className="ff-card-glass"
          style={{
            padding: "18px 24px",
            borderRadius: 16,
            border: "1px solid var(--border-gold)",
            background: "linear-gradient(135deg, rgba(201, 154, 75, 0.08) 0%, rgba(13, 14, 21, 0.95) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Share2 size={16} color="var(--accent-gold)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>
                Your Client Referral Link (Direct Assessment Credit)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-fog)" }}>
              Share this link with your clients. Any assessments or leads completed via this link will automatically and exclusively be credited to you.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.5)", padding: "6px 12px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
            <code style={{ color: "var(--accent-gold)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
              {advisorRefUrl}
            </code>
            <button
              onClick={handleCopyMyRefLink}
              className="ff-btn-primary"
              style={{
                height: 32,
                padding: "0 14px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5
              }}
            >
              {copiedMyLink ? "✓ Copied!" : <><Copy size={12} /> Copy Link</>}
            </button>
          </div>
        </div>
      )}

      {/* 2. KPI SUMMARY CARDS */}
      {!isAdvisorCreator ? (
        <div className="ff-admin-kpi-grid">
          <div className="ff-admin-kpi-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-fog)", fontWeight: 600 }}>
                {isSuperAdmin ? "Total Platform Leads" : "My Assigned Leads"}
              </span>
              <Users size={17} color="var(--accent-gold)" />
            </div>
            <div className="ff-admin-kpi-val">
              {totalLeads}
            </div>
            <div style={{ fontSize: 12, color: "var(--accent-teal)", marginTop: 4 }}>
              {isSuperAdmin ? "All Form Submissions" : "Assigned specifically to you"}
            </div>
          </div>

          <div className="ff-admin-kpi-card" style={{ borderColor: "rgba(217, 119, 87, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-fog)", fontWeight: 600 }}>High Gap Action</span>
              <AlertTriangle size={17} color="var(--alert-coral)" />
            </div>
            <div className="ff-admin-kpi-val" style={{ color: "var(--alert-coral)" }}>
              {highRiskCount}
            </div>
            <div style={{ fontSize: 12, color: "var(--alert-coral)", marginTop: 4 }}>
              Priority Deficit Flagged
            </div>
          </div>

          <div className="ff-admin-kpi-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-fog)", fontWeight: 600 }}>Converted Clients</span>
              <CheckCircle2 size={17} color="var(--accent-emerald)" />
            </div>
            <div className="ff-admin-kpi-val" style={{ color: "var(--accent-emerald)" }}>
              {convertedCount}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-fog)", marginTop: 4 }}>
              {totalLeads > 0 ? `${Math.round((convertedCount / totalLeads) * 100)}% Conversion Rate` : "0% Conversion"}
            </div>
          </div>

          <div className="ff-admin-kpi-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-fog)", fontWeight: 600 }}>
                {isSuperAdmin ? "Active Advisors" : "Activity Today"}
              </span>
              <Clock size={17} color="var(--accent-gold)" />
            </div>
            <div className="ff-admin-kpi-val" style={{ color: "var(--accent-gold)" }}>
              {isSuperAdmin ? teamUsers.filter(u => u.status !== "inactive").length : reportsTodayCount}
            </div>
            <div style={{ fontSize: 12, color: "var(--accent-gold)", marginTop: 4 }}>
              {isSuperAdmin ? `${teamUsers.length} Registered Team Members` : "Submitted Today"}
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. PAGE TOOLBAR & ROLE-AWARE TAB SWITCHER */}
      <div className="ff-admin-tab-bar-container">
        <div style={{ fontSize: 15, color: "var(--text-main)", fontWeight: 700 }}>
          {activeTab === "crm" && (isSuperAdmin ? `Platform Leads CRM (${totalLeads})` : `My Assigned Leads (${totalLeads})`)}
          {activeTab === "forms" && `Form Responses (/forms) (${totalForms})`}
          {activeTab === "team" && `Advisor Team & Credentials (${teamUsers.length})`}
          {activeTab === "enquiries" && `Advisory Form Enquiries (${totalEnquiries})`}
          {activeTab === "logs" && `System Audit Trails`}
        </div>

        {/* TAB BUTTONS */}
        <div className="ff-admin-tab-bar">
          {/* CRM / Leads Tab: Visible to SuperAdmin and Advisor, Hidden for Advisor Creator */}
          {!isAdvisorCreator && (
            <button
              onClick={() => setActiveTab("crm")}
              className="ff-admin-tab-btn"
              style={{
                background: activeTab === "crm" ? "var(--accent-gold)" : "transparent",
                color: activeTab === "crm" ? "#07080C" : "var(--text-fog)",
              }}
            >
              <Users size={14} /> {isSuperAdmin ? `All Leads (${totalLeads})` : `My Leads (${totalLeads})`}
            </button>
          )}

          {/* Form Responses: Super Admin only */}
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("forms")}
              className="ff-admin-tab-btn"
              style={{
                background: activeTab === "forms" ? "var(--accent-gold)" : "transparent",
                color: activeTab === "forms" ? "#07080C" : "var(--text-fog)",
              }}
            >
              <FileSpreadsheet size={14} /> Form Responses ({totalForms})
            </button>
          )}

          {/* Advisor Team: Super Admin, Advisor Creator, IT Manager */}
          {canManageTeam && (
            <button
              onClick={() => setActiveTab("team")}
              className="ff-admin-tab-btn"
              style={{
                background: activeTab === "team" ? "var(--accent-gold)" : "transparent",
                color: activeTab === "team" ? "#07080C" : "var(--text-fog)",
              }}
            >
              <UserCheck size={14} /> Advisor Team ({teamUsers.length})
            </button>
          )}

          {/* Enquiries: Super Admin only */}
          {/* Enquiries Tab: Super Admin & Advisors */}
          {!isAdvisorCreator && (
            <button
              onClick={() => setActiveTab("enquiries")}
              className="ff-admin-tab-btn"
              style={{
                background: activeTab === "enquiries" ? "var(--accent-gold)" : "transparent",
                color: activeTab === "enquiries" ? "#07080C" : "var(--text-fog)",
              }}
            >
              <Mail size={14} /> Enquiries ({totalEnquiries})
            </button>
          )}

          {/* Logs: Super Admin and IT Manager */}
          {(isSuperAdmin || isItManager) && (
            <button
              onClick={() => setActiveTab("logs")}
              className="ff-admin-tab-btn"
              style={{
                background: activeTab === "logs" ? "var(--accent-gold)" : "transparent",
                color: activeTab === "logs" ? "#07080C" : "var(--text-fog)",
              }}
            >
              Logs
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN DATA TAB DISPLAY */}
      {activeTab === "crm" && !isAdvisorCreator && (
        <LeadTable
          leads={safeLeads}
          teamUsers={teamUsers}
          onSelectLead={(lead) => setSelectedLead(lead)}
          adminRole={adminUser?.role}
          adminToken={adminToken}
          onRefresh={() => loadPortalData(adminToken)}
        />
      )}

      {activeTab === "forms" && isSuperAdmin && (
        <FormResponsesTable
          teamUsers={teamUsers}
          adminRole={adminUser?.role}
          adminToken={adminToken}
          onRefresh={() => loadPortalData(adminToken)}
        />
      )}

      {activeTab === "team" && canManageTeam && (
        <AdvisorTeamManager
          teamUsers={teamUsers}
          adminToken={adminToken}
          onRefresh={() => loadPortalData(adminToken)}
          currentAdminRole={adminUser?.role}
        />
      )}

      {activeTab === "enquiries" && !isAdvisorCreator && (
        <EnquiryTable
          enquiries={safeEnquiries}
          teamUsers={teamUsers}
          adminRole={adminUser?.role}
          adminToken={adminToken}
          onRefresh={() => loadPortalData(adminToken)}
        />
      )}

      {activeTab === "logs" && (isSuperAdmin || isItManager) && (
        <SystemLogsTable adminToken={adminToken} />
      )}

      {/* 5. MODAL: FULL LEAD DOSSIER & ACTIONS */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          teamUsers={teamUsers}
          adminRole={adminUser?.role}
          adminToken={adminToken}
          onClose={() => setSelectedLead(null)}
          onUpdateLead={(updatedLead) => {
            setAdminLeads((prev) =>
              prev.map((l) => (l.id === updatedLead.id || l._id === updatedLead.id ? updatedLead : l))
            );
            setSelectedLead(updatedLead);
          }}
          onRefreshList={() => loadPortalData(adminToken)}
        />
      )}
    </div>
  );
}

export default function AdminPortal(props) {
  return (
    <AdminErrorBoundary>
      <AdminPortalContent {...props} />
    </AdminErrorBoundary>
  );
}
