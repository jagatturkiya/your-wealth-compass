import React, { useState, useEffect } from "react";
import {
  Shield, HeartPulse, CheckCircle2, AlertTriangle, PiggyBank,
  Printer, Download, ArrowRight, GraduationCap, Heart, Home, Plane, Sparkles,
  TrendingUp, Calendar, AlertCircle, CheckSquare, Layers, Award, BarChart3, PieChart as PieChartIcon, Info, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from "recharts";
import {
  computeReport, INR, INR_L, goalTimeframeLabel,
  EDU_INFLATION, MARRIAGE_INFLATION, RETIREMENT_INFLATION, SHORT_TERM_RETURN, GUARANTEED_RETURN, SWP_RETURN, PPF_AGE_LIMIT, clamp, coverMultiplier, GOAL_META
} from "../../utils/financialEngine";
import EnterprisePdfDossier from "./EnterprisePdfDossier";

/* Circular score gauge matching site theme */
function CircleGauge({ value, label, color, size = 80, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamp(value) / 100) * c;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={stroke} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease-in-out",  }} />
        </svg>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 19, color: "#FFFFFF", fontWeight: 800, zIndex: 2, textAlign: "center" }}>
          {clamp(value)}
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: "#CBD5E1", textAlign: "center", maxWidth: 110, lineHeight: 1.25, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function scoreColor(v) {
  if (v >= 70) return "var(--accent-teal)";
  if (v >= 40) return "var(--accent-gold)";
  return "var(--alert-coral)";
}

export default function InteractiveReport({ lead, audience = "client", onOpenPdf, onEditReport }) {
  const [showPdfDossier, setShowPdfDossier] = useState(false);
  const [pdfErrorModal, setPdfErrorModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfLoadingText, setPdfLoadingText] = useState("Structuring 10-Page Financial Dossier...");

  if (!lead) return null;
  const r = computeReport(lead);
  if (!r) return null;

  const isConsultant = audience === "consultant";
  const age = Number(lead.age) || 0;
  const clientCity = lead.city || lead.protection?.city || "";
  const retirementTarget = lead.retirementAge || lead.protection?.retirementAge || 60;
  const genDate = new Date(lead.updatedAt || lead.submittedAt || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const hasData = Number(lead.income) > 0 || Number(lead.expenses) > 0 || Number(lead.savings) > 0 || (Array.isArray(lead.goals) && lead.goals.length > 0);

  // Authorship: ONLY referral source advisor gets credited. If no referral, default strictly to Jagat Turkiya, Certified Financial Planner.
  const hasReferralSource = Boolean(lead.sourceAdvisor?.advisorName && lead.sourceAdvisor.advisorName.trim());
  const activeAdvisorName = hasReferralSource
    ? lead.sourceAdvisor.advisorName.trim()
    : "Jagat Turkiya";

  const activeAdvisorDesignation = hasReferralSource
    ? (lead.sourceAdvisor.advisorDesignation || "Certified Financial Advisor")
    : "Certified Financial Planner";

  // Priority recommendations logic
  const highPriority = [];
  const mediumPriority = [];
  const lowPriority = [];

  if (r.termGap > 0) {
    highPriority.push(`Increase Term Life cover by ${INR_L(r.termGap)} to reach recommended protection of ${INR_L(r.recommendedCover)}.`);
  }
  if (r.healthGap > 0) {
    highPriority.push(`Upgrade Health Insurance floater by ${INR_L(r.healthGap)} for ${clientCity || "your city"} medical baseline.`);
  }
  if (r.emergencyGap > 0) {
    mediumPriority.push(`Build ${INR_L(r.emergencyGap)} in liquid emergency funds to reach 6 months buffer (${INR_L(r.emergencyTarget)}).`);
  }
  if (r.totalAnnual > r.annualSurplus) {
    mediumPriority.push(`Net savings available can be strategically deployed across milestone goals. Prioritize high-priority short-term investments and risk protection first.`);
  } else {
    lowPriority.push(`Annual net savings (${INR_L(r.annualSurplus)}) provides strong coverage across all configured milestone goals.`);
  }
  lowPriority.push(`Allocate monthly savings into structured investments to build target retirement corpus by age ${lead.retirementAge || 60}.`);

  // Chart data for annual investment distribution
  const chartColors = ["var(--accent-gold)", "var(--accent-teal)", "#818CF8", "#F43F5E", "#10B981", "#F59E0B"];
  const barData = [
    ...r.rows.map((row) => ({ name: row.label, annual: Math.round(row.annual), fv: Math.round(row.fv) })),
    { name: "Retirement", annual: Math.round(r.retirement.annual), fv: Math.round(r.retirement.corpusNeeded) }
  ];

  return (
    <div className="ffr-full-report-container" style={{ textAlign: "left", width: "100%" }}>
      <style>{`
        .ffr-full-report-container { width: 100%; color: var(--text-main); font-family: var(--font-sans); }

        .rpt-banner { background: linear-gradient(135deg, rgba(20, 24, 38, 0.98) 0%, rgba(13, 15, 24, 0.99) 100%); border-radius: 18px; padding: 32px 36px; color: var(--text-main); margin-bottom: 28px; border: 1px solid var(--border-medium); box-shadow: var(--shadow-layered); }
        .rpt-banner-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
        .rpt-gen { font-size: 12px; color: var(--text-fog); font-family: var(--font-mono); }
        .rpt-banner h2 { margin: 0 0 8px; font-size: clamp(24px, 3.5vw, 36px); line-height: 1.15; font-weight: 600; font-family: var(--font-serif); color: var(--text-main); }
        .rpt-banner p { margin: 0; color: var(--accent-gold); font-size: 15px; font-weight: 500; }

        .ffr-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 28px; }
        .ffr-info-item { background: var(--bg-surface); border-radius: 12px; padding: 16px 20px; border: 1px solid var(--border-subtle); transition: transform 0.2s; }
        .ffr-info-item:hover { border-color: var(--border-gold); }
        .ffr-info-item .l { font-size: 11px; color: var(--text-fog); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .ffr-info-item .v { font-family: var(--font-mono); font-size: 18px; color: var(--text-main); margin-top: 6px; font-weight: 700; }
        .ffr-info-item .v.gold { color: var(--accent-gold) !important; }

        .rpt-score-card { border: 1px solid var(--border-medium); border-radius: 18px; padding: 32px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 28px; background: linear-gradient(135deg, rgba(24, 28, 44, 0.95) 0%, rgba(15, 17, 28, 0.98) 100%); box-shadow: var(--shadow-layered); }
        .rpt-score-num { font-family: var(--font-mono); font-size: 48px; font-weight: 700; line-height: 1; }
        .rpt-score-num span { font-size: 18px; color: var(--text-fog); font-weight: 400; }
        .rpt-score-label { font-size: 14px; color: var(--text-fog); margin-top: 6px; }

        .rpt-section-title { font-size: 18px; font-weight: 600; font-family: var(--font-serif); color: var(--text-main); margin: 36px 0 16px; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 10px; }

        .rpt-exec-box { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 22px 26px; margin-bottom: 28px; border-left: 4px solid var(--accent-gold); }
        .rpt-exec-box p { color: var(--text-fog); font-size: 15px; line-height: 1.65; margin: 0; }

        .rpt-cow { display: flex; align-items: stretch; gap: 0; border-radius: 14px; overflow: hidden; margin-bottom: 28px; border: 1px solid var(--border-subtle); background: var(--bg-surface); }
        .rpt-cow-block { flex: 1; padding: 22px 26px; }
        .rpt-cow-block.dark { background: rgba(18, 21, 34, 0.8); }
        .rpt-cow-block.light { background: rgba(201, 154, 75, 0.08); }
        .rpt-cow-block .l { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-fog); font-weight: 600; }
        .rpt-cow-block .v { font-family: var(--font-mono); font-size: 26px; font-weight: 700; margin: 6px 0 2px; color: var(--text-main); }
        .rpt-cow-block.light .v { color: var(--accent-gold); }
        .rpt-cow-arrow { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 24px; background: rgba(255, 255, 255, 0.02); font-size: 12px; color: var(--text-fog); text-align: center; gap: 4px; border-left: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); white-space: nowrap; }

        .rpt-goal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 28px; }
        .rpt-goal-card { border: 1px solid var(--border-subtle); border-radius: 14px; padding: 22px; background: var(--bg-surface); border-top: 3.5px solid var(--accent-gold); }
        .rpt-goal-card.term-short { border-top-color: var(--accent-teal); }
        .rpt-goal-card.term-long { border-top-color: var(--alert-coral); }

        .ffr-risk-card { border-radius: 14px; padding: 20px 24px; margin-bottom: 14px; display: flex; gap: 18px; align-items: flex-start; border: 1px solid var(--border-subtle); background: var(--bg-surface); }
        .ffr-risk-card.gap { background: rgba(239, 68, 68, 0.06); border-color: rgba(239, 68, 68, 0.2); }
        .ffr-risk-card.ok { background: rgba(16, 185, 129, 0.06); border-color: rgba(16, 185, 129, 0.2); }

        .rpt-priority-box { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 20px 24px; margin-bottom: 28px; }
        .rpt-p-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border-subtle); }
        .rpt-p-item:last-child { border-bottom: none; }

        .rpt-summary-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 28px; }

        .rpt-assumptions { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin: 28px 0; }
        .rpt-assumptions div { text-align: center; background: var(--bg-surface); border-radius: 10px; padding: 14px 10px; font-size: 11px; color: var(--text-fog); border: 1px solid var(--border-subtle); }
        .rpt-assumptions span { display: block; font-family: var(--font-mono); font-size: 16px; color: var(--text-main); font-weight: 700; margin-bottom: 2px; }

        .ffr-total-row { display: flex; justify-content: space-between; align-items: center; padding: 20px 8px; border-top: 2px solid var(--border-gold); margin-top: 14px; }
        .ffr-total-row .lbl { font-size: 15px; color: var(--text-fog); font-weight: 500; }
        .ffr-total-row .val { font-family: var(--font-mono); font-size: 24px; color: var(--accent-gold); font-weight: 700; }

        .ffr-surplus-warn { font-size: 13.5px; color: var(--alert-coral); background: rgba(239, 68, 68, 0.08); padding: 12px 18px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2); margin-top: 10px; }
        .ffr-surplus-ok { font-size: 13.5px; color: var(--accent-teal); background: rgba(16, 185, 129, 0.08); padding: 12px 18px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); margin-top: 10px; }

        /* Priority Cards */
        .rpt-priorities-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
        .rpt-priority-card { border-radius: 14px; padding: 18px 22px; display: flex; align-items: flex-start; gap: 16px; transition: transform 0.2s; }
        .rpt-priority-badge { color: #07080C; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; margin-top: 2px; flex-shrink: 0; }
        .rpt-priority-content { flex: 1; }
        .rpt-priority-content h4 { margin: 0 0 4px; font-size: 16px; font-weight: 700; color: var(--text-main); }
        .rpt-priority-content p { margin: 0; font-size: 13.5px; color: var(--text-fog); line-height: 1.5; }

        .rpt-score-gauges { display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; }

        /* MOBILE RESPONSIVENESS (< 768px) */
        @media (max-width: 768px) {
          .rpt-banner { padding: 18px 14px !important; margin-bottom: 18px !important; border-radius: 14px !important; }
          .rpt-banner-top { flex-direction: column !important; align-items: stretch !important; gap: 14px !important; }
          .rpt-banner-top > div { width: 100% !important; }
          .rpt-banner-top button { width: 100% !important; justify-content: center !important; height: 44px !important; font-size: 13.5px !important; }
          .rpt-banner h2 { font-size: 18px !important; }

          .ffr-info-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; margin-bottom: 18px !important; }
          .ffr-info-item { padding: 10px 10px !important; border-radius: 10px !important; }
          .ffr-info-item .l { font-size: 10px !important; }
          .ffr-info-item .v { font-size: 14.5px !important; margin-top: 3px !important; }

          .rpt-score-card { padding: 18px 14px !important; border-radius: 14px !important; flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 18px !important; margin-bottom: 18px !important; }
          .rpt-score-num { font-size: 38px !important; }
          .rpt-score-gauges { gap: 10px !important; justify-content: space-around !important; width: 100% !important; }

          .rpt-section-title { font-size: 15.5px !important; margin: 22px 0 10px !important; padding-bottom: 8px !important; flex-wrap: wrap !important; }

          .rpt-exec-box { padding: 14px 14px !important; margin-bottom: 18px !important; border-radius: 12px !important; }
          .rpt-exec-box p { font-size: 13px !important; line-height: 1.55 !important; }

          /* CRITICAL: STACK PRIORITY CARDS VERTICALLY ON MOBILE */
          .rpt-priority-card { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; padding: 14px 14px !important; border-radius: 12px !important; }
          .rpt-priority-badge { align-self: flex-start !important; font-size: 10px !important; padding: 3px 8px !important; margin-top: 0 !important; }
          .rpt-priority-content { width: 100% !important; }
          .rpt-priority-content h4 { font-size: 15px !important; margin-bottom: 4px !important; }
          .rpt-priority-content p { font-size: 12.5px !important; line-height: 1.5 !important; }

          /* STACK COST OF WAITING ON MOBILE */
          .rpt-cow { flex-direction: column !important; border-radius: 12px !important; margin-bottom: 18px !important; }
          .rpt-cow-block { padding: 14px 14px !important; text-align: center !important; }
          .rpt-cow-block .v { font-size: 20px !important; }
          .rpt-cow-arrow { flex-direction: row !important; padding: 8px 12px !important; border-left: none !important; border-right: none !important; border-top: 1px solid var(--border-subtle) !important; border-bottom: 1px solid var(--border-subtle) !important; justify-content: center !important; }
          .rpt-cow-arrow svg { transform: rotate(90deg) !important; }

          .rpt-goal-grid { grid-template-columns: 1fr !important; gap: 12px !important; margin-bottom: 18px !important; }
          .rpt-goal-card { padding: 14px 14px !important; border-radius: 12px !important; }

          .ffr-risk-card { flex-direction: column !important; padding: 14px 14px !important; gap: 10px !important; border-radius: 12px !important; }

          .rpt-summary-charts { grid-template-columns: 1fr !important; gap: 14px !important; margin-bottom: 18px !important; }

          .ffr-total-row { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; padding: 12px 4px !important; }
          .ffr-total-row .lbl { font-size: 13.5px !important; }
          .ffr-total-row .val { font-size: 19px !important; }

          .rpt-priority-box { padding: 12px !important; }
          .rpt-p-item { flex-direction: column !important; gap: 6px !important; padding: 10px 0 !important; }
        }

        @media print {
          .ffr-full-report-container { color: #000 !important; background: #fff !important; padding: 0 !important; }
          .rpt-banner, .rpt-score-card, .ffr-info-item, .rpt-goal-card, .ffr-risk-card, .rpt-priority-box, .rpt-exec-box { background: #fff !important; color: #000 !important; border: 1px solid #ccc !important; box-shadow: none !important; }
          .rpt-banner h2, .rpt-section-title, .rpt-score-num, .v { color: #000 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Main Header Banner */}
      <div className="rpt-banner" style={{ background: "linear-gradient(135deg, rgba(201, 154, 75, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)", border: "1px solid var(--border-gold)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent-gold)", letterSpacing: "-0.01em", marginBottom: 4 }}>
              {lead.name ? lead.name.toUpperCase() : "CLIENT"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-fog)" }}>Generated on {genDate}</span>
              {(lead.age || clientCity) && (
                <span style={{ fontSize: 12, color: "var(--text-fog)" }}>
                  &bull; {lead.age ? `Age ${lead.age}` : ""}{lead.age && clientCity ? " • " : ""}{clientCity ? clientCity : ""}
                </span>
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>Financial Fitness Report</h2>
            <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201, 154, 75, 0.12)", border: "1px solid rgba(201, 154, 75, 0.35)", borderRadius: 10, padding: "6px 14px" }}>
              <Award size={15} color="var(--accent-gold)" />
              <div style={{ fontSize: 12.5, color: "#E2E8F0" }}>
                Prepared by <b style={{ color: "var(--accent-gold)" }}>{activeAdvisorName}</b> <span style={{ color: "var(--text-fog)" }}>({activeAdvisorDesignation})</span>
              </div>
            </div>
          </div>

          <button
            className="ff-btn-gold"
            onClick={() => {
              if (!hasData) {
                setPdfErrorModal(true);
                return;
              }
              setIsGeneratingPdf(true);
              setPdfLoadingText("Structuring 10-Page Financial Dossier...");

              setTimeout(() => setPdfLoadingText("Compounding Actuarial SWP Longevity..."), 500);
              setTimeout(() => setPdfLoadingText("Applying Executive Layout Engine..."), 1000);
              setTimeout(() => setPdfLoadingText("Rendering High-Resolution Dossier..."), 1400);

              setTimeout(() => {
                setIsGeneratingPdf(false);
                if (onOpenPdf) onOpenPdf();
                else setShowPdfDossier(true);
              }, 1800);
            }}
            style={{
              padding: "12px 22px",
              fontSize: 13.5,
              fontWeight: 700,
              borderRadius: 10,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 9,
              boxShadow: "0 4px 16px rgba(201, 154, 75, 0.3)",
              whiteSpace: "nowrap"
            }}
          >
            <Download size={17} /> Download Report Preview
          </button>
        </div>
      </div>

      {/* MICRO-ANIMATION PDF GENERATION LOADING OVERLAY */}
      {isGeneratingPdf && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7, 8, 12, 0.88)", backdropFilter: "blur(12px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#141824", border: "1px solid var(--border-gold)", borderRadius: 20, padding: "36px 32px", maxWidth: 460, width: "100%", textAlign: "center", color: "#FFF", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
            <div style={{
              width: 52,
              height: 52,
              border: "3px solid rgba(201, 154, 75, 0.2)",
              borderTopColor: "var(--accent-gold)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 20px"
            }} />
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-main)", margin: "0 0 8px", fontFamily: "var(--font-serif)" }}>
              Generating Report PDF
            </h3>
            <div style={{ fontSize: 13.5, color: "var(--accent-gold)", fontWeight: 600, minHeight: 24 }}>
              {pdfLoadingText}
            </div>
            <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 20, overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, #C8A74D 0%, #3E9F6E 100%)", animation: "progressPulse 1.8s ease-in-out infinite" }} />
            </div>
          </div>
        </div>
      )}

      {/* ERROR POPUP MODAL WHEN FORM DATA IS EMPTY */}
      {pdfErrorModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7, 8, 12, 0.85)", backdropFilter: "blur(10px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#141824", border: "1px solid var(--border-gold)", borderRadius: 16, padding: "32px 28px", maxWidth: 440, width: "100%", textAlign: "center", color: "#FFF", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#F87171", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px", color: "var(--text-main)", fontFamily: "var(--font-serif)" }}>
              Form Data Required
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--text-fog)", lineHeight: 1.6, margin: "0 0 24px" }}>
              No financial data has been entered in the form, so a PDF report cannot be generated. Please fill in your details (age, income, expenses, and goals) in the evaluation form first.
            </p>
            <button
              onClick={() => {
                setPdfErrorModal(false);
                if (typeof onEditReport === "function") onEditReport();
              }}
              className="ff-btn-gold"
              style={{ width: "100%", height: 48, borderRadius: 12, fontWeight: 700, fontSize: 14.5, cursor: "pointer" }}
            >
              Complete Evaluation Form
            </button>
          </div>
        </div>
      )}

      {/* Quick Profile Metrics Grid */}
      <div className="ffr-info-grid">
        <div className="ffr-info-item"><div className="l">Client Name</div><div className="v">{lead.name || "—"}</div></div>
        <div className="ffr-info-item"><div className="l">Current Age</div><div className="v">{lead.age ? `${lead.age} yrs` : "—"}</div></div>
        <div className="ffr-info-item"><div className="l">City</div><div className="v">{clientCity || "—"}</div></div>
        <div className="ffr-info-item"><div className="l">Retirement Target</div><div className="v">{retirementTarget ? `${retirementTarget} yrs` : "60 yrs"}</div></div>
        <div className="ffr-info-item"><div className="l">Monthly Income</div><div className="v">{INR_L(lead.income)}</div></div>
        <div className="ffr-info-item"><div className="l">Monthly Expenses</div><div className="v">{INR_L(lead.expenses)}</div></div>
        <div className="ffr-info-item"><div className="l">Liquid Savings</div><div className="v">{INR_L(lead.savings)}</div></div>
        <div className="ffr-info-item"><div className="l">Years to Retirement</div><div className="v">{r.retirement.yearsToRetire} yrs</div></div>
        {isConsultant && (
          <>
            <div className="ffr-info-item"><div className="l">Email</div><div className="v" style={{ fontSize: 14 }}>{lead.email}</div></div>
            <div className="ffr-info-item"><div className="l">Mobile</div><div className="v">{lead.mobile}</div></div>
          </>
        )}
      </div>

      {/* Health Score Card & Gauges */}
      <div className="rpt-score-card">
        <div>
          <div className="rpt-score-num" style={{ color: scoreColor(r.scores.overallScore) }}>
            {r.scores.overallScore}<span>/100</span>
          </div>
          <div className="rpt-score-label">Overall Financial Health Score</div>
          <div className={`ff-badge ${r.scores.overallScore >= 70 ? "ff-badge-ok" : r.scores.overallScore >= 40 ? "ff-badge-gold" : "ff-badge-gap"}`} style={{ marginTop: 10 }}>
            {r.scores.overallScore >= 70 ? "On Track" : r.scores.overallScore >= 40 ? "Needs Improvement" : "Needs Attention"}
          </div>
        </div>
        <div className="rpt-score-gauges">
          <CircleGauge value={r.scores.retirementReadiness} label="Retirement Readiness" color={scoreColor(r.scores.retirementReadiness)} />
          <CircleGauge value={r.scores.goalPreparedness} label="Goal Preparedness" color={scoreColor(r.scores.goalPreparedness)} />
          <CircleGauge value={r.scores.protectionStrength} label="Protection Strength" color={scoreColor(r.scores.protectionStrength)} />
        </div>
      </div>

      {/* Executive Summary */}
      <div className="rpt-section-title">
        <Sparkles size={18} color="var(--accent-gold)" /> Executive Summary & Strategy
      </div>
      <div className="rpt-exec-box">
        <p>
          Your net monthly savings of <b style={{ color: "var(--text-main)" }}>{INR_L(r.monthlySurplus)}</b> provides a strong cashflow baseline to build your target retirement corpus of <b style={{ color: "var(--accent-teal)" }}>{INR_L(r.retirement.corpusNeeded)}</b> by age {lead.retirementAge || 60}. Key risk areas include term protection (<b style={{ color: "var(--alert-coral)" }}>{r.termGap > 0 ? INR_L(r.termGap) + " gap" : "Sufficient"}</b>) and medical floater cover (<b style={{ color: "var(--accent-gold)" }}>{r.healthGap > 0 ? INR_L(r.healthGap) + " gap" : "Sufficient"}</b>). Our wealth advisory desk will guide you on the optimal step-up investment strategy on your advisory call.
        </p>
      </div>

      {/* Action Priority Matrix (Importance Highlighting) */}
      {r.priorities && r.priorities.length > 0 && (
        <>
          <div className="rpt-section-title">
            <Award size={18} color="var(--accent-gold)" /> Action Priority (Where to Focus First)
          </div>
          <div className="rpt-priorities-list">
            {r.priorities.map((item) => (
              <div
                key={item.tag}
                className="rpt-priority-card"
                style={{
                  background: item.bgColor,
                  border: `1.5px solid ${item.borderColor}`
                }}
              >
                <div
                  className="rpt-priority-badge"
                  style={{
                    background: item.color
                  }}
                >
                  {item.tag}
                </div>
                <div className="rpt-priority-content">
                  <h4>
                    {item.title}
                  </h4>
                  <p>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cost of Waiting (Inflation Impact) */}
      {r.costExample && r.rows.length > 0 && (
        <>
          <div className="rpt-section-title">
            <TrendingUp size={18} color="var(--accent-teal)" /> Inflation Impact Analysis (Cost of Waiting)
          </div>
          <div className="rpt-cow">
            <div className="rpt-cow-block dark">
              <div className="l">Today's Cost</div>
              <div className="v">{INR_L(r.costExample.cost)}</div>
              <div style={{ fontSize: 12, color: "var(--text-fog)", marginTop: 4 }}>{r.costExample.label}, today's price</div>
            </div>
            <div className="rpt-cow-arrow">
              <ArrowRight size={20} color="var(--accent-gold)" />
              <span>{EDU_INFLATION}% inflation, {r.costExample.years.toFixed(0)} yrs</span>
            </div>
            <div className="rpt-cow-block light">
              <div className="l">Future Cost (Inflation Target)</div>
              <div className="v">{INR_L(r.costExample.fv)}</div>
              <div style={{ fontSize: 12, color: "var(--text-fog)", marginTop: 4 }}>the same goal, inflation-compounded</div>
            </div>
          </div>
        </>
      )}

      {/* Required Annual Investment Bar Chart */}
      <div className="rpt-section-title">
        <BarChart3 size={18} color="var(--accent-gold)" /> Required Annual Investment Breakdown
      </div>
      <div className="ff-card-glass" style={{ padding: 24, borderRadius: 16, marginBottom: 28, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div style={{ height: 280, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#CBD5E1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12, fill: '#CBD5E1' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
                  if (v >= 100000) return `₹${Math.round(v / 100000)} L`;
                  return `₹${Math.round(v / 1000)}k`;
                }}
              />
              <Tooltip formatter={(v) => INR(v)} contentStyle={{ background: '#0D0E15', borderRadius: 8, border: '1px solid var(--border-gold)', color: '#FFFFFF', fontSize: 13 }} itemStyle={{ color: '#FFFFFF' }} labelStyle={{ color: '#CBD5E1', fontWeight: 700 }} />
              <Bar dataKey="annual" radius={[6, 6, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Goals at a Glance */}
      {r.rows.length > 0 && (
        <>
          <div className="rpt-section-title">
            <Layers size={18} color="var(--accent-teal)" /> Milestone Goals Allocation
          </div>
          <div className="rpt-goal-grid">
            {r.rows.map((row) => {
              const IconComp = row.Icon || GOAL_META[row.type]?.Icon || GraduationCap;
              return (
                <div className={`rpt-goal-card ${row.bucket === "short" ? "term-short" : "term-long"}`} key={row.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 16, color: "var(--text-main)", marginBottom: 4 }}>
                    <IconComp size={18} color="var(--accent-gold)" />
                    <span>{row.label}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-fog)", marginBottom: 12 }}>{row.sub}</div>
                  <span className={`ff-badge ${row.bucket === "short" ? "ff-badge-ok" : "ff-badge-gold"}`} style={{ marginBottom: 14 }}>
                    {goalTimeframeLabel(row)}
                  </span>
                  <div style={{ display: "flex", gap: 20, margin: "14px 0" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-fog)", textTransform: "uppercase" }}>Today</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>{INR_L(row.cost)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--text-fog)", textTransform: "uppercase" }}>Future Target</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>{INR_L(row.fv)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: 8, display: "flex", justifyContent: "space-between", border: "1px solid var(--border-subtle)" }}>
                    <span style={{ color: "var(--text-fog)" }}>Required Investment</span>
                    <span style={{ fontWeight: 700, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>{INR(row.annual)}/yr</span>
                  </div>
                  {isConsultant && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={`ff-badge ${row.bucket === "short" ? "ff-badge-ok" : "ff-badge-gap"}`}>
                        {row.bucket === "short" ? "Recommend: Short-Term Investment" : "Recommend: Guaranteed Plan"}
                        {row.bucket !== "short" && Number(age) < PPF_AGE_LIMIT ? " + PPF" : ""}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Post Retirement SWP Simulation */}
      <div className="rpt-section-title">
        <PiggyBank size={18} color="var(--accent-teal)" /> Retirement Corpus & Post-Retirement Withdrawal (Actuarial SWP Model)
      </div>
      <div className="ff-card-glass" style={{ padding: 24, borderRadius: 16, marginBottom: 28, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>

        {/* KPI Metrics Panel */}
        <div className="ffr-info-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: 0 }}>
          <div className="ffr-info-item"><div className="l">Current Expense</div><div className="v">{INR_L(lead.expenses)}/mo</div></div>
          <div className="ffr-info-item"><div className="l">At Retirement ({RETIREMENT_INFLATION}% infl.)</div><div className="v gold">{INR_L(r.retirement.annualExpenseAtRetirement / 12)}/mo</div></div>
          <div className="ffr-info-item" style={{ background: "rgba(95, 168, 160, 0.12)", borderColor: "var(--accent-teal)" }}>
            <div className="l" style={{ color: "var(--accent-teal)" }}>Corpus Needed at Age {lead.retirementAge || 60}</div>
            <div className="v" style={{ color: "var(--accent-teal)" }}>{INR_L(r.retirement.corpusNeeded)}</div>
          </div>
          <div className="ffr-info-item"><div className="l">Year 1 Withdrawal</div><div className="v">{INR_L(r.swpKpi?.firstYearWithdrawal)}/yr</div></div>
          <div className="ffr-info-item"><div className="l">Age 85 Withdrawal</div><div className="v gold">{INR_L(r.swpKpi?.finalYearWithdrawal)}/yr</div></div>
          <div className="ffr-info-item" style={{ background: "rgba(201, 154, 75, 0.12)", borderColor: "var(--border-gold)" }}>
            <div className="l" style={{ color: "var(--accent-gold)" }}>Age 85 Closing Corpus</div>
            <div className="v" style={{ color: "var(--accent-gold)" }}>{INR_L(r.swpKpi?.finalClosingCorpus)}</div>
          </div>
        </div>
      </div>

      {/* Protection Risk Cards */}
      <div className="rpt-section-title">
        <Shield size={18} color="var(--alert-coral)" /> Protection & Safety Shield Audit
      </div>
      <div className={`ffr-risk-card ${r.termGap > 0 ? "gap" : "ok"}`}>
        <Shield size={22} color={r.termGap > 0 ? "var(--alert-coral)" : "var(--accent-teal)"} style={{ marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Term Life Insurance</h4>
            <span className={`ff-badge ${r.termGap > 0 ? "ff-badge-gap" : "ff-badge-ok"}`}>
              {r.termGap > 0 ? (lead.termInsurance === "yes" ? `Top-Up Needed ${INR_L(r.termGap)}` : `Gap ${INR_L(r.termGap)}`) : "Fully Covered"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-fog)" }}>
            {lead.termInsurance === "yes" ? (
              <>Your active term insurance cover is <b style={{ color: "var(--accent-gold)" }}>{INR_L(lead.termAmount)}</b>. Based on Human Life Value (15x annual income) and future goal liabilities, your recommended cover target is <b style={{ color: "var(--text-main)" }}>{INR_L(r.recommendedCover)}</b>. An additional top-up cover of <b style={{ color: "var(--alert-coral)" }}>{INR_L(r.termGap)}</b> is recommended to fully safeguard your family.</>
            ) : (
              <>Current active cover: ₹0 &bull; Recommended cover target: <b style={{ color: "var(--text-main)" }}>{INR_L(r.recommendedCover)}</b> (based on 15x HLV proxy and goal liabilities).</>
            )}
          </p>
        </div>
      </div>

      <div className={`ffr-risk-card ${r.healthGap > 0 ? "gap" : "ok"}`}>
        <HeartPulse size={22} color={r.healthGap > 0 ? "var(--accent-gold)" : "var(--accent-teal)"} style={{ marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Health Insurance Floater</h4>
            <span className={`ff-badge ${r.healthGap > 0 ? "ff-badge-gold" : "ff-badge-ok"}`}>
              {r.healthGap > 0 ? (lead.healthInsurance === "yes" ? `Top-Up Needed ${INR_L(r.healthGap)}` : `Gap ${INR_L(r.healthGap)}`) : "Fully Covered"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-fog)" }}>
            {lead.healthInsurance === "yes" ? (
              <>Active health cover: <b style={{ color: "var(--accent-gold)" }}>{INR_L(lead.healthAmount)}</b> &bull; Target baseline: <b style={{ color: "var(--text-main)" }}>{INR_L(r.healthTarget)}</b>. An additional top-up cover of <b style={{ color: "var(--accent-gold)" }}>{INR_L(r.healthGap)}</b> is recommended ({clientCity || "Metro"} city tier baseline).</>
            ) : (
              <>Current active cover: ₹0 &bull; Recommended target baseline: <b style={{ color: "var(--text-main)" }}>{INR_L(r.healthTarget)}</b> ({clientCity || "Metro"} city tier baseline).</>
            )}
          </p>
        </div>
      </div>

      <div className={`ffr-risk-card ${r.emergencyGap > 0 ? "gap" : "ok"}`}>
        <PiggyBank size={22} color={r.emergencyGap > 0 ? "var(--accent-gold)" : "var(--accent-teal)"} style={{ marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Emergency Fund Buffer</h4>
            <span className={`ff-badge ${r.emergencyGap > 0 ? "ff-badge-gold" : "ff-badge-ok"}`}>
              {r.emergencyGap > 0 ? `Build ${INR_L(r.emergencyGap)}` : "Sufficient Buffer"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-fog)" }}>
            Current liquid savings: {INR_L(r.emergencyCurrent)} &bull; Required 6-month buffer: <b style={{ color: "var(--text-main)" }}>{INR_L(r.emergencyTarget)}</b>.
          </p>
        </div>
      </div>

      {/* Priority Actions */}
      <div className="rpt-section-title">
        <Award size={18} color="var(--accent-gold)" /> Priority Recommendations
      </div>
      <div className="rpt-priority-box">
        {highPriority.map((item, idx) => (
          <div className="rpt-p-item" key={"h" + idx}>
            <span className="ff-badge ff-badge-gap">High</span>
            <span style={{ fontSize: 14, color: "var(--text-main)" }}>{item}</span>
          </div>
        ))}
        {mediumPriority.map((item, idx) => (
          <div className="rpt-p-item" key={"m" + idx}>
            <span className="ff-badge ff-badge-gold">Medium</span>
            <span style={{ fontSize: 14, color: "var(--text-main)" }}>{item}</span>
          </div>
        ))}
        {lowPriority.map((item, idx) => (
          <div className="rpt-p-item" key={"l" + idx}>
            <span className="ff-badge ff-badge-ok">Low</span>
            <span style={{ fontSize: 14, color: "var(--text-main)" }}>{item}</span>
          </div>
        ))}
      </div>

      {/* Summary Table & Allocation Distribution Pie */}
      <div className="rpt-section-title">
        <PieChartIcon size={18} color="var(--accent-gold)" /> Asset Distribution & Investment Summary
      </div>
      <div className="rpt-summary-charts">
        <div className="ff-card-glass" style={{ padding: 20, borderRadius: 16, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ height: 220, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={r.distribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {r.distribution.map((d, i) => (
                    <Cell key={i} fill={["var(--accent-gold)", "var(--accent-teal)", "#818CF8", "#F43F5E", "#10B981", "#F59E0B"][i % 6]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => INR(v) + "/yr"} contentStyle={{ background: '#121522', borderRadius: 8, border: '1px solid var(--border-gold)', color: '#fff', fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-fog)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="ff-card-glass" style={{ padding: 20, borderRadius: 16, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-fog)", fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Goal</th>
                <th style={{ padding: 8, textAlign: "center" }}>Horizon</th>
                <th style={{ padding: 8, textAlign: "right" }}>Annual Investment</th>
              </tr>
            </thead>
            <tbody>
              {[...r.rows.map(row => ({ label: row.label, years: row.years })), { label: "Retirement", years: r.retirement.yearsToRetire }]
                .sort((a, b) => a.years - b.years)
                .map((g, i) => {
                  const row = r.rows.find(x => x.label === g.label) || null;
                  const annual = row ? row.annual : r.retirement.annual;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: 8, fontWeight: 500 }}>{g.label}</td>
                      <td style={{ padding: 8, textAlign: "center", color: "var(--text-fog)", fontFamily: "var(--font-mono)" }}>{g.years.toFixed(1)} yrs</td>
                      <td style={{ padding: 8, textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-gold)" }}>{INR_L(annual)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Savings & Investment Check Banner */}
      <div className="ffr-total-row">
        <span className="lbl">Monthly Savings Available For Investment Strategy:</span>
        <span className="val">{INR_L(r.monthlySurplus)}/mo</span>
      </div>

      <div className="ffr-surplus-ok">
        <b>Advisory Cashflow Baseline:</b> Your available monthly savings of <b>{INR_L(r.monthlySurplus)}</b> provides a healthy baseline to structure your milestone goals and retirement portfolio on your client call.
      </div>

      {/* LUXURY PLANNER CREDENTIAL SIGNATURE CARD */}
      <div
        style={{
          marginTop: 24,
          marginBottom: 16,
          background: "linear-gradient(135deg, rgba(20, 24, 38, 0.95) 0%, rgba(13, 16, 26, 0.98) 100%)",
          border: "1.5px solid rgba(201, 154, 75, 0.4)",
          borderRadius: 18,
          padding: "24px 28px",
          boxShadow: "0 14px 38px rgba(0, 0, 0, 0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(201, 154, 75, 0.25) 0%, rgba(201, 154, 75, 0.08) 100%)",
              border: "1.5px solid var(--accent-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-gold)",
              
              flexShrink: 0
            }}
          >
            <Award size={26} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-fog)", fontWeight: 700, marginBottom: 3 }}>
              FIDUCIARY FINANCIAL ARCHITECTURE
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
              Prepared by <span style={{ color: "var(--accent-gold)" }}>{activeAdvisorName}</span>
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600, marginTop: 2 }}>
              {activeAdvisorDesignation}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 14px", borderRadius: 20, color: "#34D399", fontSize: 12, fontWeight: 700 }}>
            <CheckCircle2 size={14} /> Verified Advisory Diagnostic
          </div>
          <div style={{ fontSize: 11, color: "var(--text-fog)", marginTop: 6 }}>
            Report Ref: {lead._id || lead.id || "YWC-2026"} &bull; {genDate}
          </div>
        </div>
      </div>

      {showPdfDossier && <EnterprisePdfDossier lead={lead} onClose={() => setShowPdfDossier(false)} />}
    </div>
  );
}
