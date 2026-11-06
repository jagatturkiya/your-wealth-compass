import React, { useState } from "react";
import {
  Users, UserPlus, KeyRound, Shield, ShieldCheck, UserCheck, UserX,
  Trash2, Mail, Phone, RefreshCw, CheckCircle2, AlertCircle, Sparkles, X, Eye, EyeOff, Lock,
  Share2, Copy, ExternalLink, Link2
} from "lucide-react";
import {
  createAdminTeamUserApi,
  resetAdminTeamUserPasswordApi,
  updateAdminTeamUserStatusApi,
  deleteAdminTeamUserApi
} from "../../services/api";

export default function AdvisorTeamManager({
  teamUsers = [],
  adminToken = "",
  onRefresh = () => {},
  currentAdminRole = "superadmin"
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("advisor");
  const [newDesignation, setNewDesignation] = useState("Certified Financial Advisor");
  const [refSuffix, setRefSuffix] = useState(() => Math.random().toString(36).substring(2, 6));

  const handleShuffleSuffix = () => setRefSuffix(Math.random().toString(36).substring(2, 6));
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  // Reset Password State
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Action status message
  const [actionMsg, setActionMsg] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const totalAdvisors = teamUsers.length;
  const activeAdvisors = teamUsers.filter((u) => u.status !== "inactive").length;
  const totalAssignedLeads = teamUsers.reduce((sum, u) => sum + (u.assignedLeadsCount || 0), 0);
  const totalConvertedLeads = teamUsers.reduce((sum, u) => sum + (u.convertedLeadsCount || 0), 0);

  const rawUserHandle = (newUsername || newName).toLowerCase().replace(/[^a-z0-9_-]/g, "") || "advisor";
  const previewRefCode = refSuffix ? `${rawUserHandle}-${refSuffix}` : rawUserHandle;
  const previewRefUrl = `https://www.yourwealthcompass.in/?ref=${previewRefCode}`;

  const handleCopyLink = (u) => {
    const code = u.referralCode || u.username || (u.name ? u.name.toLowerCase().replace(/[^a-z0-9]/g, "") : "");
    const link = `https://www.yourwealthcompass.in/?ref=${code}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedId(u.id);
      setTimeout(() => setCopiedId(""), 2000);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!newName.trim() || !newPassword.trim()) {
      setCreateError("Name and password are required.");
      return;
    }

    const cleanUsername = (newUsername || newName).toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    const cleanEmail = (newEmail || `${cleanUsername}@yourwealthcompass.in`).toLowerCase().trim();

    if (!cleanUsername) {
      setCreateError("Please enter a valid username/handle.");
      return;
    }

    // Check if Username or Email already exists in current loaded list
    const exists = teamUsers.some(
      (u) =>
        (u.username && u.username.toLowerCase() === cleanUsername) ||
        (u.email && u.email.toLowerCase() === cleanEmail)
    );
    if (exists) {
      setCreateError(`Username or Email "${cleanUsername}" is already taken. Please choose another.`);
      return;
    }

    if (newPassword.length < 6) {
      setCreateError("Password must be at least 6 characters.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await createAdminTeamUserApi(
        {
          name: newName.trim(),
          username: cleanUsername,
          email: cleanEmail,
          mobile: newMobile.trim(),
          password: newPassword,
          role: newRole,
          designation: newDesignation ? newDesignation.trim() : "Certified Financial Advisor",
          referralCode: previewRefCode
        },
        adminToken
      );

      if (res && res.success) {
        setCreateSuccess(`✓ Account created for ${newName}! Referral: ?ref=${res.user?.referralCode || previewRefCode}`);
        setNewName("");
        setNewUsername("");
        setNewEmail("");
        setNewMobile("");
        setNewPassword("");
        onRefresh();
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setCreateSuccess("");
        }, 1800);
      } else {
        setCreateError(res?.error || "Failed to create advisor.");
      }
    } catch (err) {
      setCreateError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetAdminTeamUserPasswordApi(selectedUserForReset.id, resetPasswordVal, adminToken);
      if (res && res.success) {
        setResetSuccess(`✓ Password successfully updated for ${selectedUserForReset.name}!`);
        setResetPasswordVal("");
        onRefresh();
        setTimeout(() => {
          setIsResetModalOpen(false);
          setSelectedUserForReset(null);
          setResetSuccess("");
        }, 1500);
      } else {
        setResetError(res?.error || "Failed to reset password.");
      }
    } catch (err) {
      setResetError("Network error. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === "inactive" ? "active" : "inactive";
    try {
      const res = await updateAdminTeamUserStatusApi(user.id, nextStatus, adminToken);
      if (res && res.success) {
        setActionMsg(`User status updated to ${nextStatus}.`);
        onRefresh();
        setTimeout(() => setActionMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete advisor '${user.name}'? Any assigned leads will become unassigned.`)) {
      return;
    }
    try {
      const res = await deleteAdminTeamUserApi(user.id, adminToken);
      if (res && res.success) {
        setActionMsg(`Advisor ${user.name} removed.`);
        onRefresh();
        setTimeout(() => setActionMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#$";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  const renderRoleBadge = (role) => {
    switch (role) {
      case "superadmin":
        return (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "rgba(201, 154, 75, 0.15)", color: "var(--accent-gold)", border: "1px solid var(--border-gold)", whiteSpace: "nowrap" }}>
            👑 Super Admin
          </span>
        );
      case "advisor_creator":
      case "creator":
        return (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "rgba(99, 102, 241, 0.15)", color: "#818CF8", border: "1px solid rgba(99, 102, 241, 0.35)", whiteSpace: "nowrap" }}>
            🛠️ Advisor Creator
          </span>
        );
      case "it_manager":
        return (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "rgba(168, 85, 247, 0.15)", color: "#C084FC", border: "1px solid rgba(168, 85, 247, 0.3)", whiteSpace: "nowrap" }}>
            🖥️ IT & DB Manager
          </span>
        );
      default:
        return (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "rgba(95, 168, 160, 0.15)", color: "var(--accent-teal)", border: "1px solid rgba(95, 168, 160, 0.3)", whiteSpace: "nowrap" }}>
            💼 Business Partner / Advisor
          </span>
        );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. TOP METRICS & HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-main)", margin: 0, fontFamily: "var(--font-serif)" }}>
            Advisor Team & Role Management
          </h2>
          <p style={{ fontSize: 13.5, color: "var(--text-fog)", margin: "4px 0 0" }}>
            Create advisor credentials, distribute personalized referral links, and monitor lead conversion rates.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError("");
            setCreateSuccess("");
            setIsCreateModalOpen(true);
          }}
          className="ff-btn-primary"
          style={{
            height: 44,
            padding: "0 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            background: "linear-gradient(135deg, var(--accent-gold) 0%, #A87930 100%)",
            color: "#07080C",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer"
          }}
        >
          <UserPlus size={16} /> Create New Advisor
        </button>
      </div>

      {actionMsg && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34D399", fontSize: 13, fontWeight: 600 }}>
          ✓ {actionMsg}
        </div>
      )}

      {/* 2. STATS OVERVIEW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <div className="ff-card-glass" style={{ padding: "20px 24px", borderRadius: 16, border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-fog)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>
            Total Advisors / Partners
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
            {totalAdvisors} <span style={{ fontSize: 13, color: "var(--text-fog)", fontWeight: 500 }}>({activeAdvisors} Active)</span>
          </div>
        </div>

        <div className="ff-card-glass" style={{ padding: "20px 24px", borderRadius: 16, border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-fog)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>
            Total Leads Assigned
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
            {totalAssignedLeads}
          </div>
        </div>

        <div className="ff-card-glass" style={{ padding: "20px 24px", borderRadius: 16, border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-fog)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>
            Total Converted Clients
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>
            {totalConvertedLeads}
          </div>
        </div>

        <div className="ff-card-glass" style={{ padding: "20px 24px", borderRadius: 16, border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", color: "var(--text-fog)", fontWeight: 700, letterSpacing: "0.06em", marginBottom: 6 }}>
            Team Conversion Rate
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF", fontFamily: "var(--font-mono)" }}>
            {totalAssignedLeads > 0 ? Math.round((totalConvertedLeads / totalAssignedLeads) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* 3. ADVISOR ROSTER TABLE */}
      <div className="ff-card-glass" style={{ borderRadius: 18, border: "1px solid var(--border-subtle)", background: "var(--bg-card)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={17} color="var(--accent-gold)" /> Team Roster ({teamUsers.length})
          </div>
          <button onClick={onRefresh} style={{ background: "none", border: "none", color: "var(--text-fog)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="ff-table-wrapper" style={{ border: "none", borderRadius: 0, overflowX: "auto" }}>
          <table className="ff-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, minWidth: 800 }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-fog)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: "12px 16px" }}>Advisor / Partner</th>
                <th style={{ padding: "12px 12px" }}>Role</th>
                <th style={{ padding: "12px 12px" }}>Client Referral Link</th>
                <th style={{ padding: "12px 12px" }}>Status</th>
                <th style={{ padding: "12px 12px", textAlign: "center" }}>Assigned Leads</th>
                <th style={{ padding: "12px 12px", textAlign: "center" }}>In Progress</th>
                <th style={{ padding: "12px 12px", textAlign: "center" }}>Converted</th>
                <th style={{ padding: "12px 12px", textAlign: "center" }}>Conv. Rate</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-fog)" }}>
                    No advisors created yet. Click <b>"Create New Advisor"</b> to add your first team member.
                  </td>
                </tr>
              ) : (
                teamUsers.map((u) => {
                  const isInactive = u.status === "inactive";
                  const refCode = u.referralCode || u.username || (u.name ? u.name.toLowerCase().replace(/[^a-z0-9]/g, "") : "");
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background 0.15s ease",
                        opacity: isInactive ? 0.6 : 1
                      }}
                    >
                      {/* Name & Contact */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: "50%",
                              background: u.role === "superadmin" ? "rgba(201, 154, 75, 0.2)" : "rgba(95, 168, 160, 0.2)",
                              color: u.role === "superadmin" ? "var(--accent-gold)" : "var(--accent-teal)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: 14
                            }}
                          >
                            {u.name ? u.name.charAt(0).toUpperCase() : "A"}
                          </div>
                          <div style={{ minWidth: 0, maxWidth: 160 }}>
                            <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.name}>
                              {u.name}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--accent-gold)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {u.designation || "Certified Financial Advisor"}
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--text-fog)", display: "flex", alignItems: "center", gap: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={u.email}>
                              <UserCheck size={11} /> @{u.username || u.email}
                              {u.mobile && (
                                <>
                                  <span>&bull;</span>
                                  <Phone size={11} /> {u.mobile}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        {renderRoleBadge(u.role)}
                      </td>

                      {/* Referral Link with Copy */}
                      <td style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.35)", padding: "4px 8px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                          <code style={{ fontSize: 11, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                            ?ref={refCode}
                          </code>
                          <button
                            onClick={() => handleCopyLink(u)}
                            className="ff-btn-ghost"
                            style={{
                              height: 24,
                              padding: "0 8px",
                              fontSize: 11,
                              fontWeight: 700,
                              borderRadius: 6,
                              border: "1px solid var(--border-subtle)",
                              color: copiedId === u.id ? "#34D399" : "var(--text-fog)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4
                            }}
                            title="Copy full client referral link"
                          >
                            {copiedId === u.id ? "✓ Copied" : <><Copy size={11} /> Copy</>}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            padding: 0
                          }}
                          title="Click to toggle active/inactive status"
                        >
                          {isInactive ? (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "rgba(239, 68, 68, 0.15)", color: "#F87171", border: "1px solid rgba(239, 68, 68, 0.3)", whiteSpace: "nowrap", display: "inline-block" }}>
                              ● Inactive
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: "rgba(16, 185, 129, 0.15)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.3)", whiteSpace: "nowrap", display: "inline-block" }}>
                              ● Active
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Assigned Leads */}
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                        {u.assignedLeadsCount || 0}
                      </td>

                      {/* In Progress */}
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 600, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                        {u.inProgressLeadsCount || 0}
                      </td>

                      {/* Converted */}
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700, color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>
                        {u.convertedLeadsCount || 0}
                      </td>

                      {/* Conversion Rate */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: (u.conversionRate || 0) > 30 ? "var(--accent-emerald)" : "var(--text-fog)" }}>
                          {u.conversionRate || 0}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => {
                              setSelectedUserForReset(u);
                              setResetPasswordVal("");
                              setResetError("");
                              setResetSuccess("");
                              setIsResetModalOpen(true);
                            }}
                            className="ff-btn-ghost"
                            style={{ height: 32, padding: "0 10px", fontSize: 12, borderRadius: 8, border: "1px solid var(--border-subtle)", color: "var(--accent-gold)" }}
                            title="Reset password"
                          >
                            <KeyRound size={13} /> Reset Pass
                          </button>

                          {currentAdminRole === "superadmin" && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="ff-btn-ghost"
                              style={{ height: 32, padding: "0 8px", fontSize: 12, borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.2)", color: "#F87171" }}
                              title="Delete Advisor"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: CREATE NEW ADVISOR */}
      {isCreateModalOpen && (
        <div className="ff-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(5, 6, 10, 0.88)", backdropFilter: "blur(12px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="ff-modal-card" style={{ width: "100%", maxWidth: 520, background: "#0D0E15", border: "1px solid var(--border-gold)", borderRadius: 20, padding: "28px 32px", color: "var(--text-main)", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UserPlus size={20} color="var(--accent-gold)" />
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "var(--font-serif)" }}>
                  Create New Advisor / Partner
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-fog)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {createSuccess ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "#34D399" }}>
                <CheckCircle2 size={40} style={{ margin: "0 auto 10px" }} />
                <div style={{ fontSize: 16, fontWeight: 700 }}>{createSuccess}</div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {createError && (
                  <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#F87171", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                    {createError}
                  </div>
                )}

                <div className="ff-form-group" style={{ margin: 0 }}>
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="ff-input"
                    placeholder="Enter full name"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (!newUsername) {
                        setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
                      }
                    }}
                    required
                  />
                </div>

                <div className="ff-form-group" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ margin: 0 }}>Username Handle *</label>
                    <button
                      type="button"
                      onClick={handleShuffleSuffix}
                      style={{ background: "none", border: "none", color: "var(--accent-gold)", fontSize: 11.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                      title="Shuffle referral link suffix"
                    >
                      <RefreshCw size={11} /> Regenerate Suffix
                    </button>
                  </div>
                  <input
                    type="text"
                    className="ff-input"
                    placeholder="Enter username handle (e.g. raunak)"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    required
                  />
                  <div style={{ fontSize: 11, color: "var(--text-fog)", marginTop: 4 }}>
                    Unique login handle combined with security suffix to create their personalized link.
                  </div>
                </div>

                {/* Live Referral Link Preview */}
                <div style={{ background: "rgba(201, 154, 75, 0.08)", border: "1px dashed var(--border-gold)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <div style={{ fontSize: 11, color: "var(--accent-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Generated Referral Link
                    </div>
                    {previewRefCode && (
                      <span style={{ fontSize: 10, color: "var(--text-fog)", fontFamily: "var(--font-mono)" }}>
                        Code: {previewRefCode}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-main)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>
                    {previewRefUrl}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="ff-form-group" style={{ margin: 0 }}>
                    <label>Email (Optional)</label>
                    <input
                      type="text"
                      className="ff-input"
                      placeholder="advisor@yourwealthcompass.in"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value.toLowerCase().trim())}
                    />
                  </div>

                  <div className="ff-form-group" style={{ margin: 0 }}>
                    <label>Contact Phone Number (Optional)</label>
                    <input
                      type="tel"
                      className="ff-input"
                      placeholder="+91 98765-XXXXX"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                    />
                  </div>
                </div>

                <div className="ff-form-group" style={{ margin: 0 }}>
                  <label>Advisor Designation</label>
                  <input
                    type="text"
                    className="ff-input"
                    placeholder="e.g. Certified Financial Advisor"
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                  />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {[
                      "Certified Financial Advisor",
                      "Certified Financial Planner",
                      "Senior Wealth Consultant",
                      "Financial Advisory Partner"
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewDesignation(preset)}
                        style={{
                          background: newDesignation === preset ? "rgba(230, 180, 80, 0.2)" : "rgba(255, 255, 255, 0.04)",
                          border: `1px solid ${newDesignation === preset ? "var(--accent-gold)" : "var(--border-subtle)"}`,
                          color: newDesignation === preset ? "var(--accent-gold)" : "var(--text-fog)",
                          fontSize: 10.5,
                          padding: "3px 8px",
                          borderRadius: 6,
                          cursor: "pointer"
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-fog)", marginTop: 4 }}>
                    Appears on diagnostic dossiers and generated 10-page PDF client reports.
                  </div>
                </div>

                <div className="ff-form-group" style={{ margin: 0 }}>
                  <label>Role</label>
                  <select
                    className="ff-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="advisor">💼 Business Partner / Financial Consultant (Assigned Leads Only)</option>
                    <option value="advisor_creator">🛠️ Advisor Creator (Can only create & view advisors)</option>
                    <option value="it_manager">🖥️ IT & Database Manager</option>
                    {currentAdminRole === "superadmin" && (
                      <option value="superadmin">👑 Super Admin (Full Platform Access)</option>
                    )}
                  </select>
                </div>

                <div className="ff-form-group" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ margin: 0 }}>Set Login Password *</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      style={{ background: "none", border: "none", color: "var(--accent-gold)", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Sparkles size={12} /> Auto Generate
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="ff-input"
                      placeholder="Enter login password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingRight: 40 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-fog)", cursor: "pointer" }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {newPassword && (
                    <div style={{ marginTop: 8, background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                        <span style={{ color: "var(--text-fog)" }}>Password Security</span>
                        <span style={{
                          fontWeight: 700,
                          color: (newPassword.length >= 8 && /[0-9!@#$%^&*]/.test(newPassword)) ? "#34D399" : newPassword.length >= 6 ? "var(--accent-gold)" : "#F87171"
                        }}>
                          {(newPassword.length >= 8 && /[0-9!@#$%^&*]/.test(newPassword)) ? "Strong" : newPassword.length >= 6 ? "Good" : "Weak (Min 6)"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-fog)" }}>
                        <span style={{ color: newPassword.length >= 6 ? "#34D399" : "var(--text-fog)" }}>
                          {newPassword.length >= 6 ? "✓" : "○"} 6+ Characters
                        </span>
                        <span style={{ color: /[0-9!@#$%^&*]/.test(newPassword) ? "#34D399" : "var(--text-fog)" }}>
                          {/[0-9!@#$%^&*]/.test(newPassword) ? "✓" : "○"} Number or Symbol
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="ff-btn-ghost"
                    style={{ height: 44, padding: "0 20px", borderRadius: 12 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="ff-btn-primary"
                    style={{ height: 44, padding: "0 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "var(--accent-gold)", color: "#07080C" }}
                  >
                    {isCreating ? "Creating..." : "Save Advisor"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL: RESET PASSWORD */}
      {isResetModalOpen && selectedUserForReset && (
        <div className="ff-modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(5, 6, 10, 0.88)", backdropFilter: "blur(12px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="ff-modal-card" style={{ width: "100%", maxWidth: 460, background: "#0D0E15", border: "1px solid var(--border-gold)", borderRadius: 20, padding: "28px 32px", color: "var(--text-main)", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <KeyRound size={20} color="var(--accent-gold)" />
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  Reset Password for {selectedUserForReset.name}
                </h3>
              </div>
              <button onClick={() => setIsResetModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-fog)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {resetSuccess ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "#34D399" }}>
                <CheckCircle2 size={36} style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: 15, fontWeight: 700 }}>{resetSuccess}</div>
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {resetError && (
                  <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#F87171", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                    {resetError}
                  </div>
                )}

                <div className="ff-form-group" style={{ margin: 0 }}>
                  <label>New Password (Min 6 chars)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showResetPassword ? "text" : "password"}
                      className="ff-input"
                      placeholder="Enter new password"
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                      style={{ paddingRight: 40 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-fog)", cursor: "pointer" }}
                    >
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="ff-btn-ghost"
                    style={{ height: 40, padding: "0 18px", borderRadius: 10 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="ff-btn-primary"
                    style={{ height: 40, padding: "0 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: "var(--accent-gold)", color: "#07080C" }}
                  >
                    {isResetting ? "Saving..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
