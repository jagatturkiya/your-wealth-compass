import React, { useState, useEffect } from "react";
import {
  FileText,
  PlusCircle,
  Download,
  Eye,
  TrendingUp,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Clock,
  Trash2,
  RefreshCw,
  Award,
  AlertCircle,
  Mail,
  Phone,
  Layers
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { computeReport, INR, INR_L } from "../../utils/financialEngine";
import InteractiveReport from "../Client/InteractiveReport";
import PdfViewer from "../Client/PdfViewer";

export default function ClientDashboard({ onStartNewAssessment, onCloneAssessment, onOpenAdvisory }) {
  const { user, openAuthModal } = useAuth();
  const { userAssessments, fetchUserAssessments, deleteUserAssessment } = useApp();

  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [isViewingReport, setIsViewingReport] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfLead, setPdfLead] = useState(null);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingAssessments(true);
      fetchUserAssessments(user).finally(() => setLoadingAssessments(false));
    }
  }, [user, fetchUserAssessments]);

  // Determine latest assessment
  const latestAssessment = userAssessments && userAssessments.length > 0 ? userAssessments[0] : null;
  const latestReport = latestAssessment ? computeReport(latestAssessment) : null;

  const handleViewReport = (assessment) => {
    setSelectedAssessment(assessment);
    setIsViewingReport(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownloadPdf = (assessment) => {
    setPdfLead(assessment);
    setIsPdfModalOpen(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this assessment record from your history?")) {
      await deleteUserAssessment(id);
      if (selectedAssessment && (selectedAssessment.id === id || selectedAssessment._id === id)) {
        setIsViewingReport(false);
        setSelectedAssessment(null);
      }
    }
  };

  const handleClone = (assessment, e) => {
    e.stopPropagation();
    if (onCloneAssessment) {
      onCloneAssessment(assessment);
    }
  };

  // If user is inspecting a specific assessment report in full view
  if (isViewingReport && selectedAssessment) {
    return (
      <div className="ff-wizard-wrapper" style={{ padding: "95px 4% 80px", maxWidth: 1380, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button
            className="ff-btn-ghost"
            onClick={() => setIsViewingReport(false)}
            style={{ fontSize: 14, color: "var(--text-soft)", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8 }}
          >
            &larr; Back to Assessments Dashboard
          </button>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="ff-btn-wizard-ghost"
              onClick={() => handleDownloadPdf(selectedAssessment)}
              style={{ height: 42, padding: "0 18px", fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}
            >
              <Download size={15} /> Download PDF
            </button>
            <button
              className="ff-btn-wizard-primary"
              onClick={(e) => handleClone(selectedAssessment, e)}
              style={{ height: 42, padding: "0 20px", fontSize: 13.5 }}
            >
              Recalculate Inputs <RefreshCw size={15} />
            </button>
          </div>
        </div>

        <div
          className="ff-wizard-floating-card"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-medium)",
            borderRadius: 20,
            padding: "36px 40px",
            boxShadow: "var(--shadow-layered)",
            width: "100%"
          }}
        >
          <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 16 }}>
            <div>
              <span style={{ fontSize: 12, color: "var(--accent-gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Historical Diagnostic Record</span>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-main)", margin: "4px 0 0", fontFamily: "var(--font-serif)" }}>
                {selectedAssessment.name}'s Financial Health Evaluation
              </h2>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-fog)", display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} color="var(--accent-gold)" />
              Generated on {new Date(selectedAssessment.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          <InteractiveReport lead={selectedAssessment} audience="client" onOpenPdf={() => handleDownloadPdf(selectedAssessment)} />
        </div>

        {isPdfModalOpen && pdfLead && (
          <PdfViewer lead={pdfLead} onClose={() => setIsPdfModalOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="ff-client-dashboard-page" style={{ minHeight: "100vh", maxWidth: 1200, margin: "0 auto" }}>
      {/* 1. DASHBOARD HEADER / PROFILE WELCOME */}
      <div className="ff-client-profile-card">
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(201, 154, 75, 0.15) 0%, rgba(0, 0, 0, 0) 70%)",
            pointerEvents: "none"
          }}
        />

        <div className="ff-client-profile-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 18, position: "relative", zIndex: 1 }}>
          <div className="ff-client-profile-header-info" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              className="ff-client-avatar"
              style={{
                borderRadius: 16,
                background: "linear-gradient(135deg, var(--accent-gold) 0%, #A87930 100%)",
                color: "#07080C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                
                flexShrink: 0
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 className="ff-client-profile-title" style={{ fontWeight: 700, color: "var(--text-main)", margin: 0, fontFamily: "var(--font-serif)" }}>
                  Welcome, {user?.name || "Client"}
                </h1>
                <span
                  style={{
                    background: "rgba(95, 168, 160, 0.15)",
                    border: "1px solid rgba(95, 168, 160, 0.3)",
                    color: "var(--accent-teal)",
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontSize: 11.5,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <ShieldCheck size={12} /> Active Client Account
                </span>
              </div>

              <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 12.5, color: "var(--text-fog)", flexWrap: "wrap" }}>
                {user?.email && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Mail size={13} color="var(--accent-gold)" /> {user.email}
                  </span>
                )}
                {user?.mobile && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Phone size={13} color="var(--accent-gold)" /> {user.mobile}
                  </span>
                )}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Layers size={13} color="var(--accent-gold)" /> {userAssessments.length} Assessment{userAssessments.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "auto" }}>
            <button
              onClick={onStartNewAssessment}
              className="ff-btn-primary ff-client-cta-btn"
              style={{
                borderRadius: 12,
                fontWeight: 700,
                background: "var(--accent-gold)",
                color: "#07080C",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                
              }}
            >
              <PlusCircle size={16} /> Take New Assessment
            </button>
          </div>
        </div>
      </div>

      {/* 2. OVERVIEW SUMMARY CARDS */}
      {latestReport ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 20,
            marginBottom: 36
          }}
        >
          {/* Card 1: Health Score */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-medium)",
              borderRadius: 16,
              padding: "24px",
              boxShadow: "var(--shadow-layered)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-soft)" }}>Latest Financial Fitness</span>
              <Award size={20} color="var(--accent-gold)" />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                {latestReport.healthScore}
              </span>
              <span style={{ fontSize: 15, color: "var(--text-fog)", fontWeight: 600 }}>/ 100</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: latestReport.healthScore >= 70 ? "var(--accent-teal)" : "#F59E0B", fontWeight: 600 }}>
              ● {latestReport.healthScore >= 80 ? "Excellent Financial Posture" : latestReport.healthScore >= 60 ? "Moderate — Action Recommended" : "Attention Required"}
            </div>
          </div>

          {/* Card 2: Required Monthly Investment */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-medium)",
              borderRadius: 16,
              padding: "24px",
              boxShadow: "var(--shadow-layered)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-soft)" }}>Monthly Savings Required</span>
              <TrendingUp size={20} color="var(--accent-teal)" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
              {INR(latestReport.totalMonthly)}
            </div>
            <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--text-fog)" }}>
              Target across retirement & all personal goals
            </div>
          </div>

          {/* Card 3: Emergency Fund Status */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-medium)",
              borderRadius: 16,
              padding: "24px",
              boxShadow: "var(--shadow-layered)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-soft)" }}>6-Month Buffer Target</span>
              <ShieldCheck size={20} color="var(--accent-gold)" />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
              {INR_L(latestReport.emergency?.targetAmount || 0)}
            </div>
            <div style={{ marginTop: 10, fontSize: 12.5, color: latestReport.emergency?.isAdequate ? "var(--accent-teal)" : "#F87171", fontWeight: 600 }}>
              {latestReport.emergency?.isAdequate ? "✓ Current liquid savings adequate" : `⚠️ Gap: ${INR_L(latestReport.emergency?.gapAmount || 0)}`}
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. ASSESSMENTS HISTORY SECTION */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-medium)",
          borderRadius: 20,
          padding: "32px",
          boxShadow: "var(--shadow-layered)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-main)", margin: 0, fontFamily: "var(--font-serif)" }}>
              Your Assessment History
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-fog)", margin: "4px 0 0" }}>
              Every evaluation is preserved securely with instant PDF generation and diagnostic re-runs
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-fog)", background: "rgba(255, 255, 255, 0.05)", padding: "5px 12px", borderRadius: 8 }}>
              {userAssessments.length} Total Record{userAssessments.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {loadingAssessments ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-fog)" }}>
            <div className="ff-spinner" style={{ margin: "0 auto 16px" }} />
            <p>Retrieving your assessment history...</p>
          </div>
        ) : userAssessments.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: 16,
              border: "1px dashed var(--border-subtle)"
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(201, 154, 75, 0.12)",
                color: "var(--accent-gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <FileText size={28} />
            </div>
            <h4 style={{ fontSize: 18, color: "var(--text-main)", fontWeight: 600, marginBottom: 8 }}>
              No Assessments Found Yet
            </h4>
            <p style={{ color: "var(--text-fog)", fontSize: 14, maxWidth: 440, margin: "0 auto 24px" }}>
              Take your first 3-minute financial fitness diagnosis to evaluate your retirement readiness, goals timeline, and insurance coverage.
            </p>
            <button
              onClick={onStartNewAssessment}
              className="ff-btn-primary"
              style={{
                height: 44,
                padding: "0 26px",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                background: "var(--accent-gold)",
                color: "#07080C",
                display: "inline-flex",
                alignItems: "center",
                gap: 8
              }}
            >
              Start First Assessment <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {userAssessments.map((assessment, idx) => {
              const rep = computeReport(assessment);
              const isLatest = idx === 0;

              return (
                <div
                  key={assessment.id || assessment._id || idx}
                  onClick={() => handleViewReport(assessment)}
                  className={`ff-assessment-card-responsive ${isLatest ? "is-latest" : ""}`}
                >
                  {/* Top: Info & Delete button */}
                  <div className="ff-assessment-top-info">
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: isLatest ? "rgba(201, 154, 75, 0.2)" : "rgba(255, 255, 255, 0.06)",
                          color: isLatest ? "var(--accent-gold)" : "var(--text-soft)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}
                      >
                        <FileText size={20} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {assessment.name}'s Financial Health
                          </span>
                          {isLatest && (
                            <span
                              style={{
                                background: "rgba(201, 154, 75, 0.2)",
                                color: "var(--accent-gold)",
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 10,
                                textTransform: "uppercase"
                              }}
                            >
                              Latest
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-fog)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                          <Calendar size={12} />
                          {new Date(assessment.submittedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Delete button positioned cleanly on mobile */}
                    <button
                      onClick={(e) => handleDelete(assessment.id || assessment._id, e)}
                      className="ff-btn-ghost"
                      style={{
                        height: 34,
                        width: 34,
                        padding: 0,
                        borderRadius: 8,
                        color: "var(--text-fog)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                      title="Delete assessment"
                    >
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  </div>

                  {/* Financial Snapshot: 3-column compact metrics */}
                  <div className="ff-assessment-metrics-group">
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10.5, color: "var(--text-fog)", textTransform: "uppercase", fontWeight: 600 }}>Score</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: "var(--accent-gold)", fontFamily: "var(--font-mono)" }}>
                        {assessment.healthScore || rep?.healthScore || rep?.scores?.overallScore || 0}/100
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10.5, color: "var(--text-fog)", textTransform: "uppercase", fontWeight: 600 }}>Monthly Income</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
                        {INR_L(Number(assessment.income) || 0)}
                      </div>
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10.5, color: "var(--text-fog)", textTransform: "uppercase", fontWeight: 600 }}>Goals</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-soft)" }}>
                        {Array.isArray(assessment.goals) ? assessment.goals.length : 0} Goal{(assessment.goals?.length || 0) === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="ff-assessment-actions-group">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewReport(assessment);
                      }}
                      className="ff-btn-wizard-primary"
                      style={{ height: 36, padding: "0 14px", fontSize: 12, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 5 }}
                      title="View Report"
                    >
                      <Eye size={13} /> View Report
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPdf(assessment);
                      }}
                      className="ff-btn-wizard-ghost"
                      style={{ height: 36, padding: "0 10px", fontSize: 12, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4 }}
                      title="Download PDF"
                    >
                      <Download size={13} /> PDF
                    </button>

                    <button
                      onClick={(e) => handleClone(assessment, e)}
                      className="ff-btn-wizard-ghost"
                      style={{ height: 36, padding: "0 10px", fontSize: 12, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4 }}
                      title="Recalculate with these inputs"
                    >
                      <RefreshCw size={13} /> Retake
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isPdfModalOpen && pdfLead && (
        <PdfViewer lead={pdfLead} onClose={() => setIsPdfModalOpen(false)} />
      )}
    </div>
  );
}
