import React, { useState } from "react";
import {
  Mail, Search, Trash2, Eye, Calendar, User, MessageSquare, Tag, X, Sparkles,
  Phone, MessageCircle, MapPin, Briefcase, GraduationCap, UserCheck, Shield, Globe, Lock
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
  const [advisorFilter, setAdvisorFilter] = useState("all");
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
    let advPass = true;
    if (advisorFilter === "unassigned") {
      advPass = !currentAdvId;
    } else if (advisorFilter === "all_advisors") {
      advPass = currentAdvId === "all_advisors";
    } else if (advisorFilter === "superadmin_only") {
      advPass = currentAdvId === "superadmin_only";
    } else if (advisorFilter !== "all") {
      advPass = currentAdvId === advisorFilter;
    }

    return searchPass && topicPass && advPass;
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
    <div style={{ width: "100%", textAlign: "left" }}>
      {actionNotice && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#34D399", padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {actionNotice}
        </div>
      )}

      {/* TOOLBAR */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", flex: 1, minWidth: 280 }}>
          {/* Search Bar */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={16} color="var(--text-fog)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search enquiries by name, email, phone, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ff-input"
              style={{ paddingLeft: 38, width: "100%" }}
            />
          </div>

          {/* Visibility / Advisor Filter (Super Admin only) */}
          {adminRole === "superadmin" && (
            <select
              className="ff-select"
              value={advisorFilter}
              onChange={(e) => setAdvisorFilter(e.target.value)}
              style={{ minWidth: 170 }}
            >
              <option value="all">All Visibility</option>
              <option value="all_advisors">🌐 Shared With All Advisors</option>
              <option value="superadmin_only">👑 Super Admin Only</option>
              <option value="unassigned">⚠️ Unassigned / Hidden</option>
              <optgroup label="Filter By Advisor">
                {teamUsers.map((u) => (
                  <option key={u.id || u._id} value={u.id || u._id}>
                    👤 {u.name}
                  </option>
                ))}
              </optgroup>
            </select>
          )}

          {/* Topic Filter */}
          <select
            className="ff-select"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            style={{ minWidth: 160 }}
          >
            {topicsList.map((t) => (
              <option key={t} value={t === "All Topics" ? "all" : t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 12.5, color: "var(--text-fog)", fontWeight: 600 }}>
          Showing <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{filteredEnquiries.length}</span> of {effectiveEnquiries.length} enquiries
        </div>
      </div>

      {/* TABLE */}
      {filteredEnquiries.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, color: "var(--text-fog)" }}>
          <Mail size={36} color="var(--text-fog)" style={{ margin: "0 auto 12px", opacity: 0.5 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
            No Enquiries Found
          </div>
          <p style={{ fontSize: 13, margin: 0 }}>Try clearing your search or changing the filter options.</p>
        </div>
      ) : (
        <div className="ff-table-wrapper" style={{ overflowX: "auto" }}>
          <table className="ff-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ padding: "14px 16px" }}>Date & Time</th>
                <th style={{ padding: "14px 16px" }}>Client Name</th>
                <th style={{ padding: "14px 16px" }}>Phone Number</th>
                <th style={{ padding: "14px 16px" }}>Email</th>
                <th style={{ padding: "14px 16px" }}>Visibility / Assigned</th>
                <th style={{ padding: "14px 16px" }}>Topic</th>
                <th style={{ padding: "14px 16px" }}>Message</th>
                <th style={{ padding: "14px 16px", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnquiries.map((enq) => {
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
                    style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", transition: "background 0.15s ease" }}
                    className="ff-table-row-hover"
                  >
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap", color: "var(--text-fog)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Calendar size={13} color="var(--accent-gold)" />
                        {enq.submittedAt ? new Date(enq.submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                      </div>
                    </td>

                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap" }}>
                      {enq.name || "Client"}
                    </td>

                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-main)" }}>
                        <Phone size={12} color="var(--accent-gold)" />
                        <span>{displayPhone}</span>
                      </div>
                    </td>

                    <td style={{ padding: "14px 16px", color: "var(--text-fog)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {enq.email || "—"}
                    </td>

                    {/* ASSIGNED ADVISOR / VISIBILITY DROPDOWN */}
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      {adminRole === "superadmin" ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <select
                            className="ff-select"
                            value={assignedAdvId}
                            onChange={(e) => handleAdvisorAssign(enqId, e.target.value, e)}
                            style={{ padding: "4px 8px", fontSize: 12, minWidth: 155 }}
                            disabled={assigningId === enqId}
                          >
                            <option value="">⚠️ Unassigned (Hidden)</option>
                            <option value="all_advisors">🌐 All Advisors (Shared)</option>
                            <option value="superadmin_only">👑 Super Admin Only</option>
                            <optgroup label="Assign Specific Advisor">
                              {teamUsers.map((u) => (
                                <option key={u.id || u._id} value={u.id || u._id}>
                                  👤 {u.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                          {enq.referralCode && (
                            <span style={{ fontSize: 10, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                              🔗 Ref: {enq.referralCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-gold)" }}>
                            {assignedAdvId === "all_advisors" ? "🌐 Shared With Team" : `👤 ${enq.assignedTo?.advisorName || "Assigned to You"}`}
                          </span>
                          {enq.referralCode && (
                            <span style={{ fontSize: 10, color: "var(--text-fog)", fontFamily: "var(--font-mono)" }}>
                              🔗 Ref: {enq.referralCode}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11.5, fontWeight: 600, background: topicStyle.bg, color: topicStyle.text, border: `1px solid ${topicStyle.border}` }}>
                        {enq.topic || "General"}
                      </span>
                    </td>

                    <td style={{ padding: "14px 16px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-fog)" }}>
                      {enq.message || "—"}
                    </td>

                    <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedEnquiry(enq)}
                          className="ff-btn-ghost"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          <Eye size={13} />
                        </button>
                        {adminRole === "superadmin" && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(enqId, e)}
                            className="ff-btn-ghost"
                            style={{ padding: "4px 8px", fontSize: 12, color: "#EF4444" }}
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
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)", borderRadius: 18, width: "100%", maxWidth: 540, padding: 26, boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", paddingBottom: 14, marginBottom: 18 }}>
              <div>
                <span className="ff-badge ff-badge-gold" style={{ fontSize: 10.5, marginBottom: 4 }}>Enquiry Details</span>
                <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "var(--text-main)" }}>
                  {selectedEnquiry.name || "Advisory Lead"}
                </h3>
              </div>
              <button onClick={() => setSelectedEnquiry(null)} style={{ background: "none", border: "none", color: "var(--text-fog)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            {/* SUPER ADMIN VISIBILITY / ASSIGNMENT CARD */}
            {adminRole === "superadmin" && (
              <div style={{ background: "rgba(201, 154, 75, 0.08)", border: "1px dashed var(--border-gold)", borderRadius: 12, padding: "12px 16px", marginBottom: 18 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--accent-gold)", fontWeight: 700, letterSpacing: "0.05em", marginBottom: 6 }}>
                  Visibility & Advisor Assignment
                </div>
                <select
                  className="ff-select"
                  value={selectedEnquiry.assignedTo?.advisorId || ""}
                  onChange={(e) => handleAdvisorAssign(selectedEnquiry.id || selectedEnquiry._id, e.target.value)}
                  style={{ width: "100%" }}
                  disabled={assigningId === (selectedEnquiry.id || selectedEnquiry._id)}
                >
                  <option value="">⚠️ Unassigned (Hidden from Advisors)</option>
                  <option value="all_advisors">🌐 All Advisors (Shared with entire team)</option>
                  <option value="superadmin_only">👑 Super Admin Only (Private to me)</option>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10.5, color: "var(--text-fog)", textTransform: "uppercase" }}>Phone Number</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", marginTop: 2 }}>
                  {formatPhoneDisplay(getPhoneRaw(selectedEnquiry))}
                </div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10.5, color: "var(--text-fog)", textTransform: "uppercase" }}>Email Address</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-teal)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {selectedEnquiry.email || "—"}
                </div>
              </div>
            </div>

            {/* Topic & Message */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px 16px", borderRadius: 12, border: "1px solid var(--border-subtle)", marginBottom: 18 }}>
              <div style={{ fontSize: 10.5, color: "var(--text-fog)", textTransform: "uppercase", marginBottom: 4 }}>
                Topic: <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>{selectedEnquiry.topic || "General"}</span>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--text-main)", lineHeight: 1.5 }}>
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
                  gap: 8,
                  background: "#25D366",
                  color: "#07080C",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "10px 16px",
                  borderRadius: 10,
                  textDecoration: "none"
                }}
              >
                <MessageCircle size={15} /> Chat with Client on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
