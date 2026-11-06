import React, { useState } from "react";
import {
  Search, Phone, Download, Trash2, Eye
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { assignFormResponseAdvisorApi } from "../../services/api";

const STATUS_CONFIGS = {
  new: { label: "● New", color: "#5FA8A0", bg: "rgba(95, 168, 160, 0.15)", border: "rgba(95, 168, 160, 0.3)" },
  contacted: { label: "● Contacted", color: "#C99A4B", bg: "rgba(201, 154, 75, 0.15)", border: "rgba(201, 154, 75, 0.3)" },
  meeting_scheduled: { label: "● Meeting Scheduled", color: "#A78BFA", bg: "rgba(167, 139, 250, 0.15)", border: "rgba(167, 139, 250, 0.3)" },
  converted: { label: "✓ Converted", color: "#10B981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" },
  archived: { label: "Archived", color: "#8FA0AC", bg: "rgba(255, 255, 255, 0.05)", border: "var(--border-subtle)" }
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
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [actionNotice, setActionNotice] = useState("");
  const [assigningId, setAssigningId] = useState(null);

  const safeResponses = Array.isArray(formResponses) ? formResponses : [];
  const availableCities = Array.from(new Set(safeResponses.map((r) => r.city).filter(Boolean)));

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
        setActionNotice(`Visibility updated: ${payload.advisorName}`);
        setTimeout(() => setActionNotice(""), 2500);
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

    const currentAdvId = r.assignedTo?.advisorId || "";

    // 1. Advisor Filter (Person / Team only)
    if (advisorFilter !== "all") {
      if (currentAdvId !== advisorFilter) return false;
    }

    // 2. Visibility Filter (Show to All / Show to None / Unassigned)
    if (visibilityFilter === "all_advisors") {
      if (currentAdvId !== "all_advisors") return false;
    } else if (visibilityFilter === "superadmin_only") {
      if (currentAdvId !== "superadmin_only") return false;
    } else if (visibilityFilter === "unassigned") {
      if (currentAdvId) return false;
    }

    return true;
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
    <div className="ff-crm-container" style={{ width: "100%", textAlign: "left" }}>
      {actionNotice && (
        <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34D399", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {actionNotice}
        </div>
      )}

      {/* 1. Full-Width Clean Search Bar */}
      <div style={{ position: "relative", width: "100%", marginBottom: 14 }}>
        <div style={{ position: "absolute", left: 16, top: 0, bottom: 0, display: "flex", alignItems: "center", pointerEvents: "none", zIndex: 3 }}>
          <Search size={17} color="var(--text-fog)" />
        </div>
        <input
          type="text"
          className="ff-input ff-crm-search-input"
          placeholder="Search applications by name, email, phone, city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 2. Compact Horizontal Filters Row */}
      <div className="ff-crm-filters-bar">
        <div className="ff-crm-filter-group">
          {/* Filter by Advisor (Name / Person / Team only) */}
          <select
            className="ff-select ff-crm-filter-select"
            value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            style={{ minWidth: 160 }}
          >
            <option value="all">All Advisors</option>
            <optgroup label="Advisors & Team Members">
              {teamUsers.map((u) => (
                <option key={u.id || u._id} value={u.id || u._id}>
                  👤 {u.name} {u.role === "advisor_creator" ? "(Creator)" : ""}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Visibility Filter (Show to All / Show to None) */}
          <select
            className="ff-select ff-crm-filter-select"
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            style={{ minWidth: 175 }}
          >
            <option value="all">Visibility: All</option>
            <option value="all_advisors">🌐 Show to All Advisors</option>
            <option value="superadmin_only">🔒 Show to No Advisors</option>
            <option value="unassigned">⚠️ Unassigned (Hidden)</option>
          </select>

          {/* Status Filter */}
          <select
            className="ff-select ff-crm-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="new">● New</option>
            <option value="contacted">● Contacted</option>
            <option value="meeting_scheduled">● Meeting Scheduled</option>
            <option value="converted">✓ Converted</option>
            <option value="archived">Archived</option>
          </select>

          {/* City Filter */}
          {availableCities.length > 0 && (
            <select
              className="ff-select ff-crm-filter-select"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            >
              <option value="all">All Cities</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          <button onClick={exportCSV} className="ff-btn-ghost ff-crm-export-btn">
            <Download size={13} /> Export CSV
          </button>
        </div>

        <div style={{ fontSize: 12, color: "var(--text-fog)", fontWeight: 600 }}>
          Showing {filtered.length} of {safeResponses.length}
        </div>
      </div>

      {/* 3. Clean Table */}
      {filtered.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, color: "var(--text-fog)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
            No Form Applications Found
          </div>
          <p style={{ fontSize: 13, margin: 0 }}>Try clearing your search or filter options.</p>
        </div>
      ) : (
        <div className="ff-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="ff-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Date</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Applicant Name</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Phone</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Email</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>City</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Visibility / Assign</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Status</th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Action</th>
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

                return (
                  <tr
                    key={itemId || idx}
                    onClick={() => setSelectedResponse(item)}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                      height: 44
                    }}
                    className="ff-table-row-hover"
                  >
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--text-fog)", fontSize: 12 }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                    </td>

                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", fontSize: 13 }}>
                      {item.name || "Applicant"}
                    </td>

                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", fontSize: 12.5 }} onClick={(e) => e.stopPropagation()}>
                      {cleanPhone ? (
                        <a
                          href={`https://wa.me/91${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--text-main)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                          title="Open WhatsApp chat"
                        >
                          <Phone size={12} color="var(--accent-gold)" />
                          <span>{displayPhone}</span>
                        </a>
                      ) : (
                        <span>{displayPhone}</span>
                      )}
                    </td>

                    <td style={{ padding: "10px 14px", color: "var(--text-fog)", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5 }}>
                      {item.email || "—"}
                    </td>

                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--text-main)", fontSize: 12.5 }}>
                      {item.city || "—"}
                    </td>

                    {/* ASSIGNED ADVISOR / VISIBILITY DROPDOWN */}
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      {adminRole === "superadmin" ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <select
                            className="ff-select"
                            value={assignedAdvId}
                            onChange={(e) => handleAdvisorAssign(itemId, e.target.value, e)}
                            style={{
                              height: 28,
                              padding: "0 8px",
                              fontSize: 12,
                              minWidth: 155,
                              borderRadius: 6
                            }}
                            disabled={assigningId === itemId}
                          >
                            <option value="">⚠️ Unassigned (Hidden)</option>
                            <option value="all_advisors">🌐 Show to All Advisors</option>
                            <option value="superadmin_only">🔒 Show to No Advisors</option>
                            <optgroup label="Assign to Advisor">
                              {teamUsers.map((u) => (
                                <option key={u.id || u._id} value={u.id || u._id}>
                                  👤 {u.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                          {item.referralCode && (
                            <span style={{ fontSize: 10, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                              ?ref={item.referralCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: assignedAdvId === "all_advisors" ? "#34D399" : "var(--accent-gold)" }}>
                          {assignedAdvId === "all_advisors" ? "🌐 Shared With Team" : `👤 ${item.assignedTo?.advisorName || "Assigned"}`}
                        </span>
                      )}
                    </td>

                    {/* STATUS DROPDOWN */}
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      <select
                        value={item.status || "new"}
                        onChange={(e) => handleStatusChange(itemId, e.target.value)}
                        style={{
                          background: st.bg,
                          border: `1px solid ${st.border}`,
                          color: st.color,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          height: 26,
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

                    <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedResponse(item)}
                          className="ff-btn-ghost"
                          style={{ height: 26, width: 26, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}
                          title="View Application"
                        >
                          <Eye size={13} />
                        </button>
                        {adminRole === "superadmin" && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(itemId, item.name, e)}
                            className="ff-btn-ghost"
                            style={{ height: 26, width: 26, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, color: "#F87171" }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
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
                  <option value="">⚠️ Unassigned (Hidden)</option>
                  <option value="all_advisors">🌐 Show to All Advisors</option>
                  <option value="superadmin_only">🔒 Show to No Advisors</option>
                  <optgroup label="Assign to Advisor">
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
                Chat with Client on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}