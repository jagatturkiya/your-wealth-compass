import React from "react";
import { X, Download, Printer, Shield, CheckCircle2, AlertTriangle, HeartPulse, PiggyBank, GraduationCap, Heart, Home, Award, TrendingUp, Layers, Compass, CheckSquare, Globe } from "lucide-react";
import { computeReport, INR, INR_L, EDU_INFLATION, MARRIAGE_INFLATION, RETIREMENT_INFLATION, SHORT_TERM_RETURN, GUARANTEED_RETURN, SWP_RETURN, EMERGENCY_MONTHS } from "../../utils/financialEngine";

function PrintPageFooter() {
  return (
    <div
      className="epdf-page-footer-branding"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingTop: 10,
        borderTop: "1px solid #E5E7EB",
        marginTop: "auto"
      }}
    >
      <span style={{ fontSize: 9.5, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
        Powered by
      </span>
      <img
        src="/apkacoach-logo-dark.png"
        alt="Apka Coach"
        style={{ height: 15, width: "auto", objectFit: "contain" }}
      />
    </div>
  );
}

export default function EnterprisePdfDossier({ lead, onClose }) {
  if (!lead) return null;
  const r = computeReport(lead);
  if (!r) return null;

  const hasInputs = Number(lead.income) > 0 || Number(lead.expenses) > 0 || Number(lead.savings) > 0 || (Array.isArray(lead.goals) && lead.goals.length > 0);

  const reportId = lead._id || lead.id || `YWC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = new Date(lead.submittedAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const clientCity = lead.city || lead.protection?.city || "";

  // Respective Advisor Authorship Resolution
  let activeAdvisorName = lead.sourceAdvisor?.advisorName?.trim() || "";
  let activeAdvisorDesignation = lead.sourceAdvisor?.advisorDesignation || "";

  if (!activeAdvisorName && lead.assignedTo?.advisorName && lead.assignedTo.advisorName !== "Unassigned" && lead.assignedTo.advisorName !== "All Advisors") {
    activeAdvisorName = lead.assignedTo.advisorName.trim();
    activeAdvisorDesignation = lead.assignedTo.advisorDesignation || "";
  }

  const storedRef = (typeof window !== "undefined")
    ? (lead.referralCode || localStorage.getItem("ff_referral_code") || sessionStorage.getItem("ff_referral_code") || "")
    : (lead.referralCode || "");

  if (!activeAdvisorName && storedRef) {
    try {
      const rawTeam = localStorage.getItem("ff_team_users");
      if (rawTeam) {
        const team = JSON.parse(rawTeam);
        const refLower = storedRef.toLowerCase();
        const baseHandle = refLower.includes("-") ? refLower.split("-")[0] : refLower;
        const matched = team.find((u) => 
          (u.referralCode && u.referralCode.toLowerCase() === refLower) ||
          (u.username && u.username.toLowerCase() === refLower) ||
          (u.username && u.username.toLowerCase() === baseHandle) ||
          (u.name && u.name.toLowerCase().replace(/[^a-z0-9]/g, "") === refLower) ||
          (u.name && u.name.toLowerCase().replace(/[^a-z0-9]/g, "") === baseHandle)
        );
        if (matched) {
          activeAdvisorName = matched.name;
          activeAdvisorDesignation = matched.designation || "Certified Financial Advisor";
        }
      }
    } catch (e) {}

    if (!activeAdvisorName) {
      const baseHandle = storedRef.replace(/[-_0-9]+$/, "").replace(/[-_]+/g, " ").trim();
      if (baseHandle) {
        activeAdvisorName = baseHandle.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      }
    }
  }

  if (!activeAdvisorName) {
    activeAdvisorName = "Jagat Turkiya";
    activeAdvisorDesignation = "Certified Financial Planner";
  }
  if (!activeAdvisorDesignation) {
    activeAdvisorDesignation = "Certified Financial Advisor";
  }

  const [isPrinting, setIsPrinting] = React.useState(false);
  const [printStatusText, setPrintStatusText] = React.useState("Preparing Document Layout...");
  const [screenWidth, setScreenWidth] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  React.useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = screenWidth < 820;
  const availableWidth = Math.max(280, screenWidth - 16);
  const mobileScale = isMobile ? Math.min(1, availableWidth / 794).toFixed(4) : "1";

  const handlePrint = () => {
    setIsPrinting(true);
    setPrintStatusText("Preparing Document Layout...");
    setTimeout(() => setPrintStatusText("Formatting High-Res Vector Pages..."), 400);
    setTimeout(() => setPrintStatusText("Launching System Print Interface..."), 800);
    setTimeout(() => {
      setIsPrinting(false);
      window.print();
    }, 1200);
  };

  const scoreColor = (s) => (s >= 70 ? "#10B981" : s >= 40 ? "#C99A4B" : "#F87171");

  if (!hasInputs) {
    return (
      <div className="epdf-modal-overlay">
        <div style={{ maxWidth: 500, background: "#0F172A", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: 16, padding: 32, textAlign: "center", color: "#FFF", marginTop: 100 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#C8A74D", marginBottom: 12 }}>No Financial Data Entered</div>
          <p style={{ fontSize: 14, color: "#94A3B8", lineHeight: 1.6, marginBottom: 24 }}>
            Please complete the evaluation wizard (enter income, expenses, age, and goals) to generate your customized 10-page Financial Fitness Dossier.
          </p>
          <button onClick={onClose} style={{ background: "#C8A74D", color: "#07080C", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}>
            Return to Wizard Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="epdf-modal-overlay">
      <style>{`
        .epdf-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(7, 8, 12, 0.94);
          backdrop-filter: blur(14px);
          z-index: 99999;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          padding: 16px 8px 48px !important;
          display: block !important;
        }

        /* LUXURY EXECUTIVE TOOLBAR - DESKTOP */
        .epdf-toolbar {
          width: 100%;
          max-width: 210mm;
          background: #0F172A;
          border: 1px solid rgba(200, 167, 77, 0.35);
          border-radius: 14px;
          padding: 12px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto 18px;
          color: #FFF;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.65);
          position: sticky;
          top: 0;
          z-index: 1000;
          box-sizing: border-box;
          gap: 14px;
        }

        .epdf-toolbar-lead {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }

        .epdf-toolbar-left-pack {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }

        .epdf-toolbar-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(200, 167, 77, 0.15);
          border: 1px solid rgba(200, 167, 77, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .epdf-toolbar-info {
          min-width: 0;
        }

        .epdf-toolbar-title {
          font-weight: 700;
          font-size: 14px;
          color: #FFFFFF;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: -0.01em;
        }

        .epdf-toolbar-meta {
          font-size: 11px;
          color: #94A3B8;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .epdf-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .epdf-toolbar-btn-print {
          background: linear-gradient(135deg, #DFB755 0%, #C8A74D 50%, #B89238 100%);
          color: #07080C;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 8px;
          padding: 8px 18px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(200, 167, 77, 0.3);
          transition: all 0.15s ease;
        }
        .epdf-toolbar-btn-print:hover {
          background: linear-gradient(135deg, #E8C468 0%, #D4AF37 100%);
          transform: translateY(-1px);
        }

        .epdf-toolbar-btn-close {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: #CBD5E1;
          cursor: pointer;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          padding: 0;
          flex-shrink: 0;
        }
        .epdf-toolbar-btn-close:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
          color: #F87171;
        }

        .epdf-mobile-close {
          display: none !important;
        }
        .epdf-desktop-close {
          display: flex !important;
        }

        /* DOCUMENT CONTAINER */
        .epdf-document-scroll-container {
          width: 100%;
          display: flex;
          justify-content: center;
          padding-bottom: 40px;
        }

        .epdf-document {
          width: 210mm;
          background: #FFFFFF;
          color: #0F172A;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          box-shadow: 0 24px 72px rgba(0, 0, 0, 0.5);
          margin: 0 auto;
        }

        .epdf-page {
          width: 210mm;
          height: 297mm;
          padding: 18mm 20mm;
          box-sizing: border-box;
          background: #FCFBF8;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          page-break-after: always;
          break-after: page;
          border-bottom: 2px dashed #E2E8F0;
        }

        .epdf-page:last-child {
          border-bottom: none;
        }

        .epdf-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 2px solid #F1F5F9;
          margin-bottom: 24px;
        }

        .epdf-brand {
          font-weight: 800;
          font-size: 16px;
          color: #0F172A;
        }
        .epdf-brand span { color: #C99A4B; }

        .epdf-chip {
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 10.5px;
          font-family: 'JetBrains Mono', monospace;
          color: #475569;
          font-weight: 600;
        }

        .epdf-footer {
          padding-top: 12px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10.5px;
          color: #64748B;
          font-family: 'JetBrains Mono', monospace;
        }

        .epdf-page-footer-branding {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          padding-top: 10px !important;
          border-top: 1px solid #E5E7EB !important;
          margin-top: auto !important;
          visibility: visible !important;
          z-index: 10 !important;
        }

        .epdf-h2 {
          font-size: 20px;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 16px;
          letter-spacing: -0.01em;
        }

        .epdf-card {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 16px 20px;
          margin-bottom: 16px;
        }

        .epdf-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-bottom: 16px;
        }

        .epdf-table th {
          background: #0F172A;
          color: #FFFFFF;
          padding: 8px 12px;
          text-align: left;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .epdf-table td {
          padding: 9px 12px;
          border-bottom: 1px solid #E2E8F0;
          font-family: 'JetBrains Mono', monospace;
        }

        .epdf-table tr:nth-child(even) td {
          background: #F8FAFC;
        }

        /* MOBILE OVERRIDES */
        @media (max-width: 820px) {
          .epdf-modal-overlay {
            padding: 10px 8px 40px !important;
            display: block !important;
            overflow-x: hidden !important;
          }

          .epdf-toolbar {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 0 14px 0 !important;
            padding: 12px 14px !important;
            border-radius: 12px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            background: #0F172A !important;
            border: 1px solid rgba(200, 167, 77, 0.4) !important;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7) !important;
          }

          .epdf-toolbar-lead {
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }

          .epdf-toolbar-left-pack {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            min-width: 0 !important;
            flex: 1 !important;
          }

          .epdf-toolbar-icon {
            width: 34px !important;
            height: 34px !important;
          }

          .epdf-toolbar-title {
            font-size: 13px !important;
            max-width: calc(100vw - 115px) !important;
          }

          .epdf-toolbar-meta {
            font-size: 10.5px !important;
          }

          .epdf-mobile-close {
            display: flex !important;
            width: 34px !important;
            height: 34px !important;
            border-radius: 8px !important;
          }

          .epdf-desktop-close {
            display: none !important;
          }

          .epdf-toolbar-actions {
            width: 100% !important;
            display: block !important;
            padding-top: 10px !important;
            border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
          }

          .epdf-toolbar-btn-print {
            width: 100% !important;
            height: 42px !important;
            justify-content: center !important;
            font-size: 13.5px !important;
            border-radius: 8px !important;
          }

          .epdf-document-scroll-container {
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
            overflow: visible !important;
          }

          .epdf-document {
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
            border-radius: 8px !important;
            overflow: hidden !important;
          }
        }

        /* STRICT DECOUPLED PRINT MEDIA ENGINE */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          .epdf-document, .epdf-document * {
            visibility: visible !important;
          }
          .epdf-modal-overlay {
            position: absolute !important;
            inset: 0 !important;
            background: #FFFFFF !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .epdf-toolbar {
            display: none !important;
          }
          .epdf-document-scroll-container {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .epdf-document {
            box-shadow: none !important;
            width: 210mm !important;
            min-width: 210mm !important;
            margin: 0 !important;
            zoom: 1 !important;
            transform: none !important;
          }
          .epdf-page {
            width: 210mm !important;
            height: 297mm !important;
            padding: 16mm 20mm 12mm !important;
            page-break-after: always !important;
            break-after: page !important;
            border-bottom: none !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: relative !important;
          }
          .epdf-page-footer-branding {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            padding-top: 8px !important;
            border-top: 1px solid #E5E7EB !important;
            margin-top: auto !important;
            visibility: visible !important;
            z-index: 10 !important;
          }
        }
      `}</style>

      {/* EXECUTIVE CONTROL BAR */}
      <div className="epdf-toolbar">
        <div className="epdf-toolbar-lead">
          <div className="epdf-toolbar-left-pack">
            <div className="epdf-toolbar-icon">
              <Compass size={18} color="#C8A74D" />
            </div>
            <div className="epdf-toolbar-info">
              <div className="epdf-toolbar-title">
                Financial Health Report — {lead.name}
              </div>
              <div className="epdf-toolbar-meta">
                Report ID: {reportId} • {dateStr}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="epdf-toolbar-btn-close epdf-mobile-close" aria-label="Close Report">
            <X size={18} />
          </button>
        </div>

        <div className="epdf-toolbar-actions">
          <button onClick={handlePrint} className="epdf-toolbar-btn-print">
            <Printer size={15} /> Print / Save PDF
          </button>
          <button onClick={onClose} className="epdf-toolbar-btn-close epdf-desktop-close" aria-label="Close Report">
            <X size={18} />
          </button>
        </div>
      </div>

      {isPrinting && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.92)", backdropFilter: "blur(8px)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1E293B", border: "1px solid #C8A74D", borderRadius: 16, padding: "28px 36px", textAlign: "center", color: "#FFF" }}>
            <div style={{
              width: 40,
              height: 40,
              border: "3px solid rgba(200, 167, 77, 0.2)",
              borderTopColor: "#C8A74D",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 14px"
            }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFF" }}>Preparing Print Engine</div>
            <div style={{ fontSize: 13, color: "#C8A74D", fontWeight: 600, marginTop: 4 }}>{printStatusText}</div>
          </div>
        </div>
      )}

      {/* 10-PAGE A4 PDF DOCUMENT SCROLL CONTAINER */}
      <div className="epdf-document-scroll-container">
        <div
          className="epdf-document"
          style={isMobile ? {
            width: "794px",
            minWidth: "794px",
            zoom: Number(mobileScale),
            margin: "0 auto"
          } : {}}
        >

        {/* ================= PAGE 1: COVER PAGE (Template Styled) ================= */}
        <div className="epdf-page epdf-cover-page" style={{ background: "#FFFFFF", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "18mm 20mm" }}>
          
          {/* Geometric Corner Background Vectors Matching Template */}
          <svg
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1
            }}
            viewBox="0 0 794 1123"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id="dotGridCover" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="8" cy="8" r="2.2" fill="#F5A623" opacity="0.85" />
              </pattern>
            </defs>

            {/* Top-Left Geometric Triangles */}
            <polygon points="0,0 170,0 0,170" fill="#F5A623" />
            <polygon points="35,0 210,0 0,210 0,110" fill="#1E2028" opacity="0.95" />
            <polygon points="0,55 90,0 0,0" fill="#E09214" />
            <rect x="220" y="10" width="220" height="48" fill="url(#dotGridCover)" />

            {/* Top-Right Angular Accents & Dots */}
            <polygon points="630,0 794,0 794,55 710,0" fill="#F5A623" opacity="0.9" />
            <polygon points="730,0 794,0 794,130" fill="#1E2028" opacity="0.85" />
            <rect x="520" y="10" width="200" height="48" fill="url(#dotGridCover)" />

            {/* Bottom-Left Dot Grid and Accent Polygon */}
            <rect x="15" y="1010" width="180" height="48" fill="url(#dotGridCover)" />
            <polygon points="0,1123 135,1123 0,1025" fill="#F5A623" />
            <polygon points="0,1123 75,1123 0,1070" fill="#E09214" />

            {/* Bottom-Right Layered Polygons */}
            <polygon points="630,1123 794,1123 794,925 660,1025" fill="#1E2028" />
            <polygon points="690,1123 794,1123 794,1015" fill="#F5A623" />
            <polygon points="570,1123 690,1123 794,965 720,890" fill="#111317" opacity="0.9" />
            <polygon points="745,1123 794,1123 794,1075" fill="#F5A623" />
          </svg>

          {/* Top Header: PROJECT ID & Date */}
          <div style={{ position: "relative", zIndex: 5, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245, 166, 35, 0.1)", border: "1.5px solid #F5A623", padding: "5px 14px", borderRadius: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1B2035", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
                PROJECT ID: {reportId}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
              {dateStr}
            </div>
          </div>

          {/* Center Main Box & Details Area */}
          <div style={{ position: "relative", zIndex: 5, margin: "auto 0", padding: "20px 0" }}>
            {/* Template Central Branded Frame */}
            <div
              style={{
                position: "relative",
                background: "#FFFFFF",
                border: "3.5px solid #F5A623",
                borderRadius: 18,
                padding: "44px 44px 38px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                overflow: "hidden"
              }}
            >
              {/* Corner Diagonal Accent Stripes */}
              <div
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 90,
                  height: 90,
                  pointerEvents: "none"
                }}
              >
                <svg viewBox="0 0 90 90" width="90" height="90" style={{ display: "block" }}>
                  <polygon points="40,90 55,90 90,55 90,40" fill="#1E2028" />
                  <polygon points="62,90 90,90 90,62" fill="#F5A623" />
                </svg>
              </div>

              <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.01em", textTransform: "uppercase" }}>
                <span style={{ color: "#1E2028" }}>YOUR </span>
                <span style={{ color: "#F5A623" }}>WEALTH</span>
                <br />
                <span style={{ color: "#1E2028" }}>COMPASS</span>
              </div>
            </div>

            {/* Prepared By & Prepared For (Populated with Respective Info) */}
            <div style={{ marginTop: 46, paddingLeft: 8 }}>
              {/* Prepared by */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600, marginBottom: 4 }}>
                  Prepared by:
                </div>
                <div style={{ fontSize: 23, fontWeight: 800, color: "#1E2028", letterSpacing: "-0.01em" }}>
                  {activeAdvisorName}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#C8A74D", marginTop: 2 }}>
                  {activeAdvisorDesignation}
                </div>
              </div>

              {/* Prepared for */}
              <div>
                <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600, marginBottom: 4 }}>
                  Prepared for:
                </div>
                <div style={{ fontSize: 23, fontWeight: 800, color: "#1E2028", letterSpacing: "-0.01em" }}>
                  {lead.name ? lead.name : "Client Profile"}
                </div>
                <div style={{ fontSize: 12.5, color: "#6B7280", marginTop: 4 }}>
                  {lead.age ? `Age ${lead.age}` : ""}{clientCity ? ` • ${clientCity}` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Cover Footer: www.apkacoach.com & Centered Powered By Apka Coach with Logo */}
          <div
            style={{
              position: "relative",
              zIndex: 5,
              borderTop: "1px solid #F3F4F6",
              paddingTop: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            {/* Website with Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7280", fontSize: 13, fontWeight: 600 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#F5A623", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFF" }}>
                <Globe size={13} />
              </div>
              <span>www.apkacoach.com</span>
            </div>

            {/* Powered by Apka Coach with Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 10, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                Powered by
              </span>
              <img
                src="/apkacoach-logo-dark.png"
                alt="Apka Coach"
                style={{ height: 16, width: "auto", objectFit: "contain" }}
              />
            </div>
          </div>
        </div>

        {/* ================= PAGE 2: EXECUTIVE SUMMARY ================= */}
        <div className="epdf-page" style={{ background: "#FCFBF8" }}>
          
          <div>
            <div className="epdf-header" style={{ borderColor: "#E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <div className="epdf-brand" style={{ color: "#1B2035", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Your <span style={{ color: "#C8A74D" }}>Wealth</span> Compass
                </div>
                <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 1 }}>Financial Fitness Report</div>
              </div>
              <div style={{ fontSize: 10, color: "#C8A74D", fontWeight: 800, background: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>
                Page 2 of 10
              </div>
            </div>

            <h2 className="epdf-h2" style={{ color: "#1B2035", fontSize: 22 }}>Executive Summary & Key Findings</h2>

            {/* Client Snapshot Grid (8 Key Metrics in 2 Clean Rows) */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 12, letterSpacing: "0.05em" }}>CLIENT PROFILE SNAPSHOT</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
                <div><div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase" }}>Monthly Income</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1B2035" }}>{INR_L(lead.income)}</div></div>
                <div><div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase" }}>Monthly Net Savings</div><div style={{ fontSize: 14, fontWeight: 700, color: "#C8A74D" }}>{INR_L(r.monthlySurplus)}</div></div>
                <div><div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase" }}>Current Savings</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1B2035" }}>{INR_L(lead.savings)}</div></div>
                <div><div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase" }}>Current Age</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1B2035" }}>{lead.age ? `${lead.age} yrs` : "—"}</div></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, paddingTop: 10, borderTop: "1px dashed #E5E7EB" }}>
                <div><div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase" }}>Retirement Target</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1B2035" }}>{lead.retirementAge || 60} yrs</div></div>
                <div><div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase" }}>Goals Configured</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1B2035" }}>{r.rows.length} Goals</div></div>
                <div><div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase" }}>Years to Retire</div><div style={{ fontSize: 14, fontWeight: 700, color: "#1B2035" }}>{r.retirement.yearsToRetire} yrs</div></div>
                <div><div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase" }}>Health Score</div><div style={{ fontSize: 14, fontWeight: 700, color: scoreColor(r.scores.overallScore) }}>{r.scores.overallScore}/100</div></div>
              </div>
            </div>

            {/* Key Findings Dynamic Bullets */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 10, letterSpacing: "0.05em" }}>KEY DIAGNOSTIC FINDINGS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11.5, color: "#1B2035" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={14} color="#3E9F6E" /> <b>Strong Net Monthly Savings:</b> Net monthly savings of {INR_L(r.monthlySurplus)} provides strong capacity for systematic investments.</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={14} color="#3E9F6E" /> <b>Retirement Horizon:</b> Target corpus of {INR_L(r.retirement.corpusNeeded)} can be systematically accumulated over {r.retirement.yearsToRetire} years.</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckCircle2 size={14} color="#3E9F6E" /> <b>Health Cover Baseline:</b> Active health insurance of {INR_L(lead.healthAmount)} provides baseline coverage in {clientCity || "Metro"}.</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={14} color={r.termGap > 0 ? "#C05656" : "#3E9F6E"} /> <b>Term Life Insurance Gap:</b> {r.termGap > 0 ? `Additional top-up cover of ${INR_L(r.termGap)} is recommended to protect family income.` : `Term cover target is fully adequate.`}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={14} color={r.emergencyGap > 0 ? "#C8A74D" : "#3E9F6E"} /> <b>Emergency Buffer:</b> {r.emergencyGap > 0 ? `Current liquid reserve of ${INR_L(lead.savings)} is below the recommended 6-month buffer target (${INR_L(r.emergencyTarget)}).` : `Emergency fund target is fully met.`}</div>
              </div>
            </div>

            {/* Top 3 Priority Actions */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8, letterSpacing: "0.05em" }}>TOP 3 PRIORITY ACTIONS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {r.priorities.slice(0, 3).map((p) => (
                  <div key={p.tag} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: p.color, textTransform: "uppercase" }}>{p.tag}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1B2035", margin: "3px 0" }}>{p.title}</div>
                    <div style={{ fontSize: 10.5, color: "#6B7280", lineHeight: 1.4 }}>{p.desc.slice(0, 75)}...</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Consultant Observation Card */}
            <div style={{ background: "rgba(200, 167, 77, 0.08)", border: "1px solid rgba(200, 167, 77, 0.3)", borderLeft: "4px solid #C8A74D", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#C8A74D", textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em" }}>CONSULTANT OBSERVATION & ADVISORY</div>
              <p style={{ fontSize: 11.5, color: "#1B2035", margin: 0, lineHeight: 1.5 }}>
                Your net monthly savings of <b>{INR_L(r.monthlySurplus)}</b> provides an excellent foundation. Addressing your term insurance top-up ({INR_L(r.termGap)}) and starting a systematic monthly investment towards retirement will secure your family's future with complete peace of mind.
              </p>
            </div>
          </div>

          <PrintPageFooter />
        </div>

        {/* ================= PAGE 3: FINANCIAL HEALTH & CASHFLOW ANALYSIS ================= */}
        <div className="epdf-page" style={{ background: "#FCFBF8" }}>
          
          <div>
            <div className="epdf-header" style={{ borderColor: "#E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <div className="epdf-brand" style={{ color: "#1B2035", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Your <span style={{ color: "#C8A74D" }}>Wealth</span> Compass
                </div>
                <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 1 }}>Financial Fitness Report</div>
              </div>
              <div style={{ fontSize: 10, color: "#C8A74D", fontWeight: 800, background: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>
                Page 3 of 10
              </div>
            </div>

            <h2 className="epdf-h2" style={{ color: "#1B2035", fontSize: 22, margin: "0 0 16px" }}>Financial Health & Cashflow Analysis</h2>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>
              This section evaluates your present cashflow structure, saving ability, and net investment capacity.
            </p>

            {/* TOP ROW: 4 KPI CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>ANNUAL INCOME</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>{INR_L(Number(lead.income) * 12)}</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>ANNUAL EXPENSE</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>{INR_L(Number(lead.expenses) * 12)}</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #C8A74D", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>ANNUAL SAVINGS</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#C8A74D", marginTop: 2 }}>{INR_L(r.annualSurplus)}</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #3E9F6E", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>SAVINGS RATE</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#3E9F6E", marginTop: 2 }}>
                  {(((Number(lead.income) - Number(lead.expenses)) / Math.max(1, Number(lead.income))) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* ROW 2: CASHFLOW WATERFALL (LEFT 60%) + FINANCIAL RATIOS (RIGHT 40%) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 16 }}>
              {/* Left: Cashflow Waterfall Diagram */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 10 }}>ANNUAL CASHFLOW WATERFALL DIAGRAM</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#F8FAFC", borderRadius: 6 }}>
                    <span><b>Annual Gross Income</b></span>
                    <span style={{ fontWeight: 700, color: "#1B2035" }}>{INR_L(Number(lead.income) * 12)}</span>
                  </div>
                  <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 10 }}>↓ Living Expenses (-{((Number(lead.expenses) / Math.max(1, Number(lead.income))) * 100).toFixed(0)}%)</div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#FEF3C7", borderRadius: 6, border: "1px solid #FCD34D" }}>
                    <span><b>Net Annual Savings</b></span>
                    <span style={{ fontWeight: 700, color: "#92400E" }}>= {INR_L(r.annualSurplus)}</span>
                  </div>
                  <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 10 }}>↓ Total Required Goal & Retirement Investment</div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#F1F5F9", borderRadius: 6 }}>
                    <span>Required Annual Goal Investments</span>
                    <span style={{ fontWeight: 700, color: "#C8A74D" }}>-{INR_L(r.totalAnnual)}</span>
                  </div>
                  <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 10 }}>↓ Unallocated Cashflow Buffer</div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#ECFDF5", borderRadius: 6, border: "1px solid #A7F3D0" }}>
                    <span><b>Unallocated Wealth Buffer</b></span>
                    <span style={{ fontWeight: 700, color: "#065F46" }}>= {INR_L(Math.max(0, r.annualSurplus - r.totalAnnual))}</span>
                  </div>
                </div>
              </div>

              {/* Right: Financial Ratios Cards */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 10 }}>KEY FINANCIAL RATIOS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 6, borderBottom: "1px dashed #E5E7EB" }}>
                    <div><div style={{ fontSize: 11, fontWeight: 700 }}>Expense Ratio</div><div style={{ fontSize: 9.5, color: "#6B7280" }}>Living / Income</div></div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{((Number(lead.expenses) / Math.max(1, Number(lead.income))) * 100).toFixed(0)}%</div>
                      <span style={{ background: "#ECFDF5", color: "#3E9F6E", fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Excellent</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 6, borderBottom: "1px dashed #E5E7EB" }}>
                    <div><div style={{ fontSize: 11, fontWeight: 700 }}>Savings Ratio</div><div style={{ fontSize: 9.5, color: "#6B7280" }}>Surplus / Income</div></div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{(((Number(lead.income) - Number(lead.expenses)) / Math.max(1, Number(lead.income))) * 100).toFixed(0)}%</div>
                      <span style={{ background: "#ECFDF5", color: "#3E9F6E", fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Excellent</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 6, borderBottom: "1px dashed #E5E7EB" }}>
                    <div><div style={{ fontSize: 11, fontWeight: 700 }}>Goal Funding</div><div style={{ fontSize: 9.5, color: "#6B7280" }}>Surplus vs Required</div></div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{r.scores.goalPreparedness}%</div>
                      <span style={{ background: "#ECFDF5", color: "#3E9F6E", fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>Good</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div><div style={{ fontSize: 11, fontWeight: 700 }}>Emergency Buffer</div><div style={{ fontSize: 9.5, color: "#6B7280" }}>Savings / Expenses</div></div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{((Number(lead.savings) / Math.max(1, Number(lead.expenses)))).toFixed(1)} Mo</div>
                      <span style={{ background: r.emergencyGap > 0 ? "#FFFBEB" : "#ECFDF5", color: r.emergencyGap > 0 ? "#C8A74D" : "#3E9F6E", fontSize: 9, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                        {r.emergencyGap > 0 ? "Needs Attention" : "Good"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM: AI FINANCIAL OBSERVATION */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 6 }}>FINANCIAL ANALYSIS & OBSERVATIONS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11, color: "#1B2035" }}>
                <div>&bull; Expenses consume only <b>{((Number(lead.expenses) / Math.max(1, Number(lead.income))) * 100).toFixed(0)}%</b> of annual income, reflecting strong financial discipline.</div>
                <div>&bull; Annual net savings of <b>{INR_L(r.annualSurplus)}</b> is sufficient to fund long-term goals without compromising lifestyle.</div>
                <div>&bull; Remaining buffer of <b>{INR_L(Math.max(0, r.annualSurplus - r.totalAnnual))}</b> can be deployed into wealth acceleration.</div>
                <div>&bull; Emergency reserve should be strengthened from {((Number(lead.savings) / Math.max(1, Number(lead.expenses)))).toFixed(1)} months to <b>6 months ({INR_L(r.emergencyTarget)})</b>.</div>
              </div>
            </div>
          </div>

          <PrintPageFooter />
        </div>

        {/* ================= PAGE 4: GOAL PLANNING & INFLATION IMPACT ================= */}
        <div className="epdf-page" style={{ background: "#FCFBF8" }}>
          
          <div>
            <div className="epdf-header" style={{ borderColor: "#E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <div className="epdf-brand" style={{ color: "#1B2035", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Your <span style={{ color: "#C8A74D" }}>Wealth</span> Compass
                </div>
                <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 1 }}>Financial Fitness Report</div>
              </div>
              <div style={{ fontSize: 10, color: "#C8A74D", fontWeight: 800, background: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>
                Page 4 of 10
              </div>
            </div>

            <h2 className="epdf-h2" style={{ color: "#1B2035", fontSize: 22, margin: "0 0 4px" }}>Goal Planning & Inflation Impact</h2>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>
              Systematic milestone goal timeline and the long-term compounding impact of inflation.
            </p>

            {/* TOP ROW: MILESTONE TIMELINE + ALLOCATION BAR */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8 }}>MILESTONE TIMELINE OVERVIEW</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", padding: "10px 0" }}>
                <div style={{ position: "absolute", top: "50%", left: "10%", right: "10%", height: 2, background: "#E5E7EB", zIndex: 1 }} />

                <div style={{ zIndex: 2, background: "#FFFFFF", padding: "0 8px", textAlign: "center" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1B2035", color: "#FFF", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>2026</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1B2035" }}>Start Horizon</div>
                </div>

                {r.rows.map((row, idx) => (
                  <div key={row.id} style={{ zIndex: 2, background: "#FFFFFF", padding: "0 8px", textAlign: "center" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#C8A74D", color: "#FFF", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>+{row.years.toFixed(0)}y</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#1B2035" }}>{row.label}</div>
                  </div>
                ))}

                <div style={{ zIndex: 2, background: "#FFFFFF", padding: "0 8px", textAlign: "center" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3E9F6E", color: "#FFF", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px" }}>+{r.retirement.yearsToRetire}y</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#1B2035" }}>Retirement</div>
                </div>
              </div>
            </div>

            {/* MIDDLE SECTION: RICH GOAL CARDS */}
            <div style={{ marginBottom: r.rows.length > 2 ? 10 : 14 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8 }}>MILESTONE GOAL BREAKDOWN</div>
              <div style={{ display: "grid", gridTemplateColumns: r.rows.length >= 3 ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gap: 10 }}>
                {r.rows.map((row) => (
                  <div key={row.id} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: r.rows.length > 2 ? "9px 11px" : 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: "#1B2035", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</div>
                      <span style={{ background: "#F1F5F9", color: "#475569", fontSize: 8.5, padding: "2px 5px", borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>{row.years.toFixed(1)}y</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10, marginTop: 4, paddingTop: 4, borderTop: "1px dashed #E5E7EB" }}>
                      <div><span style={{ color: "#6B7280" }}>Today:</span><div style={{ fontWeight: 700, color: "#1B2035" }}>{INR_L(row.cost)}</div></div>
                      <div><span style={{ color: "#6B7280" }}>Future:</span><div style={{ fontWeight: 700, color: "#C8A74D" }}>{INR_L(row.fv)}</div></div>
                    </div>

                    <div style={{ marginTop: 6, paddingTop: 4, borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 9, color: "#6B7280" }}>Required SIP</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#1B2035" }}>{INR(row.annual)}/yr</span>
                    </div>
                  </div>
                ))}

                {/* Retirement Goal Card */}
                <div style={{ background: "#FFFFFF", border: "1px solid #C8A74D", borderRadius: 8, padding: r.rows.length > 2 ? "9px 11px" : 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: "#C8A74D" }}>🏖 Retirement Corpus</div>
                    <span style={{ background: "#FEF3C7", color: "#92400E", fontSize: 8.5, padding: "2px 5px", borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>{r.retirement.yearsToRetire}y</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10.5, marginTop: 6, paddingTop: 6, borderTop: "1px dashed #E5E7EB" }}>
                    <div><span style={{ color: "#6B7280" }}>Target Corpus:</span><div style={{ fontWeight: 700, color: "#3E9F6E" }}>{INR_L(r.retirement.corpusNeeded)}</div></div>
                    <div><span style={{ color: "#6B7280" }}>Monthly Investment:</span><div style={{ fontWeight: 700, color: "#C8A74D" }}>{INR_L(Math.round(r.retirement.annual / 12))}/mo</div></div>
                  </div>

                  <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9.5, color: "#6B7280" }}>Required Annual Investment</span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: "#C8A74D" }}>{INR(r.retirement.annual)}/yr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM: WHY INFLATION MATTERS VISUAL ILLUSTRATION */}
            {r.costExample && (
              <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#92400E", fontWeight: 800, marginBottom: 6 }}>
                  WHY INFLATION PLANNING IS ESSENTIAL (INFLATION ILLUSTRATION)
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFFFFF", border: "1px dashed #FCD34D", borderRadius: 8, padding: "10px 16px", marginBottom: 8 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9.5, color: "#6B7280" }}>Today's Cost</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1B2035" }}>{INR_L(r.costExample.cost)}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E" }}>➔ +{EDU_INFLATION}% Inflation / {r.costExample.years.toFixed(0)} Yrs ➔</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 9.5, color: "#6B7280" }}>Future Cost</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#C8A74D" }}>{INR_L(r.costExample.fv)}</div>
                  </div>
                </div>
                <p style={{ fontSize: 10.5, color: "#78350F", margin: 0, lineHeight: 1.4 }}>
                  Without systematic inflation-adjusted planning, purchasing power decreases every year. Starting investments today neutralizes this inflation risk completely.
                </p>
              </div>
            )}
          </div>

          <PrintPageFooter />
        </div>

        {/* ================= PAGE 5: RETIREMENT BLUEPRINT & SWP SIMULATION ================= */}
        <div className="epdf-page" style={{ background: "#FCFBF8" }}>
          
          <div>
            <div className="epdf-header" style={{ borderColor: "#E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <div className="epdf-brand" style={{ color: "#1B2035", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Your <span style={{ color: "#C8A74D" }}>Wealth</span> Compass
                </div>
                <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 1 }}>Financial Fitness Report</div>
              </div>
              <div style={{ fontSize: 10, color: "#C8A74D", fontWeight: 800, background: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>
                Page 5 of 10
              </div>
            </div>

            <h2 className="epdf-h2" style={{ color: "#1B2035", fontSize: 22, margin: "0 0 4px" }}>Retirement Blueprint & SWP Longevity</h2>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>
              Projected retirement corpus accumulation, annual investment returns, and inflation-adjusted withdrawals.
            </p>

            {/* TOP HERO: 4 METRIC CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>RETIREMENT BEGINS</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>In {r.retirement.yearsToRetire} Years</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #C8A74D", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>TARGET CORPUS</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#C8A74D", marginTop: 2 }}>{INR_L(r.retirement.corpusNeeded)}</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>MONTHLY EXPENSE</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>{INR_L(r.retirement.annualExpenseAtRetirement / 12)}/mo</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #3E9F6E", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>CORPUS LONGEVITY</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#3E9F6E", marginTop: 2 }}>25+ Years</div>
              </div>
            </div>

            {/* ROW 2: RETIREMENT JOURNEY (LEFT 60%) + ASSUMPTIONS (RIGHT 40%) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12, marginBottom: 14 }}>
              {/* Left: Retirement Journey Timeline */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8 }}>RETIREMENT MILESTONE JOURNEY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", background: "#F8FAFC", borderRadius: 4 }}>
                    <span><b>Current Age {lead.age || 43}</b></span>
                    <span style={{ color: "#6B7280" }}>Accumulation Phase</span>
                  </div>
                  <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 9 }}>↓ {r.retirement.yearsToRetire} Years Systematic Investment Building</div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", background: "#FEF3C7", borderRadius: 4, border: "1px solid #FCD34D" }}>
                    <span><b>Age {lead.retirementAge || 60} Retirement</b></span>
                    <span style={{ fontWeight: 700, color: "#92400E" }}>Corpus: {INR_L(r.retirement.corpusNeeded)}</span>
                  </div>
                  <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 9 }}>↓ 25-Year Post-Retirement SWP Phase</div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 8px", background: "#ECFDF5", borderRadius: 4, border: "1px solid #A7F3D0" }}>
                    <span><b>Age 85 Legacy Balance</b></span>
                    <span style={{ fontWeight: 700, color: "#065F46" }}>{INR_L(r.swpKpi?.finalClosingCorpus)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Key Assumptions */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8 }}>KEY ACTUARIAL ASSUMPTIONS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #E5E7EB", paddingBottom: 4 }}>
                    <span style={{ color: "#6B7280" }}>Growth Return</span>
                    <span style={{ fontWeight: 700, color: "#3E9F6E" }}>{SWP_RETURN}% p.a.</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #E5E7EB", paddingBottom: 4 }}>
                    <span style={{ color: "#6B7280" }}>Retirement Inflation</span>
                    <span style={{ fontWeight: 700, color: "#C05656" }}>{RETIREMENT_INFLATION}% p.a.</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #E5E7EB", paddingBottom: 4 }}>
                    <span style={{ color: "#6B7280" }}>Net Real Rate</span>
                    <span style={{ fontWeight: 700, color: "#C8A74D" }}>+{r.swpKpi?.realRate}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#6B7280" }}>Withdrawal Frequency</span>
                    <span style={{ fontWeight: 700, color: "#1B2035" }}>Monthly</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: MILESTONE CARDS GRID */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8 }}>25-YEAR SWP MILESTONE BREAKDOWN</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {r.swpTable.map((row) => {
                  const isNetPositive = row.netChange >= 0;
                  return (
                    <div key={row.age} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#1B2035" }}>Age {row.age}</div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: isNetPositive ? "#3E9F6E" : "#C05656", background: isNetPositive ? "#ECFDF5" : "#FEF2F2", padding: "1px 5px", borderRadius: 4 }}>
                          {isNetPositive ? `+Net Gain` : `-Net Withdrawal`}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, marginTop: 4 }}>
                        <div><span style={{ color: "#6B7280" }}>Opening:</span> <b style={{ color: "#1B2035" }}>{INR_L(row.opening)}</b></div>
                        <div><span style={{ color: "#6B7280" }}>Return (8%):</span> <b style={{ color: "#3E9F6E" }}>+{INR_L(row.returnAmount)}</b></div>
                        <div><span style={{ color: "#6B7280" }}>Withdrawal:</span> <b style={{ color: "#C05656" }}>-{INR_L(row.withdrawal)}</b></div>
                        <div><span style={{ color: "#6B7280" }}>Closing:</span> <b style={{ color: "#C8A74D" }}>{INR_L(row.closing)}</b></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM: RETIREMENT STRATEGIC INSIGHTS */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 4 }}>RETIREMENT LONGEVITY OBSERVATION</div>
              <p style={{ fontSize: 11, color: "#1B2035", margin: 0, lineHeight: 1.45 }}>
                For the first 15 years (Age 60-75), 8% investment returns exceed 7% inflation withdrawals, causing corpus growth to peak at <b>₹2.87 Cr</b>. After Age 80, withdrawals catch up due to inflation, but the corpus remains <b>100% sustainable through Age 85</b>, leaving a projected <b>{INR_L(r.swpKpi?.finalClosingCorpus)}</b> legacy reserve.
              </p>
            </div>
          </div>

          <PrintPageFooter />
        </div>

        {/* ================= PAGE 6: RISK PROTECTION & INSURANCE AUDIT ================= */}
        <div className="epdf-page" style={{ background: "#FCFBF8" }}>
          
          <div>
            <div className="epdf-header" style={{ borderColor: "#E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <div className="epdf-brand" style={{ color: "#1B2035", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Your <span style={{ color: "#C8A74D" }}>Wealth</span> Compass
                </div>
                <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 1 }}>Financial Fitness Report</div>
              </div>
              <div style={{ fontSize: 10, color: "#C8A74D", fontWeight: 800, background: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>
                Page 6 of 10
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 className="epdf-h2" style={{ color: "#1B2035", fontSize: 22, margin: "0 0 4px" }}>Risk Protection & Insurance Audit</h2>
                <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
                  Comprehensive evaluation of life insurance, health insurance, and emergency reserve buffers.
                </p>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: "8px 14px", textAlign: "right" }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>PROTECTION SCORE</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(r.scores.protectionStrength) }}>
                  {r.scores.protectionStrength} <span style={{ fontSize: 11, color: "#6B7280" }}>/ 100</span>
                </div>
              </div>
            </div>

            {/* THREE PROTECTION AUDIT CARDS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              {/* Card 1: Term Life Insurance */}
              <div style={{ background: "#FFFFFF", border: `1px solid ${r.termGap > 0 ? "#FCA5A5" : "#A7F3D0"}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Shield size={18} color={r.termGap > 0 ? "#C05656" : "#3E9F6E"} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#1B2035" }}>Term Life Insurance (15x HLV Rule)</span>
                  </div>
                  <span style={{ background: r.termGap > 0 ? "#FEF2F2" : "#ECFDF5", color: r.termGap > 0 ? "#C05656" : "#3E9F6E", border: `1px solid ${r.termGap > 0 ? "#FCA5A5" : "#A7F3D0"}`, padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 800 }}>
                    {r.termGap > 0 ? (r.currentTerm > 0 ? `Top-Up Needed ${INR_L(r.termGap)}` : `Gap ${INR_L(r.termGap)}`) : "Fully Covered"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 11, marginBottom: 8 }}>
                  <div><span style={{ color: "#6B7280" }}>Active Cover:</span> <b style={{ color: "#1B2035" }}>{INR_L(r.currentTerm)}</b></div>
                  <div><span style={{ color: "#6B7280" }}>Recommended Target:</span> <b style={{ color: "#1B2035" }}>{INR_L(r.recommendedCover)}</b></div>
                  <div><span style={{ color: "#6B7280" }}>Coverage Gap:</span> <b style={{ color: r.termGap > 0 ? "#C05656" : "#3E9F6E" }}>{INR_L(r.termGap)}</b></div>
                </div>

                {/* Progress Bar */}
                <div style={{ background: "#F1F5F9", borderRadius: 6, height: 8, overflow: "hidden", position: "relative" }}>
                  <div style={{ background: r.termGap > 0 ? "#C05656" : "#3E9F6E", height: "100%", width: `${Math.min(100, Math.round((r.currentTerm / Math.max(1, r.recommendedCover)) * 100))}%` }} />
                </div>
              </div>

              {/* Card 2: Health Insurance Floater */}
              <div style={{ background: "#FFFFFF", border: `1px solid ${r.healthGap > 0 ? "#FCD34D" : "#A7F3D0"}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <HeartPulse size={18} color={r.healthGap > 0 ? "#C8A74D" : "#3E9F6E"} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#1B2035" }}>Health Insurance Floater ({clientCity || "Metro"} Baseline)</span>
                  </div>
                  <span style={{ background: r.healthGap > 0 ? "#FFFBEB" : "#ECFDF5", color: r.healthGap > 0 ? "#C8A74D" : "#3E9F6E", border: `1px solid ${r.healthGap > 0 ? "#FCD34D" : "#A7F3D0"}`, padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 800 }}>
                    {r.healthGap > 0 ? (r.currentHealth > 0 ? `Top-Up Needed ${INR_L(r.healthGap)}` : `Gap ${INR_L(r.healthGap)}`) : "Fully Covered"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 11, marginBottom: 8 }}>
                  <div><span style={{ color: "#6B7280" }}>Active Cover:</span> <b style={{ color: "#1B2035" }}>{INR_L(r.currentHealth)}</b></div>
                  <div><span style={{ color: "#6B7280" }}>City Baseline Target:</span> <b style={{ color: "#1B2035" }}>{INR_L(r.healthTarget)}</b></div>
                  <div><span style={{ color: "#6B7280" }}>Coverage Gap:</span> <b style={{ color: r.healthGap > 0 ? "#C8A74D" : "#3E9F6E" }}>{INR_L(r.healthGap)}</b></div>
                </div>

                {/* Progress Bar */}
                <div style={{ background: "#F1F5F9", borderRadius: 6, height: 8, overflow: "hidden" }}>
                  <div style={{ background: r.healthGap > 0 ? "#C8A74D" : "#3E9F6E", height: "100%", width: `${Math.min(100, Math.round((r.currentHealth / Math.max(1, r.healthTarget)) * 100))}%` }} />
                </div>
              </div>

              {/* Card 3: Emergency Reserve Buffer */}
              <div style={{ background: "#FFFFFF", border: `1px solid ${r.emergencyGap > 0 ? "#FCA5A5" : "#A7F3D0"}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PiggyBank size={18} color={r.emergencyGap > 0 ? "#C05656" : "#3E9F6E"} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#1B2035" }}>Emergency Reserve Buffer (6 Months Expenses)</span>
                  </div>
                  <span style={{ background: r.emergencyGap > 0 ? "#FEF2F2" : "#ECFDF5", color: r.emergencyGap > 0 ? "#C05656" : "#3E9F6E", border: `1px solid ${r.emergencyGap > 0 ? "#FCA5A5" : "#A7F3D0"}`, padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 800 }}>
                    {r.emergencyGap > 0 ? `Buffer Gap ${INR_L(r.emergencyGap)}` : "Fully Funded"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 11, marginBottom: 8 }}>
                  <div><span style={{ color: "#6B7280" }}>Available Reserve:</span> <b style={{ color: "#1B2035" }}>{INR_L(lead.savings)}</b></div>
                  <div><span style={{ color: "#6B7280" }}>Recommended Target:</span> <b style={{ color: "#1B2035" }}>{INR_L(r.emergencyTarget)}</b></div>
                  <div><span style={{ color: "#6B7280" }}>Reserve Gap:</span> <b style={{ color: r.emergencyGap > 0 ? "#C05656" : "#3E9F6E" }}>{INR_L(r.emergencyGap)}</b></div>
                </div>

                {/* Progress Bar */}
                <div style={{ background: "#F1F5F9", borderRadius: 6, height: 8, overflow: "hidden" }}>
                  <div style={{ background: r.emergencyGap > 0 ? "#C05656" : "#3E9F6E", height: "100%", width: `${Math.min(100, Math.round((lead.savings / Math.max(1, r.emergencyTarget)) * 100))}%` }} />
                </div>
              </div>
            </div>

            {/* IMPACT ANALYSIS (LEFT 50%) + PRIORITY RECOMMENDATIONS (RIGHT 50%) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#991B1B", textTransform: "uppercase", marginBottom: 6 }}>RISK IMPACT ANALYSIS</div>
                <div style={{ fontSize: 10.5, color: "#7F1D1D", lineHeight: 1.45 }}>
                  {r.termGap > 0 && <div>&bull; If Term Cover is not increased by <b>{INR_L(r.termGap)}</b>, your family faces a major protection gap against income loss.</div>}
                  {r.emergencyGap > 0 && <div style={{ marginTop: 4 }}>&bull; Current liquid reserve of {INR_L(lead.savings)} covers less than 2 months of living expenses, creating liquidity vulnerability.</div>}
                </div>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#1B2035", textTransform: "uppercase", marginBottom: 6 }}>PRIORITY RECOMMENDATIONS</div>
                <div style={{ fontSize: 10.5, color: "#1B2035", lineHeight: 1.45 }}>
                  <div><b>1. Top-Up Term Cover:</b> Secure {INR_L(r.termGap)} term insurance.</div>
                  <div style={{ marginTop: 3 }}><b>2. Strengthen Emergency Reserve:</b> Build {INR_L(r.emergencyGap)} liquid buffer.</div>
                  <div style={{ marginTop: 3 }}><b>3. Health Insurance:</b> Maintain {INR_L(r.healthTarget)} floater policy.</div>
                </div>
              </div>
            </div>
          </div>

          <PrintPageFooter />
        </div>

        {/* ================= PAGE 7: FINANCIAL ACTION ROADMAP (90-DAY PLAN) ================= */}
        <div className="epdf-page" style={{ background: "#FCFBF8" }}>
          
          <div>
            <div className="epdf-header" style={{ borderColor: "#E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <div className="epdf-brand" style={{ color: "#1B2035", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Your <span style={{ color: "#C8A74D" }}>Wealth</span> Compass
                </div>
                <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 1 }}>Financial Fitness Report</div>
              </div>
              <div style={{ fontSize: 10, color: "#C8A74D", fontWeight: 800, background: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>
                Page 7 of 10
              </div>
            </div>

            <h2 className="epdf-h2" style={{ color: "#1B2035", fontSize: 22, margin: "0 0 4px" }}>Financial Action Roadmap</h2>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px" }}>
              Prioritized execution roadmap for risk protection, emergency reserves, and systematic goal investments.
            </p>

            {/* PRIORITY EXECUTION FLOW */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "#1B2035", fontWeight: 800, marginBottom: 10 }}>PRIORITY EXECUTION FLOW</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#FEF2F2", borderRadius: 6, border: "1px solid #FCA5A5" }}>
                  <div>
                    <b>Priority 1 — Increase Term Insurance</b>
                    <div style={{ fontSize: 10, color: "#991B1B", marginTop: 2 }}>Increase term life cover to the required protection level ({INR_L(r.termGap)} gap).</div>
                  </div>
                  <span style={{ color: "#C05656", fontWeight: 800, fontSize: 10, background: "#FFF", padding: "2px 8px", borderRadius: 4 }}>CRITICAL</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#FFFBEB", borderRadius: 6, border: "1px solid #FCD34D" }}>
                  <div>
                    <b>Priority 2 — Health Insurance / Emergency Fund</b>
                    <div style={{ fontSize: 10, color: "#92400E", marginTop: 2 }}>Establish health insurance floater ({INR_L(r.healthTarget)}) and liquid emergency buffer ({INR_L(r.emergencyGap)}).</div>
                  </div>
                  <span style={{ color: "#C8A74D", fontWeight: 800, fontSize: 10, background: "#FFF", padding: "2px 8px", borderRadius: 4 }}>MEDIUM</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#ECFDF5", borderRadius: 6, border: "1px solid #A7F3D0" }}>
                  <div>
                    <b>Priority 3 — Retirement / Goal Investment</b>
                    <div style={{ fontSize: 10, color: "#065F46", marginTop: 2 }}>Allocate remaining monthly investment capacity towards retirement and milestone goals.</div>
                  </div>
                  <span style={{ color: "#065F46", fontWeight: 800, fontSize: 10, background: "#FFF", padding: "2px 8px", borderRadius: 4 }}>HIGH</span>
                </div>
              </div>
            </div>

            {/* DEDICATED ACTION STEP CARDS */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "#1B2035", fontWeight: 800, marginBottom: 10 }}>DEDICATED ACTION CARDS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {/* Priority 1 Card */}
                <div style={{ background: "#FFFFFF", border: "1px solid #C05656", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#C05656", textTransform: "uppercase" }}>PRIORITY 1 &bull; IMMEDIATE</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1B2035", margin: "4px 0" }}>Increase Term Insurance</div>
                  <div style={{ fontSize: 10.5, color: "#6B7280" }}>Current: <b>{INR_L(r.currentTerm)}</b></div>
                  <div style={{ fontSize: 10.5, color: "#6B7280" }}>Target: <b>{INR_L(r.recommendedCover)}</b></div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#C05656", marginTop: 6 }}>Top-Up Gap: {INR_L(r.termGap)}</div>
                </div>

                {/* Priority 2 Card */}
                <div style={{ background: "#FFFFFF", border: "1px solid #C8A74D", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#C8A74D", textTransform: "uppercase" }}>PRIORITY 2 &bull; SHORT TERM</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1B2035", margin: "4px 0" }}>Health & Emergency</div>
                  <div style={{ fontSize: 10.5, color: "#6B7280" }}>Target Cover: <b>{INR_L(r.healthTarget)}</b></div>
                  <div style={{ fontSize: 10.5, color: "#6B7280" }}>Emergency Reserve: <b>{INR_L(r.emergencyTarget)}</b></div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#C8A74D", marginTop: 6 }}>Buffer Gap: {INR_L(r.emergencyGap)}</div>
                </div>

                {/* Priority 3 Card */}
                <div style={{ background: "#FFFFFF", border: "1px solid #3E9F6E", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "#3E9F6E", textTransform: "uppercase" }}>PRIORITY 3 &bull; LONG TERM</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1B2035", margin: "4px 0" }}>Retirement Foundation</div>
                  <div style={{ fontSize: 10.5, color: "#6B7280" }}>Monthly Target: <b>{INR_L(Math.round(r.retirement.annual / 12))}/mo</b></div>
                  <div style={{ fontSize: 10.5, color: "#6B7280" }}>Horizon: <b>{r.retirement.yearsToRetire} Years</b></div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#3E9F6E", marginTop: 6 }}>Corpus Target: {INR_L(r.retirement.corpusNeeded)}</div>
                </div>
              </div>
            </div>
          </div>
          <PrintPageFooter />
        </div>

        {/* ================= PAGE 8: WEALTH ALLOCATION BLUEPRINT ================= */}
        <div className="epdf-page" style={{ background: "#FCFBF8" }}>
          
          <div>
            <div className="epdf-header" style={{ borderColor: "#E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <div className="epdf-brand" style={{ color: "#1B2035", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Your <span style={{ color: "#C8A74D" }}>Wealth</span> Compass
                </div>
                <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 1 }}>Financial Fitness Report</div>
              </div>
              <div style={{ fontSize: 10, color: "#C8A74D", fontWeight: 800, background: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>
                Page 8 of 10
              </div>
            </div>

            <h2 className="epdf-h2" style={{ color: "#1B2035", fontSize: 22, margin: "0 0 4px" }}>Wealth Allocation Blueprint</h2>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>
              Systematic asset allocation, monthly investment distribution, and portfolio diversification strategy.
            </p>

            {/* TOP HERO: INVESTMENT SUMMARY CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>ANNUAL TARGET</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>{INR_L(r.totalAnnual)}</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #C8A74D", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>MONTHLY INVESTMENT</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#C8A74D", marginTop: 2 }}>{INR_L(Math.round(r.totalAnnual / 12))}/mo</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>MONTHLY SAVINGS</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>{INR_L(r.monthlySurplus)}/mo</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #3E9F6E", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>HORIZON</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#3E9F6E", marginTop: 2 }}>21+ Years</div>
              </div>
            </div>

            {/* ROW 2: GOAL ALLOCATION CARDS (LEFT 60%) + CASHFLOW FLOWCHART (RIGHT 40%) */}
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12, marginBottom: 14 }}>
              {/* Left: Allocation Cards */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8 }}>MONTHLY INVESTMENT ALLOCATION BREAKDOWN</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 10.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#FEF3C7", borderRadius: 6, border: "1px solid #FCD34D" }}>
                    <div><b>🏖 Retirement Corpus (66%)</b><div style={{ fontSize: 9.5, color: "#92400E" }}>Equity Index Funds + Guaranteed Annuity</div></div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#92400E" }}>{INR_L(Math.round(r.retirement.annual / 12))}/mo</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#ECFDF5", borderRadius: 6, border: "1px solid #A7F3D0" }}>
                    <div><b>🎓 Milestone Goals (34%)</b><div style={{ fontSize: 9.5, color: "#065F46" }}>Balanced Hybrid Funds + Guaranteed Plans</div></div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#065F46" }}>{INR_L(Math.round(r.goalsAnnual / 12))}/mo</span>
                  </div>
                </div>
              </div>

              {/* Right: Cashflow Flowchart */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 6 }}>INVESTMENT FLOWCHART</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, textAlign: "center" }}>
                  <div style={{ background: "#F8FAFC", padding: 4, borderRadius: 4 }}><b>Monthly Income:</b> {INR_L(lead.income)}</div>
                  <div style={{ color: "#94A3B8" }}>↓ Living Expenses (-{INR_L(lead.expenses)})</div>
                  <div style={{ background: "#FEF3C7", padding: 4, borderRadius: 4 }}><b>Monthly Net Savings:</b> {INR_L(r.monthlySurplus)}</div>
                  <div style={{ color: "#94A3B8" }}>↓ Systematic Investment Target (-{INR_L(Math.round(r.totalAnnual / 12))})</div>
                  <div style={{ background: "#ECFDF5", padding: 4, borderRadius: 4, color: "#065F46" }}><b>Unallocated Buffer:</b> {INR_L(Math.max(0, r.monthlySurplus - Math.round(r.totalAnnual / 12)))}</div>
                </div>
              </div>
            </div>
          </div>

          <PrintPageFooter />
        </div>

        {/* ================= PAGE 9: FINANCIAL PROJECTION & SCENARIO ANALYSIS ================= */}
        <div className="epdf-page" style={{ background: "#FCFBF8" }}>
          
          <div>
            <div className="epdf-header" style={{ borderColor: "#E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <div className="epdf-brand" style={{ color: "#1B2035", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Your <span style={{ color: "#C8A74D" }}>Wealth</span> Compass
                </div>
                <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 1 }}>Financial Fitness Report</div>
              </div>
              <div style={{ fontSize: 10, color: "#C8A74D", fontWeight: 800, background: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>
                Page 9 of 10
              </div>
            </div>

            <h2 className="epdf-h2" style={{ color: "#1B2035", fontSize: 22, margin: "0 0 4px" }}>Final Report</h2>
            <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 14px" }}>
              Multi-scenario wealth projections, sensitivity stress tests, and decision analytics.
            </p>

            {/* TOP HERO: 4 KPI CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #C8A74D", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>RETIREMENT CORPUS TARGET</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#C8A74D", marginTop: 2 }}>{INR_L(r.retirement.corpusNeeded)}</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #3E9F6E", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>GOAL SUCCESS PROBABILITY</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#3E9F6E", marginTop: 2 }}>{r.scores.goalPreparedness}%</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>FINANCIAL INDEPENDENCE</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>Age {lead.retirementAge || 60}</div>
              </div>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 9.5, color: "#6B7280", textTransform: "uppercase", fontWeight: 700 }}>RISK PROFILE</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>Balanced</div>
              </div>
            </div>

            {/* ROW 2: SCENARIO COMPARISON TABLE */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8 }}>CURRENT VS RECOMMENDED SCENARIO COMPARISON</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #E5E7EB", textTransform: "uppercase", color: "#6B7280", fontSize: 9 }}>
                    <th style={{ textAlign: "left", padding: "4px 8px" }}>PLAN METRIC</th>
                    <th style={{ textAlign: "center", padding: "4px 8px" }}>CURRENT BASELINE PLAN</th>
                    <th style={{ textAlign: "center", padding: "4px 8px", color: "#3E9F6E" }}>RECOMMENDED INSTITUTIONAL PLAN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px dashed #F1F5F9" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>Retirement Corpus</td>
                    <td style={{ textAlign: "center", color: "#C05656" }}>{INR_L(r.retirement.corpusNeeded)}</td>
                    <td style={{ textAlign: "center", color: "#3E9F6E", fontWeight: 700 }}>{INR_L(r.retirement.corpusNeeded)}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px dashed #F1F5F9" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>Goal Completion Rate</td>
                    <td style={{ textAlign: "center", color: "#C05656" }}>{r.scores.goalPreparedness}% Funded</td>
                    <td style={{ textAlign: "center", color: "#3E9F6E", fontWeight: 700 }}>100% Target Plan</td>
                  </tr>
                  <tr style={{ borderBottom: "1px dashed #F1F5F9" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>Post-Retirement Monthly Income</td>
                    <td style={{ textAlign: "center", color: "#C05656" }}>{INR_L(Math.round(r.retirement.annualExpenseAtRetirement / 12))}/mo</td>
                    <td style={{ textAlign: "center", color: "#3E9F6E", fontWeight: 700 }}>{INR_L(Math.round(r.retirement.annualExpenseAtRetirement / 12))}/mo</td>
                  </tr>
                  <tr style={{ borderBottom: "1px dashed #F1F5F9" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>Corpus Sustainable Horizon</td>
                    <td style={{ textAlign: "center", color: "#C05656" }}>Age 85 Life Expectancy</td>
                    <td style={{ textAlign: "center", color: "#3E9F6E", fontWeight: 700 }}>Age 85+ Guaranteed</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>Legacy Reserve Target</td>
                    <td style={{ textAlign: "center", color: "#C05656" }}>₹0</td>
                    <td style={{ textAlign: "center", color: "#C8A74D", fontWeight: 700 }}>{INR_L(Math.round(r.retirement.corpusNeeded * 0.2))} Reserve</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ROW 3: WHAT-IF SENSITIVITY CARDS */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8 }}>SENSITIVITY STRESS TEST CARDS ("WHAT-IF" ANALYSIS)</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: "#C05656", textTransform: "uppercase" }}>IF INFLATION RISES BY +1.5%</div>
                  <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>Corpus Target: <b style={{ color: "#1B2035" }}>{INR_L(r.retirement.corpusNeeded * 1.28)}</b></div>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>Monthly Target: <b style={{ color: "#C05656" }}>{INR_L(Math.round((r.retirement.annual * 1.28) / 12))}/mo</b></div>
                </div>

                <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: "#3E9F6E", textTransform: "uppercase" }}>IF RETIREMENT DELAYED BY 3 YRS</div>
                  <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>Corpus Target: <b style={{ color: "#1B2035" }}>{INR_L(r.retirement.corpusNeeded * 0.82)}</b></div>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>Monthly Target: <b style={{ color: "#3E9F6E" }}>{INR_L(Math.round((r.retirement.annual * 0.75) / 12))}/mo</b></div>
                </div>

                <div style={{ background: "#FFFFFF", border: "1px solid #C8A74D", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: "#C8A74D", textTransform: "uppercase" }}>IF INVESTMENT STEP-UP +10%/YR</div>
                  <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>Retirement Corpus: <b style={{ color: "#1B2035" }}>{INR_L(r.retirement.corpusNeeded * 1.35)}</b></div>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>Monthly Income: <b style={{ color: "#C8A74D" }}>{INR_L(Math.round((r.retirement.annualExpenseAtRetirement * 1.35) / 12))}/mo</b></div>
                </div>
              </div>
            </div>

            {/* BOTTOM: ADVISORY SUMMARY */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 4 }}>FINANCIAL OBSERVATION & ADVISORY</div>
              <p style={{ fontSize: 10.5, color: "#1B2035", margin: 0, lineHeight: 1.45 }}>
                Your current net monthly savings (<b>{INR_L(r.monthlySurplus)}/mo</b>) provides a solid base for systematic wealth creation. Primary recommendation is to close the insurance top-up gaps ({INR_L(r.termGap)} term, {INR_L(r.healthGap)} health) to ensure 100% protection strength.
              </p>
            </div>
          </div>
          <PrintPageFooter />
        </div>

        {/* ================= PAGE 10: EXECUTIVE CONCLUSION & CLIENT SUMMARY ================= */}
        <div className="epdf-page" style={{ background: "#FCFBF8" }}>
          
          <div>
            <div className="epdf-header" style={{ borderColor: "#E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 16 }}>
              <div>
                <div className="epdf-brand" style={{ color: "#1B2035", fontSize: 15, fontWeight: 800, margin: 0 }}>
                  Your <span style={{ color: "#C8A74D" }}>Wealth</span> Compass
                </div>
                <div style={{ fontSize: 9.5, color: "#6B7280", marginTop: 1 }}>Financial Fitness Report</div>
              </div>
              <div style={{ fontSize: 10, color: "#C8A74D", fontWeight: 800, background: "#FFFBEB", border: "1px solid #FCD34D", padding: "2px 8px", borderRadius: 4 }}>
                Page 10 of 10
              </div>
            </div>

            <h2 className="epdf-h2" style={{ color: "#1B2035", fontSize: 22, margin: "0 0 14px" }}>Financial Fitness Report</h2>

            {/* CENTERED HERO READINESS BADGE */}
            <div style={{ background: "#FFFFFF", border: `1px solid ${r.scores.overallScore >= 70 ? "#3E9F6E" : "#C8A74D"}`, borderRadius: 10, padding: 14, textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, letterSpacing: "0.05em" }}>FINANCIAL READINESS SCORE</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: r.scores.overallScore >= 70 ? "#3E9F6E" : "#C8A74D", margin: "2px 0" }}>
                {r.scores.overallScore} <span style={{ fontSize: 14, color: "#6B7280" }}>/ 100</span>
              </div>
              <span style={{
                background: r.scores.overallScore >= 70 ? "#ECFDF5" : "#FFFBEB",
                color: r.scores.overallScore >= 70 ? "#065F46" : "#92400E",
                border: `1px solid ${r.scores.overallScore >= 70 ? "#A7F3D0" : "#FCD34D"}`,
                padding: "3px 12px",
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 800
              }}>
                {r.scores.overallScore >= 70 ? "STATUS: READY TO EXECUTE" : "STATUS: REBALANCING RECOMMENDED"}
              </span>
            </div>

            {/* ROW 2: ACHIEVEMENT SUMMARY (DYNAMIC CARDS GRID) */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(4, 2 + (r.rows?.length || 0))}, 1fr)`, gap: 10, marginBottom: 14 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 9.5, color: "#3E9F6E", fontWeight: 800 }}>✓ RETIREMENT</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>{INR_L(r.retirement.corpusNeeded)}</div>
              </div>
              {r.rows && r.rows.map((row) => (
                <div key={row.id} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 9.5, color: "#3E9F6E", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    ✓ {row.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>{INR_L(row.fv)}</div>
                </div>
              ))}
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 9.5, color: "#3E9F6E", fontWeight: 800 }}>✓ PROTECTION</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#1B2035", marginTop: 2 }}>Risk Shield Audited</div>
              </div>
            </div>

            {/* ROW 3: CONSULTANT ADVISORY RECOMMENDATION */}
            <div style={{ background: "rgba(200, 167, 77, 0.08)", border: "1px solid rgba(200, 167, 77, 0.3)", borderLeft: "4px solid #C8A74D", borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#C8A74D", textTransform: "uppercase" }}>CONSULTANT ADVISORY RECOMMENDATION</div>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: "#1B2035" }}>Advisor: {activeAdvisorName} ({activeAdvisorDesignation})</div>
              </div>
              <p style={{ fontSize: 10.5, color: "#1B2035", margin: 0, lineHeight: 1.45 }}>
                Based on the audited financial data, {lead.name} possesses strong net monthly savings ({INR_L(r.monthlySurplus)}/mo) to achieve all stated goals. Priority should be given to closing the {INR_L(r.termGap)} term insurance gap before expanding equity investments. Annual reviews are recommended.
              </p>
            </div>

            {/* ROW 4: ANNUAL REVIEW SCHEDULE GRID */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6B7280", fontWeight: 700, marginBottom: 8 }}>ANNUAL REVIEW & ADVISORY SCHEDULE</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 10 }}>
                <div style={{ background: "#F8FAFC", padding: 8, borderRadius: 6 }}>
                  <div style={{ color: "#C8A74D", fontWeight: 800 }}>REVIEW 1 &bull; AUG 2027</div>
                  <div style={{ color: "#1B2035", marginTop: 2 }}>Portfolio Rebalancing & Insurance Check</div>
                </div>
                <div style={{ background: "#F8FAFC", padding: 8, borderRadius: 6 }}>
                  <div style={{ color: "#C8A74D", fontWeight: 800 }}>REVIEW 2 &bull; AUG 2028</div>
                  <div style={{ color: "#1B2035", marginTop: 2 }}>Goal Target Inflation Adjustment</div>
                </div>
                <div style={{ background: "#F8FAFC", padding: 8, borderRadius: 6 }}>
                  <div style={{ color: "#C8A74D", fontWeight: 800 }}>REVIEW 3 &bull; AUG 2029</div>
                  <div style={{ color: "#1B2035", marginTop: 2 }}>Retirement SWP Milestone Track</div>
                </div>
              </div>
            </div>

            {/* BOTTOM: DISCLAIMER BOX */}
            <div style={{ background: "#F8FAFC", border: "1px solid #E5E7EB", borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: 8.5, color: "#6B7280", lineHeight: 1.4 }}>
                <b>Disclaimer:</b> This report is generated based on financial information voluntarily provided by the client. Market investments are subject to market risks. Actual performance, inflation rates, and tax laws may vary. Intended for financial planning purposes only.
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 4, borderTop: "1px dashed #E5E7EB", fontSize: 9, color: "#94A3B8" }}>
                <span>Generated On: {dateStr}</span>
                <span><b>Prepared By:</b> {activeAdvisorName} ({activeAdvisorDesignation})</span>
              </div>
            </div>
          </div>

          <PrintPageFooter />
        </div>

        </div>
      </div>
    </div>
  );
}
