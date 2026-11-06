import React, { useState } from "react";
import {
  Search, Phone, Trash2, Eye
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { assignEnquiryAdvisorApi } from "../../services/api";

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
  const [advisorFilter, setAdvisorFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [actionNotice, setActionNotice] = useState("");

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
        setActionNotice(`Visibility updated: ${payload.advisorName}`);
        setTimeout(() => setActionNotice(""), 2500);
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

    return searchPass && topicPass;
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

  const getTopicColor = (topic) => {
    if ((topic || "").includes("Application") || (topic || "").includes("Form")) return { bg: "rgba(201, 154, 75, 0.15)", text: "#C99A4B", border: "rgba(201, 154, 75, 0.4)" };
    if ((topic || "").includes("Financial")) return { bg: "rgba(201, 154, 75, 0.15)", text: "#C99A4B", border: "rgba(201, 154, 75, 0.4)" };
    if ((topic || "").includes("Retirement")) return { bg: "rgba(95, 168, 160, 0.15)", text: "#5FA8A0", border: "rgba(95, 168, 160, 0.4)" };
    if ((topic || "").includes("Protection") || (topic || "").includes("Insurance")) return { bg: "rgba(244, 63, 94, 0.15)", text: "#F43F5E", border: "rgba(244, 63, 94, 0.4)" };
    return { bg: "rgba(255, 255, 255, 0.05)", text: "var(--text-fog)", border: "var(--border-subtle)" };
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
          placeholder="Search enquiries by name, email, phone, city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 2. Compact Horizontal Filters Row */}
      <div className="ff-crm-filters-bar">
        <div className="ff-crm-filter-group">
          {/* Topic Filter */}
          <select
            className="ff-select ff-crm-filter-select"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
          >
            {topicsList.map((t) => (
              <option key={t} value={t === "All Topics" ? "all" : t}>
                {t}
              </option>
            ))}
          </select>

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
        </div>

        <div style={{ fontSize: 12, color: "var(--text-fog)", fontWeight: 600 }}>
          Showing {filteredEnquiries.length} of {effectiveEnquiries.length}
        </div>
      </div>

      {/* 3. Clean Table */}
      {filteredEnquiries.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, color: "var(--text-fog)" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
            No Enquiries Found
          </div>
          <p style={{ fontSize: 13, margin: 0 }}>Try clearing your search or changing filter options.</p>
        </div>
      ) : (
        <div className="ff-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="ff-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Date</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Client Name</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Phone</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Email</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Visibility / Assign</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Topic</th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Message</th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 11, textTransform: "uppercase", color: "var(--text-fog)", letterSpacing: "0.04em" }}>Action</th>
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

                return (
                  <tr
                    key={enqId}
                    onClick={() => setSelectedEnquiry(enq)}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                      height: 44
                    }}
                    className="ff-table-row-hover"
                  >
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--text-fog)", fontSize: 12 }}>
                      {enq.submittedAt ? new Date(enq.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                    </td>

                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", fontSize: 13 }}>
                      {enq.name || "Client"}
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
                      {enq.email || "—"}
                    </td>

                    {/* ASSIGNED ADVISOR / VISIBILITY DROPDOWN */}
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      {adminRole === "superadmin" ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <select
                            className="ff-select"
                            value={assignedAdvId}
                            onChange={(e) => handleAdvisorAssign(enqId, e.target.value, e)}
                            style={{
                              height: 28,
                              padding: "0 8px",
                              fontSize: 12,
                              minWidth: 155,
                              borderRadius: 6
                            }}
                            disabled={assigningId === enqId}
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
                          {enq.referralCode && (
                            <span style={{ fontSize: 10, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                              ?ref={enq.referralCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: assignedAdvId === "all_advisors" ? "#34D399" : "var(--accent-gold)" }}>
                          {assignedAdvId === "all_advisors" ? "🌐 Shared With Team" : `👤 ${enq.assignedTo?.advisorName || "Assigned"}`}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: topicStyle.bg, color: topicStyle.text, border: `1px solid ${topicStyle.border}` }}>
                        {enq.topic || "General"}
                      </span>
                    </td>

                    <td style={{ padding: "10px 14px", maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-fog)", fontSize: 12 }}>
                      {enq.message || "—"}
                    </td>

                    <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedEnquiry(enq)}
                          className="ff-btn-ghost"
                          style={{ height: 26, width: 26, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}
                          title="View Details"
                        >
                          <Eye size={13} />
                        </button>
                        {adminRole === "superadmin" && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(enqId, e)}
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
                Chat with Client on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}