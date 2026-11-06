import React, { useState } from "react";
import {
  Search, Filter, Phone, MessageCircle, Mail, MapPin, GraduationCap, Briefcase,
  Calendar, Download, Trash2, Eye, CheckCircle2, Clock, Sparkles, X, FileSpreadsheet,
  User, ArrowUpDown, Shield, Globe, Lock, CheckSquare, Square
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { assignFormResponseAdvisorApi, bulkAssignFormResponsesApi } from "../../services/api";

const STATUS_CONFIGS = {
  new: {
    label: "● New",
    color: "#5FA8A0",
    bg: "rgba(95, 168, 160, 0.15)",
    border: "rgba(95, 168, 160, 0.35)"
  },
  contacted: {
    label: "● Contacted",
    color: "#C99A4B",
    bg: "rgba(201, 154, 75, 0.15)",
    border: "rgba(201, 154, 75, 0.35)"
  },
  meeting_scheduled: {
    label: "● Meeting Scheduled",
    color: "#A78BFA",
    bg: "rgba(167, 139, 250, 0.15)",
    border: "rgba(167, 139, 250, 0.35)"
  },
  converted: {
    label: "✓ Converted",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.15)",
    border: "rgba(16, 185, 129, 0.35)"
  },
  archived: {
    label: "Archived",
    color: "#8FA0AC",
    bg: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.12)"
  }
};

export function formatPhoneDisplay(raw) {
  if (!raw) return "—";
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`;
  if (str.startsWith("+")) return str;
  return digits ? `+91 ${digits}` : str;
}

export function getPhoneRaw(item) {
  return item?.mobile || item?.phone || item?.phoneNumber || item?.contact || item?.number || "";
}

export function getCleanPhoneDigits(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export default function FormResponsesTable({
  teamUsers = [],
  adminRole = "superadmin",
  adminToken = "",
  onRefresh = () => {}
}) {
  const { formResponses = [], updateFormResponseStatus, deleteFormResponse } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [profFilter, setProfFilter] = useState("all");
  const [visibilityTab, setVisibilityTab] = useState("all"); // 'all' | 'all_advisors' | 'superadmin_only' | 'unassigned'
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [actionNotice, setActionNotice] = useState("");
  const [assigningId, setAssigningId] = useState(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionValue, setBulkActionValue] = useState("all_advisors");
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  const safeResponses = Array.isArray(formResponses) ? formResponses : [];

  // Unique filter choices
  const availableCities = Array.from(new Set(safeResponses.map((r) => r.city).filter(Boolean)));
  const availableProfessions = Array.from(new Set(safeResponses.map((r) => r.profession).filter(Boolean)));

  // Stats
  const totalCount = safeResponses.length;
  const newCount = safeResponses.filter((r) => !r.status || r.status === "new").length;
  const contactedCount = safeResponses.filter((r) => r.status === "contacted").length;
  const convertedCount = safeResponses.filter((r) => r.status === "converted").length;

  const sharedCount = safeResponses.filter((r) => r.assignedTo?.advisorId === "all_advisors").length;
  const privateCount = safeResponses.filter((r) => r.assignedTo?.advisorId === "superadmin_only").length;
  const unassignedCount = safeResponses.filter((r) => !r.assignedTo?.advisorId).length;

  // Single Row Assign Handler
  const handleAdvisorAssign = async (responseId, chosenValue, e) => {
    if (e) e.stopPropagation();
    try {
      setAssigningId(responseId);

      let payload = {
        advisorId: null,
        advisorName: "Unassigned",
        advisorEmail: "",
        advisorDesignation: "Certified Financial Advisor"
      };

      if (chosenValue === "all_advisors") {
        payload = {
          advisorId: "all_advisors",
          advisorName: "All Advisors (Shared)",
          advisorEmail: "",
          advisorDesignation: "Team Visibility"
        };
      } else if (chosenValue === "superadmin_only") {
        payload = {
          advisorId: "superadmin_only",
          advisorName: "Super Admin Only (Private)",
          advisorEmail: "",
          advisorDesignation: "Super Admin Restricted"
        };
      } else if (chosenValue) {
        const chosen = teamUsers.find((u) => (u.id || u._id) === chosenValue);
        if (chosen) {
          payload = {
            advisorId: chosen.id || chosen._id,
            advisorName: chosen.name,
            advisorEmail: chosen.email,
            advisorDesignation: chosen.designation || "Certified Financial Advisor"
          };
        }
      }

      const res = await assignFormResponseAdvisorApi(responseId, payload, adminToken);
      if (res?.success) {
        setActionNotice(`✓ Visibility updated: ${payload.advisorName}`);
        setTimeout(() => setActionNotice(""), 3000);
        onRefresh();
        if (selectedResponse && (selectedResponse.id === responseId || selectedResponse._id === responseId)) {
          setSelectedResponse({ ...selectedResponse, assignedTo: payload });
        }
      }
    } catch (err) {
      alert("Failed to assign form response: " + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  // Bulk Apply Handler
  const handleBulkApply = async (targetVal, targetIds = null) => {
    const idsToApply = targetIds || Array.from(selectedIds);
    if (!idsToApply || idsToApply.length === 0) {
      alert("Please select at least one application from the table.");
      return;
    }

    let payload = {
      ids: idsToApply,
      advisorId: null,
      advisorName: "Unassigned",
      advisorEmail: "",
      advisorDesignation: "Certified Financial Advisor"
    };

    if (targetVal === "all_advisors") {
      payload = {
        ids: idsToApply,
        advisorId: "all_advisors",
        advisorName: "All Advisors (Shared)",
        advisorEmail: "",
        advisorDesignation: "Team Visibility"
      };
    } else if (targetVal === "superadmin_only") {
      payload = {
        ids: idsToApply,
        advisorId: "superadmin_only",
        advisorName: "Super Admin Only (Private)",
        advisorEmail: "",
        advisorDesignation: "Super Admin Restricted"
      };
    } else if (targetVal && targetVal !== "unassigned") {
      const chosen = teamUsers.find((u) => (u.id || u._id) === targetVal);
      if (chosen) {
        payload = {
          ids: idsToApply,
          advisorId: chosen.id || chosen._id,
          advisorName: chosen.name,
          advisorEmail: chosen.email,
          advisorDesignation: chosen.designation || "Certified Financial Advisor"
        };
      }
    }

    setIsBulkApplying(true);
    try {
      const res = await bulkAssignFormResponsesApi(payload, adminToken);
      if (res?.success) {
        setActionNotice(`✓ Successfully updated ${res.count || idsToApply.length} form applications!`);
        setSelectedIds(new Set());
        setTimeout(() => setActionNotice(""), 3000);
        onRefresh();
      } else {
        alert(res?.error || "Failed to update bulk visibility");
      }
    } catch (err) {
      alert("Bulk assign error: " + err.message);
    } finally {
      setIsBulkApplying(false);
    }
  };

  // 1-Click Quick Assign Current Filter
  const handleGlobalQuickAssign = (targetVal) => {
    const visibleIds = filtered.map((r) => r.id || r._id);
    if (visibleIds.length === 0) {
      alert("No applications to assign in current view.");
      return;
    }
    const label = targetVal === "all_advisors" ? "Show to All Users (Shared)" : "Show to None (Super Admin Private)";
    if (window.confirm(`Are you sure you want to set "${label}" for ALL ${visibleIds.length} applications in this view?`)) {
      handleBulkApply(targetVal, visibleIds);
    }
  };

  // Filtered List
  const filtered = safeResponses.filter((r) => {
    const term = searchTerm.toLowerCase();
    const textMatch =
      (r.name || "").toLowerCase().includes(term) ||
      (r.email || "").toLowerCase().includes(term) ||
      (r.mobile || "").includes(term) ||
      (r.city || "").toLowerCase().includes(term) ||
      (r.profession || "").toLowerCase().includes(term) ||
      (r.education || "").toLowerCase().includes(term);

    if (!textMatch) return false;
    if (cityFilter !== "all" && (r.city || "").toLowerCase() !== cityFilter.toLowerCase()) return false;
    if (statusFilter !== "all" && (r.status || "new") !== statusFilter) return false;
    if (profFilter !== "all" && (r.profession || "").toLowerCase() !== profFilter.toLowerCase()) return false;

    const currentAdvId = r.assignedTo?.advisorId || "";

    // Visibility Tab filter
    let visPass = true;
    if (visibilityTab === "all_advisors") visPass = currentAdvId === "all_advisors";
    else if (visibilityTab === "superadmin_only") visPass = currentAdvId === "superadmin_only";
    else if (visibilityTab === "unassigned") visPass = !currentAdvId;

    // Specific Advisor Filter
    let advPass = true;
    if (advisorFilter !== "all") {
      advPass = currentAdvId === advisorFilter;
    }

    return visPass && advPass;
  });

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateFormResponseStatus(id, newStatus, "", adminToken);
      setActionNotice(`Status updated to ${newStatus}`);
      setTimeout(() => setActionNotice(""), 2200);
      onRefresh();
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const handleDelete = async (id, name, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`Delete application from "${name || "Applicant"}"?`)) {
      try {
        await deleteFormResponse(id, adminToken);
        setActionNotice("Application deleted successfully");
        setTimeout(() => setActionNotice(""), 2200);
        if (selectedResponse && (selectedResponse.id === id || selectedResponse._id === id)) {
          setSelectedResponse(null);
        }
        onRefresh();
      } catch (err) {
        console.error("Delete error:", err);
      }
    }
  };

  const toggleSelectRow = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = filtered.map((r) => r.id || r._id);
    if (selectedIds.size === visibleIds.length && visibleIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const exportCSV = () => {
    if (filtered.length === 0) return alert("No applications to export.");
    const headers = ["Name", "Phone", "Email", "City", "Education", "Profession", "Assigned Advisor", "Status", "Date"];
    const rows = filtered.map((r) => [
      `"${r.name || ""}"`,
      `"${r.mobile || ""}"`,
      `"${r.email || ""}"`,
      `"${r.city || ""}"`,
      `"${r.education || ""}"`,
      `"${r.profession || ""}"`,
      `"${r.assignedTo?.advisorName || "Unassigned"}"`,
      `"${r.status || "new"}"`,
      `"${r.createdAt || ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `form_responses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ width: "100%", textAlign: "left" }}>
      {actionNotice && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#34D399", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>
          {actionNotice}
        </div>
      )}

      {/* 1. COMPACT 1-LINE STATS STRIP */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 14px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        marginBottom: 12,
        flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--text-fog)" }}>
          <span>Total: <b style={{ color: "#FFFFFF" }}>{totalCount}</b></span>
          <span>•</span>
          <span style={{ color: "#5FA8A0" }}>New: <b>{newCount}</b></span>
          <span>•</span>
          <span style={{ color: "#C99A4B" }}>Contacted: <b>{contactedCount}</b></span>
          <span>•</span>
          <span style={{ color: "#10B981" }}>Converted: <b>{convertedCount}</b></span>
        </div>

        <button
          onClick={exportCSV}
          className="ff-btn-ghost"
          style={{ height: 26, padding: "0 10px", fontSize: 11, borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--accent-gold)", border: "1px solid rgba(201,154,75,0.3)" }}
          title="Export CSV"
        >
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* 2. TOP VISIBILITY CONTROLS & TABS */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Applications", count: totalCount },
            { id: "all_advisors", label: "🌐 Show to All (Shared)", count: sharedCount },
            { id: "superadmin_only", label: "🔒 Show to None (Private)", count: privateCount },
            { id: "unassigned", label: "⚠️ Unassigned", count: unassignedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setVisibilityTab(tab.id); setSelectedIds(new Set()); }}
              style={{
                padding: "5px 11px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                border: visibilityTab === tab.id ? "1px solid var(--accent-gold)" : "1px solid var(--border-subtle)",
                background: visibilityTab === tab.id ? "rgba(201, 154, 75, 0.16)" : "rgba(255, 255, 255, 0.03)",
                color: visibilityTab === tab.id ? "var(--accent-gold)" : "var(--text-fog)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease"
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                fontSize: 10,
                background: visibilityTab === tab.id ? "var(--accent-gold)" : "rgba(255, 255, 255, 0.1)",
                color: visibilityTab === tab.id ? "#07080C" : "inherit",
                padding: "1px 6px",
                borderRadius: 10,
                fontWeight: 800
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter by Specific Advisor */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 11.5, color: "var(--text-fog)", fontWeight: 600 }}>Filter by Advisor:</label>
          <select
            className="ff-select"
            value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            style={{ height: 28, fontSize: 11.5, padding: "0 8px", minWidth: 150 }}
          >
            <option value="all">👤 All Assigned Advisors</option>
            {teamUsers.map((u) => (
              <option key={u.id || u._id} value={u.id || u._id}>
                👤 {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. SUPER ADMIN QUICK ACTIONS & BULK SELECTION BAR */}
      {adminRole === "superadmin" && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "6px 12px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          marginBottom: 12,
          flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-gold)", textTransform: "uppercase" }}>
              ⚡ Super Admin Actions:
            </span>
            <button
              type="button"
              onClick={() => handleGlobalQuickAssign("all_advisors")}
              disabled={isBulkApplying}
              className="ff-btn-ghost"
              style={{ height: 26, padding: "0 10px", fontSize: 11, borderRadius: 6, border: "1px solid rgba(16, 185, 129, 0.35)", color: "#34D399", fontWeight: 700, cursor: "pointer" }}
              title="Make all currently filtered form applications visible to all advisors"
            >
              🌐 Show All to All Users
            </button>
            <button
              type="button"
              onClick={() => handleGlobalQuickAssign("superadmin_only")}
              disabled={isBulkApplying}
              className="ff-btn-ghost"
              style={{ height: 26, padding: "0 10px", fontSize: 11, borderRadius: 6, border: "1px solid rgba(239, 68, 68, 0.35)", color: "#F87171", fontWeight: 700, cursor: "pointer" }}
              title="Restrict all currently filtered form applications to Super Admin only"
            >
              🔒 Show to None (Private)
            </button>
          </div>

          {/* If rows are checked via checkbox */}
          {selectedIds.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(201, 154, 75, 0.12)", padding: "3px 8px", borderRadius: 6, border: "1px solid var(--border-gold)" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent-gold)" }}>
                {selectedIds.size} selected:
              </span>
              <select
                className="ff-select"
                value={bulkActionValue}
                onChange={(e) => setBulkActionValue(e.target.value)}
                style={{ height: 24, fontSize: 11, padding: "0 6px" }}
              >
                <option value="all_advisors">🌐 Set: Show to All Users</option>
                <option value="superadmin_only">🔒 Set: Show to None (Private)</option>
                <option value="unassigned">⚠️ Set: Unassigned (Hidden)</option>
                <optgroup label="Assign to Specific Advisor">
                  {teamUsers.map((u) => (
                    <option key={u.id || u._id} value={u.id || u._id}>
                      👤 {u.name}
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                type="button"
                onClick={() => handleBulkApply(bulkActionValue)}
                disabled={isBulkApplying}
                className="ff-btn-primary"
                style={{ height: 24, padding: "0 8px", fontSize: 11, borderRadius: 5, fontWeight: 700, background: "var(--accent-gold)", color: "#07080C" }}
              >
                {isBulkApplying ? "..." : "Apply"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. SEARCH & CRITERIA FILTERS TOOLBAR */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 260 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} color="var(--text-fog)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search by Name, Mobile, Email, City..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ff-input"
              style={{ paddingLeft: 30, width: "100%", height: 32, fontSize: 12 }}
            />
          </div>

          {availableCities.length > 0 && (
            <select
              className="ff-select"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              style={{ minWidth: 120, height: 32, fontSize: 12 }}
            >
              <option value="all">All Cities</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <select
            className="ff-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: 130, height: 32, fontSize: 12 }}
          >
            <option value="all">All Statuses</option>
            <option value="new">● New</option>
            <option value="contacted">● Contacted</option>
            <option value="meeting_scheduled">● Meeting Scheduled</option>
            <option value="converted">✓ Converted</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--text-fog)", fontWeight: 600 }}>
          Showing <b style={{ color: "var(--text-main)" }}>{filtered.length}</b> of {safeResponses.length}
        </div>
      </div>

      {/* 5. COMPACT DENSE TABLE */}
      {filtered.length === 0 ? (
        <div style={{ padding: "36px 16px", textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, color: "var(--text-fog)" }}>
          <FileSpreadsheet size={32} color="var(--text-fog)" style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 2 }}>
            No Form Applications Found
          </div>
          <p style={{ fontSize: 12, margin: 0 }}>Try clearing your search or switching visibility tabs above.</p>
        </div>
      ) : (
        <div className="ff-table-wrapper" style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: 10 }}>
          <table className="ff-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                {adminRole === "superadmin" && (
                  <th style={{ padding: "8px 10px", width: 34, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer", accentColor: "var(--accent-gold)" }}
                      title="Select All"
                    />
                  </th>
                )}
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Date</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Applicant Name</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Phone</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Email</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>City</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Visibility / Assign</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Status</th>
                <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const itemId = item.id || item._id;
                const st = STATUS_CONFIGS[item.status || "new"] || STATUS_CONFIGS.new;
                const rawPhone = getPhoneRaw(item);
                const cleanPhone = getCleanPhoneDigits(rawPhone);
                const displayPhone = formatPhoneDisplay(rawPhone);
                const assignedAdvId = item.assignedTo?.advisorId || "";
                const isChecked = selectedIds.has(itemId);

                return (
                  <tr
                    key={itemId || idx}
                    onClick={() => setSelectedResponse(item)}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      background: isChecked ? "rgba(201, 154, 75, 0.08)" : (idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent"),
                      height: 38
                    }}
                    className="ff-table-row-hover"
                  >
                    {adminRole === "superadmin" && (
                      <td style={{ padding: "7px 10px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectRow(itemId, e)}
                          style={{ cursor: "pointer", accentColor: "var(--accent-gold)" }}
                        />
                      </td>
                    )}

                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap", color: "var(--text-fog)", fontSize: 12 }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                    </td>

                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", fontSize: 12.5 }}>
                      {item.name || "Applicant"}
                    </td>

                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap", fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                      {cleanPhone ? (
                        <a
                          href={`https://wa.me/91${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--text-main)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                          title="Open WhatsApp chat"
                        >
                          <Phone size={11} color="var(--accent-gold)" />
                          <span>{displayPhone}</span>
                        </a>
                      ) : (
                        <span>{displayPhone}</span>
                      )}
                    </td>

                    <td style={{ padding: "7px 10px", color: "var(--text-fog)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                      {item.email || "—"}
                    </td>

                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap", color: "var(--text-main)", fontSize: 12 }}>
                      {item.city || "—"}
                    </td>

                    {/* ASSIGNED ADVISOR / VISIBILITY DROPDOWN */}
                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      {adminRole === "superadmin" ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <select
                            className="ff-select"
                            value={assignedAdvId}
                            onChange={(e) => handleAdvisorAssign(itemId, e.target.value, e)}
                            style={{
                              height: 26,
                              padding: "0 6px",
                              fontSize: 11.5,
                              minWidth: 140,
                              borderRadius: 6,
                              borderColor: assignedAdvId === "all_advisors" ? "rgba(16, 185, 129, 0.4)" : assignedAdvId === "superadmin_only" ? "rgba(239, 68, 68, 0.4)" : "var(--border-subtle)"
                            }}
                            disabled={assigningId === itemId}
                          >
                            <option value="">⚠️ Unassigned (Hidden)</option>
                            <option value="all_advisors">🌐 All Advisors (Shared)</option>
                            <option value="superadmin_only">🔒 Super Admin Only</option>
                            <optgroup label="Assign Specific Advisor">
                              {teamUsers.map((u) => (
                                <option key={u.id || u._id} value={u.id || u._id}>
                                  👤 {u.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                          {item.referralCode && (
                            <span style={{ fontSize: 9.5, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                              ?ref={item.referralCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: assignedAdvId === "all_advisors" ? "#34D399" : "var(--accent-gold)" }}>
                          {assignedAdvId === "all_advisors" ? "🌐 Shared With Team" : `👤 ${item.assignedTo?.advisorName || "Assigned"}`}
                        </span>
                      )}
                    </td>

                    {/* STATUS DROPDOWN */}
                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={item.status || "new"}
                        onChange={(e) => handleStatusChange(itemId, e.target.value)}
                        style={{
                          background: st.bg,
                          border: `1px solid ${st.border}`,
                          color: st.color,
                          padding: "2px 6px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          height: 24,
                          outline: "none"
                        }}
                      >
                        <option value="new" style={{ background: "#0B0D14", color: "#5FA8A0" }}>● New</option>
                        <option value="contacted" style={{ background: "#0B0D14", color: "#C99A4B" }}>● Contacted</option>
                        <option value="meeting_scheduled" style={{ background: "#0B0D14", color: "#A78BFA" }}>● Meeting Scheduled</option>
                        <option value="converted" style={{ background: "#0B0D14", color: "#10B981" }}>✓ Converted</option>
                        <option value="archived" style={{ background: "#0B0D14", color: "#8FA0AC" }}>Archived</option>
                      </select>
                    </td>

                    <td style={{ padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedResponse(item)}
                          className="ff-btn-ghost"
                          style={{ height: 24, width: 24, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}
                          title="View Application"
                        >
                          <Eye size={12} />
                        </button>
                        {adminRole === "superadmin" && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(itemId, item.name, e)}
                            className="ff-btn-ghost"
                            style={{ height: 24, width: 24, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4, color: "#F87171" }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedResponse && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSelectedResponse(null)}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", borderRadius: 16, width: "100%", maxWidth: 520, padding: 22, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12, marginBottom: 14 }}>
              <div>
                <span className="ff-badge ff-badge-gold" style={{ fontSize: 10, marginBottom: 2 }}>Form Application</span>
                <h3 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 800, color: "var(--text-main)" }}>
                  {selectedResponse.name || "Applicant"}
                </h3>
              </div>
              <button onClick={() => setSelectedResponse(null)} style={{ background: "none", border: "none", color: "var(--text-fog)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* SUPER ADMIN VISIBILITY / ASSIGNMENT CARD */}
            {adminRole === "superadmin" && (
              <div style={{ background: "rgba(201, 154, 75, 0.08)", border: "1px dashed var(--border-gold)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--accent-gold)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 5 }}>
                  Visibility & Advisor Assignment
                </div>
                <select
                  className="ff-select"
                  value={selectedResponse.assignedTo?.advisorId || ""}
                  onChange={(e) => handleAdvisorAssign(selectedResponse.id || selectedResponse._id, e.target.value)}
                  style={{ width: "100%", height: 32, fontSize: 12 }}
                  disabled={assigningId === (selectedResponse.id || selectedResponse._id)}
                >
                  <option value="">⚠️ Unassigned (Hidden from Advisors)</option>
                  <option value="all_advisors">🌐 All Advisors (Shared with entire team)</option>
                  <option value="superadmin_only">🔒 Super Admin Only (Private to me)</option>
                  <optgroup label="Assign to Specific Advisor">
                    {teamUsers.map((u) => (
                      <option key={u.id || u._id} value={u.id || u._id}>
                        👤 {u.name} ({u.designation || "Advisor"})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            {/* Client Info Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, color: "var(--text-fog)", textTransform: "uppercase" }}>Phone Number</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main)", marginTop: 2 }}>
                  {formatPhoneDisplay(getPhoneRaw(selectedResponse))}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, color: "var(--text-fog)", textTransform: "uppercase" }}>Email Address</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-teal)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedResponse.email || "—"}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, color: "var(--text-fog)", textTransform: "uppercase" }}>City</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main)", marginTop: 2 }}>
                  {selectedResponse.city || "—"}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, color: "var(--text-fog)", textTransform: "uppercase" }}>Profession</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-gold)", marginTop: 2 }}>
                  {selectedResponse.profession || "—"}
                </div>
              </div>
            </div>

            {/* WhatsApp Quick Chat */}
            {getCleanPhoneDigits(getPhoneRaw(selectedResponse)) && (
              <a
                href={`https://wa.me/91${getCleanPhoneDigits(getPhoneRaw(selectedResponse))}?text=${encodeURIComponent(`Hello ${selectedResponse.name || ""}, thank you for your application on Your Wealth Compass.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "#25D366",
                  color: "#07080C",
                  fontWeight: 700,
                  fontSize: 12.5,
                  padding: "8px 14px",
                  borderRadius: 8,
                  textDecoration: "none",
                  marginTop: 8
                }}
              >
                <MessageCircle size={14} /> Chat with Client on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}