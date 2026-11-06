import React, { useState } from "react";
import {
  Mail, Search, Trash2, Eye, Calendar, User, MessageSquare, Tag, X, Sparkles,
  Phone, MessageCircle, MapPin, Briefcase, GraduationCap, UserCheck, Shield, Globe, Lock, CheckSquare, Square
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { assignEnquiryAdvisorApi, bulkAssignEnquiriesApi } from "../../services/api";

function formatPhoneDisplay(raw) {
  if (!raw) return "—";
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, "");
  if (digits.length === 10) return `+91 ${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`;
  if (str.startsWith("+")) return str;
  return digits ? `+91 ${digits}` : str;
}

function getPhoneRaw(enq) {
  return enq?.mobile || enq?.phone || enq?.phoneNumber || enq?.contact || enq?.number || "";
}

function getCleanPhoneDigits(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function parseFormProfile(msg) {
  if (!msg || typeof msg !== "string") return null;
  const hasProfile = msg.includes("City:") || msg.includes("Education:") || msg.includes("Profession:");
  if (!hasProfile) return null;

  const cityMatch = msg.match(/City:\s*([^|]+)/i);
  const eduMatch = msg.match(/Education:\s*([^|]+)/i);
  const profMatch = msg.match(/Profession:\s*([^|]+)/i);
  const emailMatch = msg.match(/Verified Email:\s*([^|]+)/i);

  let remaining = msg
    .replace(/City:\s*[^|]+(\|)?/i, "")
    .replace(/Education:\s*[^|]+(\|)?/i, "")
    .replace(/Profession:\s*[^|]+(\|)?/i, "")
    .replace(/Verified Email:\s*[^|]+(\|)?/i, "")
    .replace(/^[|\s]+|[|\s]+$/g, "")
    .trim();

  return {
    city: cityMatch ? cityMatch[1].trim() : "",
    education: eduMatch ? eduMatch[1].trim() : "",
    profession: profMatch ? profMatch[1].trim() : "",
    verifiedEmail: emailMatch ? emailMatch[1].trim() : "",
    remainingMessage: remaining
  };
}

export default function EnquiryTable({
  enquiries = null,
  teamUsers = [],
  adminRole = "superadmin",
  adminToken = "",
  onRefresh = () => {}
}) {
  const { contactEnquiries = [], deleteContactEnquiry } = useApp();
  const effectiveEnquiries = Array.isArray(enquiries) ? enquiries : contactEnquiries;

  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [visibilityTab, setVisibilityTab] = useState("all"); // 'all' | 'all_advisors' | 'superadmin_only' | 'unassigned'
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [actionNotice, setActionNotice] = useState("");

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionValue, setBulkActionValue] = useState("all_advisors");
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  const topicsList = [
    "All Topics",
    "Application Form",
    "Comprehensive Financial Planning",
    "Retirement & Pension Strategy",
    "Child Education & Marriage Funding",
    "Life & Health Protection Audit",
    "Investment & Portfolio Review",
    "General Enquiry / Other"
  ];

  // Counts for tabs
  const totalCount = effectiveEnquiries.length;
  const sharedCount = effectiveEnquiries.filter((e) => e.assignedTo?.advisorId === "all_advisors").length;
  const privateCount = effectiveEnquiries.filter((e) => e.assignedTo?.advisorId === "superadmin_only").length;
  const unassignedCount = effectiveEnquiries.filter((e) => !e.assignedTo?.advisorId).length;

  const handleAdvisorAssign = async (enquiryId, chosenValue, e) => {
    if (e) e.stopPropagation();
    try {
      setAssigningId(enquiryId);

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

      const res = await assignEnquiryAdvisorApi(enquiryId, payload, adminToken);
      if (res?.success) {
        setActionNotice(`✓ Visibility updated: ${payload.advisorName}`);
        setTimeout(() => setActionNotice(""), 3000);
        onRefresh();
        if (selectedEnquiry && (selectedEnquiry.id === enquiryId || selectedEnquiry._id === enquiryId)) {
          setSelectedEnquiry({ ...selectedEnquiry, assignedTo: payload });
        }
      }
    } catch (err) {
      alert("Failed to assign enquiry: " + err.message);
    } finally {
      setAssigningId(null);
    }
  };

  // Bulk Apply Handler
  const handleBulkApply = async (targetVal, targetIds = null) => {
    const idsToApply = targetIds || Array.from(selectedIds);
    if (!idsToApply || idsToApply.length === 0) {
      alert("Please select at least one enquiry from the table.");
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
      const res = await bulkAssignEnquiriesApi(payload, adminToken);
      if (res?.success) {
        setActionNotice(`✓ Successfully updated ${res.count || idsToApply.length} enquiries!`);
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
    const visibleIds = filteredEnquiries.map((e) => e.id || e._id);
    if (visibleIds.length === 0) {
      alert("No enquiries to assign in current view.");
      return;
    }
    const label = targetVal === "all_advisors" ? "Show to All Users (Shared)" : "Show to None (Super Admin Private)";
    if (window.confirm(`Are you sure you want to set "${label}" for ALL ${visibleIds.length} enquiries in this view?`)) {
      handleBulkApply(targetVal, visibleIds);
    }
  };

  const filteredEnquiries = effectiveEnquiries.filter((enq) => {
    const rawMob = getPhoneRaw(enq);
    const nameMatch = (enq.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (enq.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = rawMob.toLowerCase().includes(searchTerm.toLowerCase());
    const msgMatch = (enq.message || "").toLowerCase().includes(searchTerm.toLowerCase());
    const searchPass = nameMatch || emailMatch || phoneMatch || msgMatch;

    const topicPass =
      topicFilter === "all" ||
      topicFilter === "All Topics" ||
      enq.topic === topicFilter ||
      (topicFilter === "Application Form" && (enq.topic === "Application Form" || enq.topic?.startsWith("Form Profile")));

    const currentAdvId = enq.assignedTo?.advisorId || "";

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

    return searchPass && topicPass && visPass && advPass;
  });

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this advisory enquiry?")) {
      deleteContactEnquiry(id);
      if (selectedEnquiry && (selectedEnquiry.id === id || selectedEnquiry._id === id)) {
        setSelectedEnquiry(null);
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
    const visibleIds = filteredEnquiries.map((e) => e.id || e._id);
    if (selectedIds.size === visibleIds.length && visibleIds.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const getTopicColor = (topic) => {
    if ((topic || "").includes("Application") || (topic || "").includes("Form")) return { bg: "rgba(201, 154, 75, 0.15)", text: "#C99A4B", border: "rgba(201, 154, 75, 0.4)" };
    if ((topic || "").includes("Financial")) return { bg: "rgba(201, 154, 75, 0.15)", text: "#C99A4B", border: "rgba(201, 154, 75, 0.4)" };
    if ((topic || "").includes("Retirement")) return { bg: "rgba(95, 168, 160, 0.15)", text: "#5FA8A0", border: "rgba(95, 168, 160, 0.4)" };
    if ((topic || "").includes("Protection") || (topic || "").includes("Insurance")) return { bg: "rgba(244, 63, 94, 0.15)", text: "#F43F5E", border: "rgba(244, 63, 94, 0.4)" };
    return { bg: "rgba(255, 255, 255, 0.05)", text: "var(--text-fog)", border: "var(--border-subtle)" };
  };

  return (
    <div style={{ width: "100%", textAlign: "left" }}>
      {actionNotice && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#34D399", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>
          {actionNotice}
        </div>
      )}

      {/* 1. TOP VISIBILITY CONTROLS & TABS */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "All Enquiries", count: totalCount },
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

      {/* 2. SUPER ADMIN QUICK ACTIONS & BULK SELECTION BAR */}
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
              title="Make all currently filtered enquiries visible to all advisors"
            >
              🌐 Show All to All Users
            </button>
            <button
              type="button"
              onClick={() => handleGlobalQuickAssign("superadmin_only")}
              disabled={isBulkApplying}
              className="ff-btn-ghost"
              style={{ height: 26, padding: "0 10px", fontSize: 11, borderRadius: 6, border: "1px solid rgba(239, 68, 68, 0.35)", color: "#F87171", fontWeight: 700, cursor: "pointer" }}
              title="Restrict all currently filtered enquiries to Super Admin only"
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

      {/* 3. SEARCH & TOPIC FILTER TOOLBAR */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 260 }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} color="var(--text-fog)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search enquiries by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ff-input"
              style={{ paddingLeft: 30, width: "100%", height: 32, fontSize: 12 }}
            />
          </div>

          <select
            className="ff-select"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            style={{ minWidth: 150, height: 32, fontSize: 12 }}
          >
            {topicsList.map((t) => (
              <option key={t} value={t === "All Topics" ? "all" : t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--text-fog)", fontWeight: 600 }}>
          Showing <b style={{ color: "var(--text-main)" }}>{filteredEnquiries.length}</b> of {effectiveEnquiries.length}
        </div>
      </div>

      {/* 4. COMPACT DENSE TABLE */}
      {filteredEnquiries.length === 0 ? (
        <div style={{ padding: "36px 16px", textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, color: "var(--text-fog)" }}>
          <Mail size={32} color="var(--text-fog)" style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 2 }}>
            No Enquiries Found
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
                      checked={filteredEnquiries.length > 0 && selectedIds.size === filteredEnquiries.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer", accentColor: "var(--accent-gold)" }}
                      title="Select All"
                    />
                  </th>
                )}
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Date</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Client Name</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Phone</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Email</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Visibility / Assign</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Topic</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Message</th>
                <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnquiries.map((enq, idx) => {
                const enqId = enq.id || enq._id;
                const topicStyle = getTopicColor(enq.topic);
                const rawPhone = getPhoneRaw(enq);
                const cleanPhone = getCleanPhoneDigits(rawPhone);
                const displayPhone = formatPhoneDisplay(rawPhone);
                const assignedAdvId = enq.assignedTo?.advisorId || "";
                const isChecked = selectedIds.has(enqId);

                return (
                  <tr
                    key={enqId}
                    onClick={() => setSelectedEnquiry(enq)}
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
                          onChange={(e) => toggleSelectRow(enqId, e)}
                          style={{ cursor: "pointer", accentColor: "var(--accent-gold)" }}
                        />
                      </td>
                    )}

                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap", color: "var(--text-fog)", fontSize: 12 }}>
                      {enq.submittedAt ? new Date(enq.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                    </td>

                    <td style={{ padding: "7px 10px", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", fontSize: 12.5 }}>
                      {enq.name || "Client"}
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
                      {enq.email || "—"}
                    </td>

                    {/* ASSIGNED ADVISOR / VISIBILITY DROPDOWN */}
                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      {adminRole === "superadmin" ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <select
                            className="ff-select"
                            value={assignedAdvId}
                            onChange={(e) => handleAdvisorAssign(enqId, e.target.value, e)}
                            style={{
                              height: 26,
                              padding: "0 6px",
                              fontSize: 11.5,
                              minWidth: 140,
                              borderRadius: 6,
                              borderColor: assignedAdvId === "all_advisors" ? "rgba(16, 185, 129, 0.4)" : assignedAdvId === "superadmin_only" ? "rgba(239, 68, 68, 0.4)" : "var(--border-subtle)"
                            }}
                            disabled={assigningId === enqId}
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
                          {enq.referralCode && (
                            <span style={{ fontSize: 9.5, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                              ?ref={enq.referralCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: assignedAdvId === "all_advisors" ? "#34D399" : "var(--accent-gold)" }}>
                          {assignedAdvId === "all_advisors" ? "🌐 Shared With Team" : `👤 ${enq.assignedTo?.advisorName || "Assigned"}`}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 6, fontSize: 10.5, fontWeight: 600, background: topicStyle.bg, color: topicStyle.text, border: `1px solid ${topicStyle.border}` }}>
                        {enq.topic || "General"}
                      </span>
                    </td>

                    <td style={{ padding: "7px 10px", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-fog)", fontSize: 11.5 }}>
                      {enq.message || "—"}
                    </td>

                    <td style={{ padding: "7px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedEnquiry(enq)}
                          className="ff-btn-ghost"
                          style={{ height: 24, width: 24, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>
                        {adminRole === "superadmin" && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(enqId, e)}
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
      {selectedEnquiry && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSelectedEnquiry(null)}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", borderRadius: 16, width: "100%", maxWidth: 520, padding: 22, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12, marginBottom: 14 }}>
              <div>
                <span className="ff-badge ff-badge-gold" style={{ fontSize: 10, marginBottom: 2 }}>Enquiry Details</span>
                <h3 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 800, color: "var(--text-main)" }}>
                  {selectedEnquiry.name || "Advisory Lead"}
                </h3>
              </div>
              <button onClick={() => setSelectedEnquiry(null)} style={{ background: "none", border: "none", color: "var(--text-fog)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {/* SUPER ADMIN VISIBILITY / ASSIGNMENT CARD */}
            {adminRole === "superadmin" && (
              <div style={{ background: "rgba(201, 154, 75, 0.08)", border: "1px dashed var(--border-gold)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--accent-gold)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 5 }}>
                  Visibility & Advisor Assignment
                </div>
                <select
                  className="ff-select"
                  value={selectedEnquiry.assignedTo?.advisorId || ""}
                  onChange={(e) => handleAdvisorAssign(selectedEnquiry.id || selectedEnquiry._id, e.target.value)}
                  style={{ width: "100%", height: 32, fontSize: 12 }}
                  disabled={assigningId === (selectedEnquiry.id || selectedEnquiry._id)}
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
                  {formatPhoneDisplay(getPhoneRaw(selectedEnquiry))}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, color: "var(--text-fog)", textTransform: "uppercase" }}>Email Address</div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent-teal)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedEnquiry.email || "—"}
                </div>
              </div>
            </div>

            {/* Topic & Message */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "var(--text-fog)", textTransform: "uppercase", marginBottom: 3 }}>
                Topic: <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{selectedEnquiry.topic || "General"}</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--text-main)", lineHeight: 1.4 }}>
                {selectedEnquiry.message || "No additional message provided."}
              </p>
            </div>

            {/* WhatsApp Quick Chat */}
            {getCleanPhoneDigits(getPhoneRaw(selectedEnquiry)) && (
              <a
                href={`https://wa.me/91${getCleanPhoneDigits(getPhoneRaw(selectedEnquiry))}?text=${encodeURIComponent(`Hello ${selectedEnquiry.name || ""}, thank you for contacting Your Wealth Compass.`)}`}
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
                  textDecoration: "none"
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