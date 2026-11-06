import React, { useState } from "react";
import {
  Search, Filter, AlertTriangle, CheckCircle2, Eye, MapPin, Phone, Download,
  ArrowUpDown, UserCheck, Trash2, UserPlus, User, Clock, Sparkles
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { computeReport, INR, INR_L } from "../../utils/financialEngine";
import { assignLeadAdvisorApi, updateLeadStatusAndNotesApi, autoAssignAllLeadsApi, getAssignmentRulesApi, updateAssignmentRulesApi } from "../../services/api";
import { Sliders, Settings2 } from "lucide-react";

const STAGE_CONFIGS = {
  new: { label: "● New", color: "var(--accent-teal)", bg: "rgba(95, 168, 160, 0.15)", border: "rgba(95, 168, 160, 0.3)" },
  contacted: { label: "● Contacted", color: "var(--accent-gold)", bg: "rgba(201, 154, 75, 0.15)", border: "var(--border-gold)" },
  in_discussion: { label: "● In Discussion", color: "#60A5FA", bg: "rgba(96, 165, 250, 0.15)", border: "rgba(96, 165, 250, 0.3)" },
  meeting_scheduled: { label: "● Meeting Scheduled", color: "#A78BFA", bg: "rgba(167, 139, 250, 0.15)", border: "rgba(167, 139, 250, 0.3)" },
  converted: { label: "✓ Converted", color: "var(--accent-emerald)", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" },
  lost: { label: "✕ Lost", color: "#F87171", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)" },
  archived: { label: "Archived", color: "var(--text-fog)", bg: "rgba(255, 255, 255, 0.05)", border: "var(--border-subtle)" }
};

export default function LeadTable({
  leads = [],
  teamUsers = [],
  onSelectLead,
  adminRole = "superadmin",
  adminToken = "",
  onRefresh = () => {}
}) {
  const { deleteLead } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [actionNotice, setActionNotice] = useState("");
  const [isAssigningAll, setIsAssigningAll] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [assignRules, setAssignRules] = useState({
    strategy: "equal_random",
    maxLeadsPerAdvisor: 20,
    autoAssignEnabled: true
  });
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [rulesSaveNotice, setRulesSaveNotice] = useState("");

  React.useEffect(() => {
    if (adminRole === "superadmin" && adminToken) {
      getAssignmentRulesApi(adminToken).then((rule) => {
        if (rule) setAssignRules(rule);
      }).catch(() => {});
    }
  }, [adminRole, adminToken]);

  const handleSaveRules = async () => {
    try {
      setIsSavingRules(true);
      const res = await updateAssignmentRulesApi(assignRules, adminToken);
      if (res?.success) {
        setRulesSaveNotice("✓ Assigning rules updated successfully!");
        setActionNotice("⚡ Lead distribution rules updated!");
        setTimeout(() => setRulesSaveNotice(""), 3500);
        setTimeout(() => setActionNotice(""), 4000);
      } else {
        alert("Failed to save rules: " + (res?.error || "Unknown error"));
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setIsSavingRules(false);
    }
  };

  const safeLeads = Array.isArray(leads) ? leads : [];
  const unassignedCount = safeLeads.filter(
    (l) => !l.assignedTo || !l.assignedTo.advisorId
  ).length;

  const handleAutoAssignAll = async () => {
    try {
      setIsAssigningAll(true);
      const res = await autoAssignAllLeadsApi(adminToken);
      setActionNotice(`⚡ ${res?.message || "Leads successfully distributed!"}`);
      onRefresh();
      setTimeout(() => setActionNotice(""), 4500);
    } catch (err) {
      alert("Failed to auto-assign: " + (err?.message || "Unknown error"));
    } finally {
      setIsAssigningAll(false);
    }
  };
  const cities = Array.from(new Set(safeLeads.map((l) => l && l.city).filter(Boolean)));

  const formatPhoneDisplay = (raw) => {
    if (!raw) return "—";
    const str = String(raw).trim();
    const digits = str.replace(/\D/g, "");
    if (digits.length === 10) return `+91 ${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`;
    if (str.startsWith("+")) return str;
    return digits ? `+91 ${digits}` : str;
  };

  const getPhoneRaw = (lead) => {
    return lead?.mobile || lead?.phone || lead?.phoneNumber || lead?.contact || lead?.number || "";
  };

  const getTime = (val) => {
    if (!val) return 0;
    const d = new Date(val);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const handleAssignChange = async (leadId, newAdvisorId) => {
    const selectedAdvisor = teamUsers.find((u) => u.id === newAdvisorId || u._id === newAdvisorId);
    const payload = selectedAdvisor
      ? {
          advisorId: selectedAdvisor.id || selectedAdvisor._id,
          advisorName: selectedAdvisor.name,
          advisorEmail: selectedAdvisor.email
        }
      : {
          advisorId: null,
          advisorName: "",
          advisorEmail: ""
        };

    try {
      const res = await assignLeadAdvisorApi(leadId, payload, adminToken);
      if (res && res.success) {
        setActionNotice(`Lead assignment updated.`);
        onRefresh();
        setTimeout(() => setActionNotice(""), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStageChange = async (leadId, nextStage) => {
    try {
      const res = await updateLeadStatusAndNotesApi(leadId, { leadStatus: nextStage }, adminToken);
      if (res && res.success) {
        setActionNotice(`Pipeline status updated to ${nextStage}.`);
        onRefresh();
        setTimeout(() => setActionNotice(""), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & Sort Logic
  const filteredLeads = safeLeads
    .filter((lead) => {
      if (!lead) return false;
      const report = computeReport(lead);
      const textMatch =
        (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.mobile || "").includes(searchTerm) ||
        (lead.assignedTo?.advisorName || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!textMatch) return false;

      if (cityFilter !== "all" && (lead.city || "").toLowerCase() !== cityFilter.toLowerCase()) {
        return false;
      }

      if (stageFilter !== "all" && (lead.leadStatus || "new") !== stageFilter) {
        return false;
      }

      if (advisorFilter !== "all") {
        if (advisorFilter === "unassigned") {
          if (lead.assignedTo?.advisorId) return false;
        } else {
          if (lead.assignedTo?.advisorId !== advisorFilter) return false;
        }
      }

      const score = report?.scores?.overallScore || 0;
      const isHighRisk = score < 40 || (report?.termGap || 0) > 0 || (report?.healthGap || 0) > 0;
      const isModerate = score >= 40 && score < 70 && !isHighRisk;
      const isHealthy = score >= 70 && !isHighRisk;

      if (riskFilter === "high_risk" && !isHighRisk) return false;
      if (riskFilter === "moderate" && !isModerate) return false;
      if (riskFilter === "healthy" && !isHealthy) return false;

      return true;
    })
    .sort((a, b) => {
      const rA = computeReport(a);
      const rB = computeReport(b);
      const scoreA = rA?.scores?.overallScore || 0;
      const scoreB = rB?.scores?.overallScore || 0;

      if (sortOption === "newest") return getTime(b.submittedAt || b.updatedAt) - getTime(a.submittedAt || a.updatedAt);
      if (sortOption === "oldest") return getTime(a.submittedAt || a.updatedAt) - getTime(b.submittedAt || b.updatedAt);
      if (sortOption === "score_high") return scoreB - scoreA;
      if (sortOption === "score_low") return scoreA - scoreB;
      return 0;
    });

  const exportCSV = () => {
    const headers = ["ID", "Name", "Email", "Mobile", "City", "AssignedAdvisor", "Stage", "Age", "Income", "Expenses", "TermGap", "HealthGap", "HealthScore", "SubmittedAt"];
    const csvRows = [headers.join(",")];

    filteredLeads.forEach((l) => {
      const r = computeReport(l);
      const row = [
        l.id,
        `"${l.name || ""}"`,
        `"${l.email || ""}"`,
        `"${l.mobile || ""}"`,
        `"${l.city || ""}"`,
        `"${l.assignedTo?.advisorName || "Unassigned"}"`,
        `"${l.leadStatus || "new"}"`,
        l.age || "",
        l.income || 0,
        l.expenses || 0,
        r?.termGap || 0,
        r?.healthGap || 0,
        r?.scores?.overallScore || 0,
        `"${new Date(l.submittedAt || Date.now()).toISOString()}"`
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Wealth_Compass_Leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="ff-crm-container">
      {actionNotice && (
        <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34D399", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
          {actionNotice}
        </div>
      )}

      {/* TOOLBAR */}
      {/* 1. Full-Width Search Bar */}
      <div style={{ position: "relative", width: "100%", marginBottom: 14 }}>
        <div style={{ position: "absolute", left: 16, top: 0, bottom: 0, display: "flex", alignItems: "center", pointerEvents: "none", zIndex: 3 }}>
          <Search size={17} color="var(--text-fog)" />
        </div>
        <input
          type="text"
          className="ff-input ff-crm-search-input"
          placeholder="Search leads by name, email, phone, city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 2. Compact Filter Tabs Row for PC, Vertically Stacked for Mobile */}
      <div className="ff-crm-filters-bar">
        <div className="ff-crm-filter-group">
          {/* Stage Filter */}
          <select
            className="ff-select ff-crm-filter-select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">All Stages</option>
            <option value="new">● New Leads</option>
            <option value="contacted">● Contacted</option>
            <option value="in_discussion">● In Discussion</option>
            <option value="meeting_scheduled">● Meeting Scheduled</option>
            <option value="converted">✓ Converted</option>
            <option value="lost">✕ Lost</option>
          </select>

          {/* Advisor Filter (Super Admin only) */}
          {adminRole === "superadmin" && (
            <select
              className="ff-select ff-crm-filter-select"
              value={advisorFilter}
              onChange={(e) => setAdvisorFilter(e.target.value)}
            >
              <option value="all">All Advisors</option>
              <option value="unassigned">⚠️ Unassigned Only</option>
              {teamUsers.map((u) => (
                <option key={u.id || u._id} value={u.id || u._id}>
                  👤 {u.name}
                </option>
              ))}
            </select>
          )}

          {/* Risk Filter */}
          <select
            className="ff-select ff-crm-filter-select"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="all">All Risk</option>
            <option value="high_risk">🔴 High Risk</option>
            <option value="moderate">🟠 Moderate</option>
            <option value="healthy">🟢 Healthy</option>
          </select>

          {/* Sort Option */}
          <select
            className="ff-select ff-crm-filter-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="score_high">Score: High to Low</option>
            <option value="score_low">Score: Low to High</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {adminRole === "superadmin" && unassignedCount > 0 && (
            <button
              className="ff-btn-secondary"
              onClick={handleAutoAssignAll}
              disabled={isAssigningAll}
              style={{
                background: "rgba(201, 154, 75, 0.16)",
                border: "1px solid var(--border-gold)",
                color: "var(--accent-gold)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: isAssigningAll ? "wait" : "pointer",
                transition: "all 0.2s ease"
              }}
              title="Automatically distribute unassigned leads randomly among active advisors"
            >
              <Sparkles size={13} /> {isAssigningAll ? "Distributing..." : `Auto-Assign (${unassignedCount})`}
            </button>
          )}

          {adminRole === "superadmin" && (
            <button
              className="ff-btn-secondary"
              onClick={() => setShowRulesModal(true)}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-main)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 9,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              title="Configure lead assigning rules"
            >
              <Sliders size={13} color="var(--accent-gold)" /> Assigning Rules
            </button>
          )}

          <button
            className="ff-btn-secondary ff-crm-export-btn"
            onClick={exportCSV}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* 1. DESKTOP CLIENT TABLE */}
      <div className="ff-table-wrapper ff-crm-desktop-table">
        <table className="ff-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ padding: "14px 18px" }}>Client Name</th>
              <th style={{ padding: "14px 16px" }}>Contact & City</th>
              <th style={{ padding: "14px 16px" }}>Assigned Advisor</th>
              <th style={{ padding: "14px 16px" }}>Pipeline Stage</th>
              <th style={{ padding: "14px 16px", textAlign: "center" }}>Score</th>
              <th style={{ padding: "14px 16px", textAlign: "right" }}>Monthly Inflow</th>
              <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "60px 24px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255, 255, 255, 0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "var(--text-fog)" }}>
                    <UserCheck size={24} />
                  </div>
                  <h4 style={{ fontSize: 18, color: "var(--text-main)", marginBottom: 4, fontFamily: "var(--font-serif)" }}>No Leads Match Filters</h4>
                  <p style={{ fontSize: 13.5, color: "var(--text-fog)", margin: 0 }}>
                    {adminRole === "advisor" ? "No leads have been assigned to your profile yet." : "No leads found matching the selected criteria."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const report = computeReport(lead);
                const score = lead.healthScore || report?.healthScore || report?.scores?.overallScore || 0;
                const dateStr = new Date(lead.submittedAt || lead.updatedAt || Date.now()).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                });

                const currentStage = lead.leadStatus || "new";
                const stageCfg = STAGE_CONFIGS[currentStage] || STAGE_CONFIGS.new;

                return (
                  <tr key={lead.id} className="ff-crm-row">
                    {/* 1. Client Name & Date */}
                    <td style={{ padding: "16px 18px", verticalAlign: "middle" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>
                        {lead.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-fog)", marginTop: 2 }}>
                        Submitted {dateStr}
                      </div>
                    </td>

                    {/* 2. Contact & City */}
                    <td style={{ padding: "16px 16px", verticalAlign: "middle" }}>
                      <div style={{ fontSize: 13, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                        <span style={{ color: "var(--accent-gold)", fontSize: 13 }}>☎</span> {formatPhoneDisplay(getPhoneRaw(lead))}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-fog)", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span>📍</span> {lead.city || "—"} &bull; Age {lead.age || "—"}
                      </div>
                    </td>

                    {/* 3. Assigned Advisor Column */}
                    <td style={{ padding: "16px 16px", verticalAlign: "middle" }}>
                      {adminRole === "superadmin" ? (
                        <select
                          className="ff-select"
                          value={lead.assignedTo?.advisorId || ""}
                          onChange={(e) => handleAssignChange(lead.id, e.target.value)}
                          style={{
                            height: 36,
                            fontSize: 12.5,
                            borderRadius: 8,
                            padding: "0 28px 0 10px",
                            maxWidth: 170,
                            background: lead.assignedTo?.advisorId ? "rgba(95, 168, 160, 0.12)" : "rgba(239, 68, 68, 0.08)",
                            borderColor: lead.assignedTo?.advisorId ? "rgba(95, 168, 160, 0.3)" : "rgba(239, 68, 68, 0.3)",
                            color: lead.assignedTo?.advisorId ? "var(--accent-teal)" : "#F87171",
                            fontWeight: 600
                          }}
                        >
                          <option value="">⚠️ Unassigned</option>
                          {teamUsers.map((u) => (
                            <option key={u.id || u._id} value={u.id || u._id}>
                              👤 {u.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--accent-teal)", background: "rgba(95, 168, 160, 0.12)", padding: "4px 10px", borderRadius: 8, fontWeight: 600 }}>
                          <User size={12} /> {lead.assignedTo?.advisorName || "Assigned to You"}
                        </div>
                      )}
                    </td>

                    {/* 4. Pipeline Stage Dropdown */}
                    <td style={{ padding: "16px 16px", verticalAlign: "middle" }}>
                      <select
                        className="ff-select"
                        value={currentStage}
                        onChange={(e) => handleStageChange(lead.id, e.target.value)}
                        style={{
                          height: 36,
                          fontSize: 12,
                          borderRadius: 8,
                          padding: "0 26px 0 10px",
                          maxWidth: 155,
                          background: stageCfg.bg,
                          borderColor: stageCfg.border,
                          color: stageCfg.color,
                          fontWeight: 700
                        }}
                      >
                        <option value="new">● New</option>
                        <option value="contacted">● Contacted</option>
                        <option value="in_discussion">● In Discussion</option>
                        <option value="meeting_scheduled">● Meeting Scheduled</option>
                        <option value="converted">✓ Converted</option>
                        <option value="lost">✕ Lost</option>
                      </select>
                    </td>

                    {/* 5. Health Score */}
                    <td style={{ padding: "16px 16px", verticalAlign: "middle", textAlign: "center" }}>
                      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "var(--font-mono)", color: score >= 70 ? "var(--accent-emerald)" : score >= 40 ? "var(--accent-gold)" : "var(--alert-coral)" }}>
                        {score}<span style={{ fontSize: 11, color: "var(--text-fog)", fontWeight: 400 }}>/100</span>
                      </div>
                    </td>

                    {/* 6. Inflow */}
                    <td style={{ padding: "16px 16px", verticalAlign: "middle", textAlign: "right" }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                        {INR_L(lead.income)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-fog)" }}>
                        Surplus: {INR_L(report?.monthlySurplus)}
                      </div>
                    </td>

                    {/* 7. Action Button */}
                    <td style={{ padding: "16px 18px", verticalAlign: "middle", textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                        <button
                          className="ff-btn-ghost ff-view-report-btn"
                          onClick={() => onSelectLead(lead)}
                          style={{
                            padding: "7px 14px",
                            fontSize: 12.5,
                            borderRadius: 8,
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-main)",
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap"
                          }}
                        >
                          Workspace &rarr;
                        </button>
                        {adminRole === "superadmin" && (
                          <button
                            title="Delete Lead"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete lead for "${lead.name}"?`)) {
                                deleteLead(lead.id || lead._id);
                              }
                            }}
                            style={{
                              padding: "7px 10px",
                              borderRadius: 8,
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#EF4444",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <Trash2 size={14} />
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

      {/* 2. MOBILE RESPONSIVE LEAD CARDS */}
      <div className="ff-crm-mobile-cards">
        {filteredLeads.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: 14, border: "1px dashed var(--border-subtle)" }}>
            <UserCheck size={28} color="var(--text-fog)" style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>No Leads Found</div>
            <div style={{ fontSize: 12.5, color: "var(--text-fog)" }}>Try adjusting your filters or search terms.</div>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const report = computeReport(lead);
            const score = lead.healthScore || report?.healthScore || report?.scores?.overallScore || 0;
            const dateStr = new Date(lead.submittedAt || lead.updatedAt || Date.now()).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short"
            });
            const currentStage = lead.leadStatus || "new";
            const stageCfg = STAGE_CONFIGS[currentStage] || STAGE_CONFIGS.new;

            return (
              <div key={lead.id} className="ff-crm-lead-card" style={{ padding: "14px 14px 12px", gap: 10, borderRadius: 14, background: "rgba(255, 255, 255, 0.025)", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column" }}>
                {/* 1. Header: Name, City, Date, and Health Score */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)" }}>
                      {lead.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-fog)", marginTop: 2 }}>
                      {lead.city ? `${lead.city} • ` : ""}Submitted {dateStr}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                      color: score >= 70 ? "var(--accent-emerald)" : score >= 40 ? "var(--accent-gold)" : "var(--alert-coral)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border-subtle)",
                      flexShrink: 0
                    }}
                  >
                    {score}<span style={{ fontSize: 10, color: "var(--text-fog)", fontWeight: 400 }}>/100</span>
                  </span>
                </div>

                {/* 2. Inline Info Strip: Phone + Monthly Inflow */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, background: "rgba(255,255,255,0.02)", padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  <span style={{ color: "var(--text-main)", fontWeight: 600 }}>
                    ☎ {formatPhoneDisplay(getPhoneRaw(lead))}
                  </span>
                  <span style={{ color: "var(--accent-gold)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    Inflow: {INR_L(lead.income)}
                  </span>
                </div>

                {/* 3. Stage & Advisor Dropdowns (Clean 2-Column Grid) */}
                <div style={{ display: "grid", gridTemplateColumns: adminRole === "superadmin" ? "1fr 1fr" : "1fr", gap: 8 }}>
                  {/* Pipeline Stage */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 10, color: "var(--text-fog)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Stage</span>
                    <select
                      className="ff-select ff-crm-filter-select"
                      value={currentStage}
                      onChange={(e) => handleStageChange(lead.id, e.target.value)}
                      style={{
                        height: 34,
                        fontSize: 12,
                        borderRadius: 8,
                        width: "100%",
                        background: stageCfg.bg,
                        borderColor: stageCfg.border,
                        color: stageCfg.color,
                        fontWeight: 700
                      }}
                    >
                      <option value="new">● New</option>
                      <option value="contacted">● Contacted</option>
                      <option value="in_discussion">● In Discussion</option>
                      <option value="meeting_scheduled">● Meeting Scheduled</option>
                      <option value="converted">✓ Converted</option>
                      <option value="lost">✕ Lost</option>
                    </select>
                  </div>

                  {/* Advisor Dropdown (Super Admin) or Advisor Badge */}
                  {adminRole === "superadmin" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 10, color: "var(--text-fog)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Advisor</span>
                      <select
                        className="ff-select ff-crm-filter-select"
                        value={lead.assignedTo?.advisorId || ""}
                        onChange={(e) => handleAssignChange(lead.id, e.target.value)}
                        style={{
                          height: 34,
                          fontSize: 12,
                          borderRadius: 8,
                          width: "100%",
                          background: lead.assignedTo?.advisorId ? "rgba(95, 168, 160, 0.12)" : "rgba(239, 68, 68, 0.08)",
                          borderColor: lead.assignedTo?.advisorId ? "rgba(95, 168, 160, 0.3)" : "rgba(239, 68, 68, 0.3)",
                          color: lead.assignedTo?.advisorId ? "var(--accent-teal)" : "#F87171",
                          fontWeight: 600
                        }}
                      >
                        <option value="">⚠️ Unassigned</option>
                        {teamUsers.map((u) => (
                          <option key={u.id || u._id} value={u.id || u._id}>
                            👤 {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 10, color: "var(--text-fog)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Advisor</span>
                      <div style={{ height: 34, display: "flex", alignItems: "center", padding: "0 10px", borderRadius: 8, background: "rgba(95, 168, 160, 0.12)", color: "var(--accent-teal)", fontSize: 12, fontWeight: 600 }}>
                        👤 {lead.assignedTo?.advisorName || "Assigned to You"}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Action Buttons (Full width Workspace Button + Delete) */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                  <button
                    className="ff-btn-gold"
                    onClick={() => onSelectLead(lead)}
                    style={{
                      height: 36,
                      flex: 1,
                      fontSize: 12.5,
                      borderRadius: 8,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      cursor: "pointer"
                    }}
                  >
                    Workspace &rarr;
                  </button>

                  {adminRole === "superadmin" && (
                    <button
                      title="Delete Lead"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete lead for "${lead.name}"?`)) {
                          deleteLead(lead.id || lead._id);
                        }
                      }}
                      style={{
                        height: 36,
                        width: 36,
                        borderRadius: 8,
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#EF4444",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* LEAD ASSIGNING RULES CONFIGURATION MODAL */}
      {showRulesModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", borderRadius: 16, width: "100%", maxWidth: 540, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 14, marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(201,154,75,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-gold)" }}>
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-main)" }}>Assigning Rules & Distribution</h3>
                  <div style={{ fontSize: 11.5, color: "var(--text-fog)", marginTop: 2 }}>Super Admin Policy for Incoming Leads</div>
                </div>
              </div>
              <button onClick={() => setShowRulesModal(false)} style={{ background: "none", border: "none", color: "var(--text-fog)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {rulesSaveNotice && (
              <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#34D399", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, marginBottom: 16 }}>
                {rulesSaveNotice}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Distribution Strategy Selector */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Distribution Strategy
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, background: assignRules.strategy === "equal_random" ? "rgba(201,154,75,0.12)" : "rgba(255,255,255,0.03)", border: assignRules.strategy === "equal_random" ? "1px solid var(--border-gold)" : "1px solid var(--border-subtle)", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={assignRules.strategy === "equal_random"}
                      onChange={() => setAssignRules({ ...assignRules, strategy: "equal_random" })}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>Equal Distribution (Random / Round-Robin)</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-fog)", marginTop: 2 }}>Evenly spreads leads across all active advisors based on lowest workload.</div>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, background: assignRules.strategy === "performance" ? "rgba(201,154,75,0.12)" : "rgba(255,255,255,0.03)", border: assignRules.strategy === "performance" ? "1px solid var(--border-gold)" : "1px solid var(--border-subtle)", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={assignRules.strategy === "performance"}
                      onChange={() => setAssignRules({ ...assignRules, strategy: "performance" })}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>Performance Priority (Most Closed Clients)</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-fog)", marginTop: 2 }}>Gives organic leads first to advisors who have successfully converted the most clients.</div>
                    </div>
                  </label>

                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, background: assignRules.strategy === "capacity_cap" ? "rgba(201,154,75,0.12)" : "rgba(255,255,255,0.03)", border: assignRules.strategy === "capacity_cap" ? "1px solid var(--border-gold)" : "1px solid var(--border-subtle)", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="strategy"
                      checked={assignRules.strategy === "capacity_cap"}
                      onChange={() => setAssignRules({ ...assignRules, strategy: "capacity_cap" })}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>Maximum Capacity Cap</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-fog)", marginTop: 2 }}>Caps active leads per advisor. Once an advisor hits the cap, new leads route to others.</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Cap Input if Capacity Cap chosen */}
              {assignRules.strategy === "capacity_cap" && (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "12px 14px" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-fog)", display: "block", marginBottom: 6 }}>
                    Max Active Leads Per Advisor
                  </label>
                  <input
                    type="number"
                    className="ff-input"
                    min="1"
                    max="500"
                    value={assignRules.maxLeadsPerAdvisor || 20}
                    onChange={(e) => setAssignRules({ ...assignRules, maxLeadsPerAdvisor: parseInt(e.target.value) || 20 })}
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              {/* Auto Assign Toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "12px 14px" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>Automatic Lead Assignment</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-fog)", marginTop: 2 }}>If disabled, incoming organic leads remain unassigned until manually distributed.</div>
                </div>
                <input
                  type="checkbox"
                  checked={assignRules.autoAssignEnabled}
                  onChange={(e) => setAssignRules({ ...assignRules, autoAssignEnabled: e.target.checked })}
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
              </div>

              {/* Referral Guarantee Note */}
              <div style={{ fontSize: 11.5, color: "var(--accent-gold)", background: "rgba(201,154,75,0.08)", border: "1px dashed var(--border-gold)", borderRadius: 10, padding: "10px 14px" }}>
                💡 <b>Direct Referral Rule:</b> Any assessment submitted with an advisor's unique referral link always bypasses these rules and assigns 100% directly to that advisor.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
              <button
                className="ff-btn-secondary"
                onClick={() => {
                  handleAutoAssignAll();
                }}
                disabled={isAssigningAll}
                style={{ fontSize: 12, padding: "8px 14px" }}
              >
                <Sparkles size={13} /> Run Auto-Assign Now
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="ff-btn-ghost"
                  onClick={() => setShowRulesModal(false)}
                  style={{ fontSize: 12, padding: "8px 14px" }}
                >
                  Cancel
                </button>
                <button
                  className="ff-btn-gold"
                  onClick={handleSaveRules}
                  disabled={isSavingRules}
                  style={{ fontSize: 12.5, fontWeight: 700, padding: "8px 18px" }}
                >
                  {isSavingRules ? "Saving..." : "Save Policy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
