import React, { useState, useEffect } from "react";
import HeaderNav from "./components/Shared/HeaderNav";
import LandingHero from "./components/Client/LandingHero";
import StepBasics from "./components/Client/WizardForm/StepBasics";
import StepFinancials from "./components/Client/WizardForm/StepFinancials";
import StepProtection from "./components/Client/WizardForm/StepProtection";
import StepGoals from "./components/Client/WizardForm/StepGoals";
import AssessmentsDrawer from "./components/Portal/AssessmentsDrawer";
import AdminPortal from "./components/Admin/AdminPortal";
import AuthModal from "./components/Auth/AuthModal";
import InteractiveReport from "./components/Client/InteractiveReport";
import PdfViewer from "./components/Client/PdfViewer";
import LegalModal from "./components/Shared/LegalModal";
import { AuthProvider, useAuth, AUTH_REQUIRED } from "./context/AuthContext";
import { AppProvider, useApp } from "./context/AppContext";
import { ChevronLeft, ChevronRight, ArrowRight, ShieldAlert, FileText } from "lucide-react";
import FormsPortal from "./components/Forms/FormsPortal";
import { computeReport } from "./utils/financialEngine";
import { getCountryConfig } from "./utils/countryData";

function MainContent() {
  const { user, portalMode, setPortalMode, openAuthModal } = useAuth();
  const { saveLeadSubmission, fetchUserAssessments } = useApp();

  const [activeTab, setActiveTab] = useState("landing"); // 'landing' | 'wizard' | 'admin' | 'forms'
  const [legalModalTab, setLegalModalTab] = useState(null); // null | 'privacy' | 'terms' | 'contact'
  const [isAssessmentsOpen, setIsAssessmentsOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [stepError, setStepError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("Evaluating Monthly Cashflow...");

  const [basics, setBasics] = useState({ name: "", email: "", countryCode: "+91", mobile: "" });
  const [financials, setFinancials] = useState({ age: "", income: "", incomeLakhs: "", expenses: "", savings: "" });
  const [protection, setProtection] = useState({ termInsurance: "", termAmount: "", healthInsurance: "", healthAmount: "", city: "", retirementAge: "" });
  const [goals, setGoals] = useState([]);

  const [submittedLead, setSubmittedLead] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pendingPrefillData, setPendingPrefillData] = useState(null);

  // Sync user details and fetch previous assessments if user is logged in
  useEffect(() => {
    if (user) {
      if (typeof fetchUserAssessments === "function") {
        fetchUserAssessments(user);
      }
      if (!basics.name && !basics.email) {
        const parts = (user.mobile || "").split(" ");
        const cCode = parts.length > 1 && parts[0].startsWith("+") ? parts[0] : "+91";
        const mob = parts.length > 1 ? parts.slice(1).join("") : user.mobile || "";

        setBasics((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
          countryCode: cCode,
          mobile: mob || prev.mobile
        }));
      }
    }
  }, [user]);

  // Route detection for admin portal and forms portal
  useEffect(() => {
    const evaluateRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const fullUrl = (path + search + hash).toLowerCase();

      // Client referral tracking: capture ?ref=... or ?advisor=... or ?partner=...
      try {
        const urlParams = new URLSearchParams(window.location.search);
        let refCode = urlParams.get("ref") || urlParams.get("advisor") || urlParams.get("partner") || "";
        if (!refCode && path.includes("/ref/")) {
          refCode = path.split("/ref/")[1].split("/")[0].split("?")[0];
        }
        if (refCode && refCode.trim()) {
          const cleanRef = refCode.trim().toLowerCase();
          localStorage.setItem("ff_referral_code", cleanRef);
          sessionStorage.setItem("ff_referral_code", cleanRef);
        }
      } catch (e) {}

      const isFormsAccess =
        fullUrl.includes("/forms") ||
        fullUrl.includes("/form") ||
        fullUrl.includes("forms=1") ||
        fullUrl.includes("form=1") ||
        fullUrl.includes("?forms") ||
        fullUrl.includes("?form") ||
        fullUrl.includes("#forms") ||
        fullUrl.includes("#form");

      if (isFormsAccess) {
        setActiveTab("forms");
        return;
      }

      const isAdmAccess =
        fullUrl.includes("/adm") ||
        fullUrl.includes("/admin") ||
        fullUrl.includes("/frm") ||
        fullUrl.includes("adm=1") ||
        fullUrl.includes("frm=1") ||
        fullUrl.includes("?adm") ||
        fullUrl.includes("?frm") ||
        fullUrl.includes("#adm") ||
        fullUrl.includes("#frm");

      if (isAdmAccess) {
        if (typeof setPortalMode === "function") setPortalMode("admin");
        setActiveTab("admin");
        return;
      }
    };

    evaluateRoute();
    window.addEventListener("hashchange", evaluateRoute);
    window.addEventListener("popstate", evaluateRoute);
    return () => {
      window.removeEventListener("hashchange", evaluateRoute);
      window.removeEventListener("popstate", evaluateRoute);
    };
  }, [setPortalMode]);

  const handleBasicsChange = (field, value) => {
    setStepError("");
    setBasics((prev) => ({ ...prev, [field]: value }));
  };
  const handleFinancialsChange = (field, value) => {
    setStepError("");
    setFinancials((prev) => ({ ...prev, [field]: value }));
  };
  const handleProtectionChange = (field, value) => {
    setStepError("");
    setProtection((prev) => ({ ...prev, [field]: value }));
  };

  const currentPayload = {
    userId: user?.id || "",
    name: basics.name ? basics.name.trim() : "",
    email: basics.email ? basics.email.trim() : "",
    mobile: basics.mobile ? `${basics.countryCode || "+91"} ${basics.mobile.replace(/\D/g, "")}` : "",
    age: financials.age || "",
    income: financials.income || "0",
    expenses: financials.expenses || "0",
    savings: financials.savings || "0",
    city: protection.city ? protection.city.trim() : "",
    retirementAge: protection.retirementAge || "60",
    termInsurance: protection.termInsurance || "no",
    termAmount: protection.termAmount || "0",
    healthInsurance: protection.healthInsurance || "no",
    healthAmount: protection.healthAmount || "0",
    protection: {
      termInsurance: protection.termInsurance === "yes",
      termAmount: protection.termAmount || "0",
      healthInsurance: protection.healthInsurance === "yes",
      healthAmount: protection.healthAmount || "0",
      city: protection.city ? protection.city.trim() : "",
      retirementAge: protection.retirementAge || "60"
    },
    goals: goals || []
  };

  const handleNextStep = () => {
    setStepError("");

    if (wizardStep === 1) {
      if (!basics.name || !basics.name.trim()) {
        setStepError("Please provide your full legal name.");
        return;
      }
      if (!basics.email || !basics.email.includes("@")) {
        setStepError("Please provide a valid email address.");
        return;
      }
      const cCode = basics.countryCode || "+91";
      const config = getCountryConfig(cCode);
      const digitsOnly = (basics.mobile || "").replace(/\D/g, "");
      if (!digitsOnly || digitsOnly.length !== config.digits) {
        setStepError(`Please enter a valid ${config.digits}-digit mobile number for ${config.country}.`);
        return;
      }
      setWizardStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (wizardStep === 2) {
      const ageNum = Number(financials.age);
      if (!financials.age || isNaN(ageNum) || ageNum < 18 || ageNum > 80) {
        setStepError("Please enter a valid age between 18 and 80.");
        return;
      }
      const incNum = Number(financials.income);
      if (!financials.income || isNaN(incNum) || incNum <= 0) {
        setStepError("Please enter your current monthly income in Lakhs (e.g. 0.3 for ₹30,000).");
        return;
      }
      const expNum = Number(financials.expenses);
      if (financials.expenses === "" || isNaN(expNum) || expNum < 0) {
        setStepError("Please enter your estimated monthly expenses.");
        return;
      }
      if (expNum > incNum) {
        setStepError(`Monthly living expenses (₹${expNum.toLocaleString("en-IN")}) cannot exceed your stated monthly income (₹${incNum.toLocaleString("en-IN")}).`);
        return;
      }
      const savNum = Number(financials.savings);
      if (financials.savings === "" || isNaN(savNum) || savNum < 0) {
        setStepError("Please enter your total liquid cash & savings buffer.");
        return;
      }
      setWizardStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (wizardStep === 3) {
      if (!protection.termInsurance) {
        setStepError("Please indicate whether you currently hold a Term Life Insurance policy.");
        return;
      }
      if (protection.termInsurance === "yes") {
        const termVal = Number(protection.termAmount);
        if (!protection.termAmount || isNaN(termVal) || termVal <= 0) {
          setStepError("Please enter your existing Term Life cover amount in Lakhs.");
          return;
        }
      }
      if (!protection.healthInsurance) {
        setStepError("Please indicate whether you have Health Insurance coverage.");
        return;
      }
      if (protection.healthInsurance === "yes") {
        const healthVal = Number(protection.healthAmount);
        if (!protection.healthAmount || isNaN(healthVal) || healthVal <= 0) {
          setStepError("Please enter your Health Insurance cover amount in Lakhs.");
          return;
        }
      }
      if (!protection.city || !protection.city.trim()) {
        setStepError("Please enter your current City of residence.");
        return;
      }
      setWizardStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (wizardStep === 4) {
      setIsProcessing(true);
      setProcessingStatus("Evaluating Monthly Cashflow & Surplus...");

      const t1 = setTimeout(() => setProcessingStatus("Computing Retirement Corpus & Inflation Trajectory..."), 450);
      const t2 = setTimeout(() => setProcessingStatus("Simulating Multi-Goal SIP Allocation Pathways..."), 900);
      const t3 = setTimeout(() => setProcessingStatus("Finalizing Precision Financial Health Score..."), 1350);

      setTimeout(async () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);

        const rep = computeReport(currentPayload);
        const payloadToSave = {
          ...currentPayload,
          healthScore: rep.healthScore,
          totalMonthlyRequired: rep.totalMonthly,
          emergencyGap: rep.emergency?.gapAmount || 0,
          submittedAt: new Date().toISOString()
        };

        const savedResult = await saveLeadSubmission(payloadToSave, user);
        if (savedResult) {
          setSubmittedLead(savedResult);
        } else {
          setSubmittedLead(payloadToSave);
        }
        if (user && typeof fetchUserAssessments === "function") {
          fetchUserAssessments(user);
        }

        setIsProcessing(false);
        setWizardStep(5);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 1800);
    }
  };

  const resetWizard = (prefillData = null) => {
    setWizardStep(1);
    setStepError("");
    setBasics({
      name: user?.name || "",
      email: user?.email || "",
      countryCode: "+91",
      mobile: user?.mobile ? user.mobile.replace(/\D/g, "") : ""
    });
    if (prefillData && typeof prefillData === "object") {
      const rawInc = prefillData.income || "";
      const numInc = Number(rawInc) || 0;
      const lakhsStr = numInc > 0 ? String(Number((numInc / 100000).toFixed(2))) : (prefillData.incomeLakhs || "");
      setFinancials({
        age: prefillData.age || "",
        income: rawInc,
        incomeLakhs: lakhsStr,
        expenses: prefillData.expenses || "",
        savings: prefillData.savings || ""
      });
    } else {
      setFinancials({ age: "", income: "", incomeLakhs: "", expenses: "", savings: "" });
    }
    setProtection({ termInsurance: "", termAmount: "", healthInsurance: "", healthAmount: "", city: "", retirementAge: "" });
    setGoals([]);
    setSubmittedLead(null);
    setActiveTab("wizard");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startAssessmentFlow = (prefillData = null) => {
    if (AUTH_REQUIRED && !user) {
      setPendingPrefillData(true);
      openAuthModal("signup");
      return;
    }

    resetWizard(prefillData);
  };

  const handleCloneAssessment = (assessment) => {
    if (assessment) {
      const parts = (assessment.mobile || "").split(" ");
      const cCode = parts.length > 1 && parts[0].startsWith("+") ? parts[0] : "+91";
      const mob = parts.length > 1 ? parts.slice(1).join("") : assessment.mobile || "";

      setBasics({
        name: assessment.name || "",
        email: assessment.email || "",
        countryCode: cCode,
        mobile: mob
      });
      const rawInc = assessment.income || "";
      const numInc = Number(rawInc) || 0;
      const lakhsStr = numInc > 0 ? String(Number((numInc / 100000).toFixed(2))) : "";
      setFinancials({
        age: assessment.age || "",
        income: rawInc,
        incomeLakhs: lakhsStr,
        expenses: assessment.expenses || "",
        savings: assessment.savings || ""
      });
      setProtection({
        termInsurance: assessment.protection?.termInsurance ? "yes" : "no",
        termAmount: assessment.protection?.termAmount || "",
        healthInsurance: assessment.protection?.healthInsurance ? "yes" : "no",
        healthAmount: assessment.protection?.healthAmount || "",
        city: assessment.city || assessment.protection?.city || "",
        retirementAge: assessment.retirementAge || assessment.protection?.retirementAge || ""
      });
      setGoals(Array.isArray(assessment.goals) ? assessment.goals : []);
      setSubmittedLead(null);
      setWizardStep(1);
      setActiveTab("wizard");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleViewReportFromDrawer = (assessment) => {
    setSubmittedLead(assessment);
    setActiveTab("wizard");
    setWizardStep(5);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // If Forms Portal Mode (/forms)
  if (activeTab === "forms") {
    return (
      <div className="ff-app-root">
        <FormsPortal
          onRedirectHome={() => {
            setActiveTab("landing");
            const cleanUrl = window.location.origin + (window.location.pathname.replace(/\/forms|\/form/gi, "") || "/");
            window.history.pushState({}, "", cleanUrl);
          }}
        />
      </div>
    );
  }

  // If Admin Portal Mode
  if (portalMode === "admin" || activeTab === "admin") {
    return (
      <div className="ff-app-root">
        <AdminPortal />
      </div>
    );
  }

  return (
    <div className="ff-app-root">
      {/* 1. TOP HEADER NAVIGATION (Clean, 2 CTAs) */}
      <HeaderNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetWizard={() => startAssessmentFlow()}
        onOpenAssessments={() => {
          if (user && typeof fetchUserAssessments === "function") {
            fetchUserAssessments(user);
          }
          setIsAssessmentsOpen(true);
        }}
      />

      {/* 2. LANDING VIEW */}
      {activeTab === "landing" && (
        <LandingHero
          onStart={(data) => startAssessmentFlow(data)}
          onOpenAdvisory={() => setLegalModalTab("contact")}
          onOpenLegal={(tab) => setLegalModalTab(tab)}
        />
      )}

      {/* 3. WIZARD EVALUATION FORM / REPORT VIEW */}
      {activeTab === "wizard" && (
        <div className="ff-wizard-wrapper" style={{ padding: "95px 4% 80px", maxWidth: wizardStep === 5 ? 1380 : 880, margin: "0 auto" }}>
          {/* Progress Indicator */}
          {wizardStep < 5 && (
            <div className="ff-wizard-progress-card" style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Step {wizardStep} of 4 &bull; {wizardStep === 1 ? "Identity & Contact" : wizardStep === 2 ? "Income & Cashflow" : wizardStep === 3 ? "Risk & Protection" : "Life Milestones"}
                </span>
                <span style={{ fontSize: 13, color: "var(--text-fog)", fontFamily: "var(--font-mono)" }}>
                  {wizardStep === 1 ? "25%" : wizardStep === 2 ? "50%" : wizardStep === 3 ? "75%" : "100%"}
                </span>
              </div>
              <div style={{ width: "100%", height: 6, backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${wizardStep * 25}%`,
                    height: "100%",
                    backgroundColor: "var(--accent-gold)",
                    transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                />
              </div>
            </div>
          )}

          {wizardStep < 5 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--text-fog)",
                fontSize: 13,
                marginBottom: 16,
                padding: "8px 14px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8
              }}
            >
              <span>Please provide accurate information to get an accurate financial report.</span>
            </div>
          )}

          {/* FORM CARD / FULL-SCREEN REPORT CONTAINER */}
          <div
            className={`ff-wizard-floating-card ${wizardStep === 5 ? "is-report-step" : ""}`}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-medium)",
              borderRadius: 20,
              boxShadow: "var(--shadow-layered)",
              width: "100%"
            }}
          >
            {isProcessing ? (
              <div className="ff-processing-wrap">
                <div className="ff-spinner"></div>
                <h3>
                  Analyzing Your Financial Profile...
                </h3>
                <p>
                  {processingStatus}
                </p>
              </div>
            ) : (
              <>
                {wizardStep < 5 ? (
                  <div>
                    {/* Step Form Inputs */}
                    {wizardStep === 1 && <StepBasics data={basics} onChange={handleBasicsChange} onNext={handleNextStep} />}
                    {wizardStep === 2 && <StepFinancials data={financials} onChange={handleFinancialsChange} onNext={handleNextStep} />}
                    {wizardStep === 3 && <StepProtection data={protection} onChange={handleProtectionChange} onNext={handleNextStep} />}
                    {wizardStep === 4 && <StepGoals goals={goals} setGoals={setGoals} onSubmit={handleNextStep} />}

                    {/* Action Bar */}
                    {stepError && (
                      <div style={{
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        color: "#F87171",
                        padding: "12px 18px",
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 600,
                        marginTop: 24,
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                      }}>
                        <ShieldAlert size={18} color="#F87171" style={{ flexShrink: 0 }} /> {stepError}
                      </div>
                    )}

                    <div className="ff-wizard-actions">
                      <button
                        className="ff-btn-wizard-ghost"
                        onClick={() => {
                          setStepError("");
                          if (wizardStep > 1) setWizardStep(wizardStep - 1);
                          else setActiveTab("landing");
                        }}
                      >
                        <ChevronLeft size={16} /> Back
                      </button>

                      {wizardStep < 4 ? (
                        <button
                          className="ff-btn-wizard-primary"
                          onClick={handleNextStep}
                        >
                          Continue <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          className="ff-btn-wizard-primary ff-btn-generate"
                          onClick={handleNextStep}
                        >
                          Generate Diagnostic Report <ArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* STEP 5: FULL-SCREEN FINAL REPORT OUTPUT */
                  <div style={{ padding: "10px 0", width: "100%" }}>
                    <InteractiveReport lead={submittedLead || currentPayload} audience="client" onOpenPdf={() => setIsPdfModalOpen(true)} />

                    <div className="ff-wizard-report-footer">
                      <button className="ff-btn-wizard-ghost" onClick={resetWizard}>
                        + Start New Assessment
                      </button>
                      {user && (
                        <button
                          className="ff-btn-wizard-ghost"
                          onClick={() => setIsAssessmentsOpen(true)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                        >
                          <FileText size={15} color="var(--accent-gold)" /> View Previous Assessments
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* PDF Modal */}
      {isPdfModalOpen && (
        <PdfViewer lead={submittedLead || currentPayload} onClose={() => setIsPdfModalOpen(false)} />
      )}

      {/* User Assessments Modal Drawer */}
      <AssessmentsDrawer
        isOpen={isAssessmentsOpen}
        onClose={() => setIsAssessmentsOpen(false)}
        onViewReport={handleViewReportFromDrawer}
        onStartNewAssessment={resetWizard}
        onCloneAssessment={handleCloneAssessment}
      />

      {/* Footer */}
      {activeTab !== "landing" && portalMode !== "admin" && (
        <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "32px 24px", textAlign: "center", fontSize: 13, color: "var(--text-fog)", backgroundColor: "#07080C" }}>
          <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-serif)", color: "var(--text-main)" }}>
              Your<span style={{ color: "var(--accent-gold)" }}>Wealth</span>Compass
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 13, color: "var(--text-fog)", margin: "2px 0", flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ cursor: "pointer", color: "var(--text-main)", fontWeight: 600 }} onClick={() => setLegalModalTab("privacy")}>Privacy Policy</span>
              <span>&bull;</span>
              <span style={{ cursor: "pointer", color: "var(--text-main)", fontWeight: 600 }} onClick={() => setLegalModalTab("terms")}>Terms of Service</span>
              <span>&bull;</span>
              <span style={{ cursor: "pointer", color: "var(--text-main)", fontWeight: 600 }} onClick={() => setLegalModalTab("contact")}>Contact / Advisory</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-fog)", marginTop: 2 }}>
              &copy; {new Date().getFullYear()} Your Wealth Compass. All rights reserved by <b>apkacoach.com</b>.
            </div>
          </div>
        </footer>
      )}

      {legalModalTab && (
        <LegalModal activeTab={legalModalTab} onClose={() => setLegalModalTab(null)} />
      )}

      {/* Authentication Modal - Only rendered when AUTH_REQUIRED is active */}
      {AUTH_REQUIRED && (
        <AuthModal
          onSuccess={(loggedUser) => {
            if (loggedUser) {
              fetchUserAssessments(loggedUser);

              const parts = (loggedUser.mobile || "").split(" ");
              const cCode = parts.length > 1 && parts[0].startsWith("+") ? parts[0] : "+91";
              const mob = parts.length > 1 ? parts.slice(1).join("") : loggedUser.mobile || "";

              setBasics({
                name: loggedUser.name || "",
                email: loggedUser.email || "",
                countryCode: cCode,
                mobile: mob.replace(/\D/g, "")
              });

              if (pendingPrefillData) {
                const prefill = typeof pendingPrefillData === "object" ? pendingPrefillData : null;
                if (prefill) {
                  setFinancials((prev) => ({
                    ...prev,
                    age: prefill.age || prev.age,
                    income: prefill.income || prev.income,
                    expenses: prefill.expenses || prev.expenses,
                    savings: prefill.savings || prev.savings
                  }));
                }
                setPendingPrefillData(null);
                setWizardStep(1);
                setActiveTab("wizard");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </AuthProvider>
  );
}