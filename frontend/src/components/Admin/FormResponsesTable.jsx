import React, { useState } from "react";
import {
  Search,
  Filter,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  Calendar,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  FileSpreadsheet,
  User,
  ArrowUpDown
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { assignFormResponseAdvisorApi } from "../../services/api";

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

export default function FormResponsesTable({ teamUsers = [], adminToken = "", onRefresh = () => {} }) {
  const handleAdvisorAssign = async (responseId, advisorId, e) => {
    if (e) e.stopPropagation();
    try {
      const chosen = teamUsers.find((u) => u.id === advisorId || u._id === advisorId);
      const payload = chosen
        ? {
            advisorId: chosen.id || chosen._id,
            advisorName: chosen.name,
            advisorEmail: chosen.email,
            advisorDesignation: chosen.designation || "Certified Financial Advisor"
          }
        : { advisorId: null, advisorName: "", advisorEmail: "", advisorDesignation: "Certified Financial Advisor" };

      const res = await assignFormResponseAdvisorApi(responseId, payload, adminToken);
      if (res?.success) {
        setActionNotice(`Assigned to ${payload.advisorName || "Unassigned"}`);
        setTimeout(() => setActionNotice(""), 3000);
        onRefresh();
      }
    } catch (err) {
      alert("Failed to assign response: " + err.message);
    }
  };
  const { formResponses = [], updateFormResponseStatus, deleteFormResponse } = useApp();

  const [searchTerm, setSearchTerm] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [profFilter, setProfFilter] = useState("all");
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [actionNotice, setActionNotice] = useState("");

  const safeResponses = Array.isArray(formResponses) ? formResponses : [];

  // Unique filter choices
  const availableCities = Array.from(new Set(safeResponses.map((r) => r.city).filter(Boolean)));
  const availableProfessions = Array.from(new Set(safeResponses.map((r) => r.profession).filter(Boolean)));

  // Stats
  const totalCount = safeResponses.length;
  const newCount = safeResponses.filter((r) => !r.status || r.status === "new").length;
  const contactedCount = safeResponses.filter((r) => r.status === "contacted").length;
  const convertedCount = safeResponses.filter((r) => r.status === "converted").length;

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
    if (e && e.stopPropagation) e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the form response from "${name || "this applicant"}"?`)) {
      await deleteFormResponse(id, adminToken);
      if (selectedResponse && (selectedResponse.id === id || selectedResponse._id === id)) {
        setSelectedResponse(null);
      }
      setActionNotice("Form response removed");
      setTimeout(() => setActionNotice(""), 2200);
      onRefresh();
    }
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert("No records to export.");
      return;
    }
    const headers = ["Name", "Mobile", "Email", "City", "Highest Education", "Current Profession", "Status", "Date"];
    const rows = filtered.map((r) => [
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${r.mobile || ""}"`,
      `"${r.email || ""}"`,
      `"${(r.city || "").replace(/"/g, '""')}"`,
      `"${(r.education || "").replace(/"/g, '""')}"`,
      `"${(r.profession || "").replace(/"/g, '""')}"`,
      `"${r.status || "new"}"`,
      `"${r.submittedAt || r.createdAt || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Forms_Responses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateTime = (val) => {
    if (!val) return "Just now";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div style={{ width: "100%", textAlign: "left" }}>
      {/* SUMMARY STATS BAR */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 20
        }}
      >
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 14,
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-fog)", fontWeight: 600, textTransform: "uppercase" }}>
            Total Applications
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF" }}>{totalCount}</div>
        </div>

        <div
          style={{
            background: "rgba(95, 168, 160, 0.08)",
            border: "1px solid rgba(95, 168, 160, 0.25)",
            borderRadius: 14,
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}
        >
          <div style={{ fontSize: 12, color: "#5FA8A0", fontWeight: 600, textTransform: "uppercase" }}>
            New / Uncontacted
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#5FA8A0" }}>{newCount}</div>
        </div>

        <div
          style={{
            background: "rgba(201, 154, 75, 0.08)",
            border: "1px solid rgba(201, 154, 75, 0.25)",
            borderRadius: 14,
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}
        >
          <div style={{ fontSize: 12, color: "#C99A4B", fontWeight: 600, textTransform: "uppercase" }}>
            In Progress / Contacted
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#C99A4B" }}>{contactedCount}</div>
        </div>

        <div
          style={{
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: 14,
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}
        >
          <div style={{ fontSize: 12, color: "#10B981", fontWeight: 600, textTransform: "uppercase" }}>
            Converted
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#10B981" }}>{convertedCount}</div>
        </div>
      </div>

      {/* ACTION NOTICE TOAST */}
      {actionNotice && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 18px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid #10B981",
            borderRadius: 10,
            color: "#10B981",
            fontSize: 13,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            animation: "fadeIn 0.2s ease"
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* FILTER & CONTROLS TOOLBAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap"
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <Search
            size={17}
            color="var(--text-fog)"
            style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search by Name, Mobile, Email, City..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              height: 46,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-medium, rgba(255, 255, 255, 0.12))",
              borderRadius: 12,
              padding: "0 16px 0 46px",
              color: "#FFFFFF",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Filters and CSV Export */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{
              height: 46,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
              color: "var(--text-main, #FFFFFF)",
              padding: "0 14px",
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            <option value="all" style={{ background: "#0B0D14" }}>All Cities</option>
            {availableCities.map((c) => (
              <option key={c} value={c} style={{ background: "#0B0D14" }}>{c}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 46,
              borderRadius: 12,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
              color: "var(--text-main, #FFFFFF)",
              padding: "0 14px",
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            <option value="all" style={{ background: "#0B0D14" }}>All Statuses</option>
            <option value="new" style={{ background: "#0B0D14" }}>New</option>
            <option value="contacted" style={{ background: "#0B0D14" }}>Contacted</option>
            <option value="meeting_scheduled" style={{ background: "#0B0D14" }}>Meeting Scheduled</option>
            <option value="converted" style={{ background: "#0B0D14" }}>Converted</option>
            <option value="archived" style={{ background: "#0B0D14" }}>Archived</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            style={{
              height: 46,
              padding: "0 16px",
              borderRadius: 12,
              background: "rgba(201, 154, 75, 0.12)",
              border: "1px solid rgba(201, 154, 75, 0.35)",
              color: "var(--accent-gold, #C99A4B)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease"
            }}
            title="Download CSV for Excel or Google Sheets"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div
        style={{
          background: "var(--bg-surface, #0D0E15)",
          border: "1px solid var(--border-medium, rgba(255, 255, 255, 0.1))",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.5)"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 840, fontSize: 14 }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "var(--text-fog, #8FA0AC)",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em"
                }}
              >
                <th style={{ padding: "14px 16px", textAlign: "left" }}>Applicant Name</th>
                <th style={{ padding: "14px 16px", textAlign: "left" }}>Phone Number</th>
                <th style={{ padding: "14px 16px", textAlign: "left" }}>Email Address</th>
                <th style={{ padding: "14px 16px", textAlign: "left" }}>City</th>
                <th style={{ padding: "14px 16px", textAlign: "left" }}>Education</th>
                <th style={{ padding: "14px 16px", textAlign: "left" }}>Profession</th>
                <th style={{ padding: "14px 16px", textAlign: "left" }}>Assigned Advisor</th>
                <th style={{ padding: "14px 16px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "14px 18px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-fog)" }}>
                    <FileSpreadsheet size={36} color="var(--text-fog)" style={{ margin: "0 auto 12px", opacity: 0.6 }} />
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginBottom: 6 }}>
                      No Form Applications Found
                    </div>
                    <p style={{ fontSize: 13, maxWidth: 360, margin: "0 auto" }}>
                      Responses submitted via <code>/forms</code> will appear here automatically with full details and instant WhatsApp action.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const itemId = item.id || item._id;
                  const st = STATUS_CONFIGS[item.status || "new"] || STATUS_CONFIGS.new;
                  const rawPhone = getPhoneRaw(item);
                  const cleanPhone = getCleanPhoneDigits(rawPhone);
                  const displayPhone = formatPhoneDisplay(rawPhone);
                  const waLink = cleanPhone
                    ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${item.name || ""}, thank you for your application on Your Wealth Compass. We would like to schedule your expert session.`)}`
                    : null;

                  return (
                    <tr
                      key={itemId || idx}
                      onClick={() => setSelectedResponse(item)}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                        background: idx % 2 === 0 ? "rgba(255, 255, 255, 0.01)" : "transparent"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)")}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = idx % 2 === 0 ? "rgba(255, 255, 255, 0.01)" : "transparent")
                      }
                    >
                      {/* 1. APPLICANT NAME */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "rgba(201, 154, 75, 0.14)",
                              border: "1px solid rgba(201, 154, 75, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--accent-gold, #C99A4B)",
                              fontWeight: 700,
                              fontSize: 14,
                              flexShrink: 0
                            }}
                          >
                            {(item.name || "A")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#FFFFFF", fontSize: 14 }}>
                              {item.name || "Anonymous Applicant"}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.4)", marginTop: 2 }}>
                              {formatDateTime(item.submittedAt || item.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. PHONE NUMBER & DIRECT ACTIONS */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#FFFFFF", fontSize: 14, letterSpacing: "0.02em" }}>
                            <Phone size={13} color="var(--accent-gold)" />
                            <span>{displayPhone}</span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "rgba(37, 211, 102, 0.14)",
                                  border: "1px solid rgba(37, 211, 102, 0.35)",
                                  borderRadius: 6,
                                  padding: "3px 8px",
                                  color: "#25D366",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  textDecoration: "none"
                                }}
                                title="Chat on WhatsApp"
                              >
                                <MessageCircle size={12} /> WhatsApp
                              </a>
                            )}
                            {cleanPhone && (
                              <a
                                href={`tel:${cleanPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  background: "rgba(255, 255, 255, 0.06)",
                                  border: "1px solid rgba(255, 255, 255, 0.14)",
                                  borderRadius: 6,
                                  padding: "3px 8px",
                                  color: "var(--text-ivory)",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  textDecoration: "none"
                                }}
                                title="Direct Call"
                              >
                                Call
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. EMAIL ADDRESS */}
                      <td style={{ padding: "14px 16px" }}>
                        {item.email ? (
                          <a
                            href={`mailto:${item.email}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              color: "#38BDF8",
                              fontSize: 13,
                              fontWeight: 500,
                              textDecoration: "none",
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                            title={`Send email to ${item.email}`}
                          >
                            <Mail size={13} style={{ flexShrink: 0 }} />
                            <span>{item.email}</span>
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-fog)", fontSize: 13 }}>—</span>
                        )}
                      </td>

                      {/* CITY */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#FFFFFF" }}>
                          <MapPin size={13} color="#5FA8A0" />
                          <span>{item.city || "—"}</span>
                        </div>
                      </td>

                      {/* EDUCATION */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-ivory)", fontSize: 13 }}>
                          <GraduationCap size={13} color="#A78BFA" />
                          <span>{item.education || "—"}</span>
                        </div>
                      </td>

                      {/* PROFESSION */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--accent-gold)", fontSize: 13, fontWeight: 600 }}>
                          <Briefcase size={13} />
                          <span>{item.profession || "—"}</span>
                        </div>
                      </td>

                      {/* STATUS SELECTOR */}
                      <td style={{ padding: "14px 16px" }}>
                        <select
                          value={item.status || "new"}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChange(itemId, e.target.value);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: st.bg,
                            border: `1px solid ${st.border}`,
                            color: st.color,
                            padding: "4px 8px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
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

                      {/* ACTIONS */}
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedResponse(item);
                            }}
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              borderRadius: 8,
                              padding: "6px 9px",
                              color: "var(--text-ivory)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                            title="View Full Application"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(itemId, item.name, e)}
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                              borderRadius: 8,
                              padding: "6px 9px",
                              color: "#EF4444",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                            title="Delete Response"
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* MODAL: FULL FORM RESPONSE DETAIL */}
      {selectedResponse && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
          onClick={() => setSelectedResponse(null)}
        >
          <div
            style={{
              background: "var(--bg-surface, #0D0E15)",
              border: "1px solid var(--border-gold, rgba(201, 154, 75, 0.4))",
              borderRadius: 20,
              maxWidth: 540,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 28,
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9)",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedResponse(null)}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                cursor: "pointer"
              }}
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: "rgba(201, 154, 75, 0.15)",
                  border: "1px solid var(--accent-gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent-gold)",
                  fontWeight: 800,
                  fontSize: 18
                }}
              >
                {(selectedResponse.name || "A")[0].toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", margin: 0 }}>
                  {selectedResponse.name || "Applicant"}
                </h3>
                <div style={{ fontSize: 12, color: "var(--text-fog)", marginTop: 2 }}>
                  Form Application • {formatDateTime(selectedResponse.submittedAt || selectedResponse.createdAt)}
                </div>
              </div>
            </div>

            {/* Application Data Grid */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: 18,
                marginBottom: 22
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-fog)" }}>Mobile Phone:</span>
                <strong style={{ fontSize: 14, color: "#FFFFFF" }}>{formatPhoneDisplay(getPhoneRaw(selectedResponse))}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-fog)" }}>Email Address:</span>
                <strong style={{ fontSize: 14, color: "#FFFFFF" }}>{selectedResponse.email || "—"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-fog)" }}>City / Location:</span>
                <strong style={{ fontSize: 14, color: "#5FA8A0" }}>{selectedResponse.city || "—"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: "var(--text-fog)" }}>Highest Education:</span>
                <strong style={{ fontSize: 14, color: "#A78BFA" }}>{selectedResponse.education || "—"}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--text-fog)" }}>Current Profession:</span>
                <strong style={{ fontSize: 14, color: "var(--accent-gold)" }}>{selectedResponse.profession || "—"}</strong>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {getCleanPhoneDigits(getPhoneRaw(selectedResponse)) && (
                <a
                  href={`https://wa.me/91${getCleanPhoneDigits(getPhoneRaw(selectedResponse))}?text=${encodeURIComponent(`Hello ${selectedResponse.name || ""}, thank you for your application on Your Wealth Compass.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    minWidth: 140,
                    height: 42,
                    background: "rgba(37, 211, 102, 0.15)",
                    border: "1px solid #25D366",
                    borderRadius: 10,
                    color: "#25D366",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none"
                  }}
                >
                  <MessageCircle size={15} /> WhatsApp
                </a>
              )}

              {getCleanPhoneDigits(getPhoneRaw(selectedResponse)) && (
                <a
                  href={`tel:${getCleanPhoneDigits(getPhoneRaw(selectedResponse))}`}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    height: 42,
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                    borderRadius: 10,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none"
                  }}
                >
                  <Phone size={15} /> Call Now
                </a>
              )}

              {selectedResponse.email && (
                <a
                  href={`mailto:${selectedResponse.email}`}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    height: 42,
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    borderRadius: 10,
                    color: "#38BDF8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none"
                  }}
                >
                  <Mail size={15} /> Email
                </a>
              )}
            </div>

            {/* Pipeline Stage Change */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <span style={{ fontSize: 13, color: "var(--text-fog)" }}>Pipeline Status:</span>
              <select
                value={selectedResponse.status || "new"}
                onChange={(e) => {
                  const val = e.target.value;
                  const itemId = selectedResponse.id || selectedResponse._id;
                  handleStatusChange(itemId, val);
                  setSelectedResponse((prev) => ({ ...prev, status: val }));
                }}
                style={{
                  height: 38,
                  borderRadius: 8,
                  background: "#0B0D14",
                  border: "1px solid var(--border-gold, rgba(201, 154, 75, 0.4))",
                  color: "#FFFFFF",
                  padding: "0 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                <option value="new">● New</option>
                <option value="contacted">● Contacted</option>
                <option value="meeting_scheduled">● Meeting Scheduled</option>
                <option value="converted">✓ Converted</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
