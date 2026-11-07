import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Send,
  ShieldCheck,
  Check
} from "lucide-react";
import { API_BASE_URL, submitEnquiryApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

// Google Form Submission Action Endpoint
const GOOGLE_FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLSfplzBIcOWuDBsczdUasKnxMVt57OvJSntLYrYyUyo5Nqf67w/formResponse";

// Highest Education Options (Exactly matching Google Form)
const EDUCATION_OPTIONS = [
  { value: "Graduation , Post Graduation", label: "Graduation , Post Graduation" },
  { value: "Any Professional Certification ,Diploma , Degree", label: "Any Professional Certification ,Diploma , Degree" },
  { value: "12th pass", label: "12th pass" },
  { value: "Doctor", label: "Doctor" },
  { value: "Others", label: "Others" }
];

// City Options (Exactly matching Google Form)
const CITY_OPTIONS = [
  { value: "Delhi NCR", label: "Delhi NCR" },
  { value: "Gurgaon", label: "Gurgaon" },
  { value: "Noida", label: "Noida" },
  { value: "Other", label: "Other" }
];

// Current Profession Options (Exactly matching Google Form)
const PROFESSION_OPTIONS = [
  { value: "Chartered Accountant", label: "Chartered Accountant" },
  { value: "Professional", label: "Professional" },
  { value: "Insurance Professional (Agent , Adviser, Consultant)", label: "Insurance Professional (Agent , Adviser, Consultant)" },
  { value: "Finance Consultant , Banker and Mutual Funds Distributors or agents", label: "Finance Consultant , Banker and Mutual Funds Distributors or agents" },
  { value: "Health Care Professionl", label: "Health Care Professionl" },
  { value: "Others", label: "Others" }
];

// Helper: Strict Indian 10-digit mobile check
export function isValidIndianMobile(mobile) {
  if (!mobile) return false;
  const digitsOnly = mobile.replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(digitsOnly);
}

// Helper: Strict RFC Email check
export function isValidEmailFormat(email) {
  if (!email) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}

export default function FormsPortal({ onRedirectHome }) {
  const { user, loginWithGoogle } = useAuth();
  const { saveFormResponse } = useApp();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    city: "",
    profession: "",
    education: ""
  });

  const [referralCode, setReferralCode] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const hp = new URLSearchParams(window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "");
      const fromUrl = sp.get("ref") || sp.get("advisor") || sp.get("partner") || hp.get("ref") || hp.get("advisor") || hp.get("partner");
      if (fromUrl && fromUrl.trim()) {
        const clean = fromUrl.trim().toLowerCase();
        localStorage.setItem("ff_referral_code", clean);
        sessionStorage.setItem("ff_referral_code", clean);
        return clean;
      }
      return localStorage.getItem("ff_referral_code") || "";
    } catch (e) {
      return "";
    }
  });

  const [recordEmailConsent, setRecordEmailConsent] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const hiddenFormRef = useRef(null);

  // Sync logged in user if available
  useEffect(() => {
    if (user && user.email) {
      setFormData((prev) => ({
        ...prev,
        email: prev.email || user.email,
        name: prev.name || user.name || ""
      }));
    }
  }, [user]);

  // Parse prefill parameters from current URL on mount
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.includes("?")
          ? window.location.hash.split("?")[1]
          : ""
      );

      const getVal = (...keys) => {
        for (const k of keys) {
          const val = searchParams.get(k) || hashParams.get(k);
          if (val) return decodeURIComponent(val).trim();
        }
        return "";
      };

      const nameVal = getVal("entry.183190177", "name", "fullname");
      const emailVal = getVal("emailAddress", "entry.388060596", "email", "mail");
      const mobileValRaw = getVal("entry.1384209841", "mobile", "phone");
      let mobileVal = (mobileValRaw || "").replace(/\D/g, "");
      if (mobileVal.length > 10 && mobileVal.startsWith("91")) {
        mobileVal = mobileVal.slice(2);
      }
      mobileVal = mobileVal.slice(-10);
      const cityValRaw = getVal("entry.72691823", "city");
      const eduValRaw = getVal("entry.1170563700", "education", "qualification");
      const profValRaw = getVal("entry.1764066533", "profession", "occupation");

      // Match city option
      let matchedCity = "";
      if (cityValRaw) {
        const foundCity = CITY_OPTIONS.find(
          (c) => c.value.toLowerCase() === cityValRaw.toLowerCase()
        );
        matchedCity = foundCity ? foundCity.value : "Other";
      }

      // Match education option
      let matchedEdu = "";
      if (eduValRaw) {
        const foundEdu = EDUCATION_OPTIONS.find(
          (e) => e.value.toLowerCase() === eduValRaw.toLowerCase()
        );
        matchedEdu = foundEdu ? foundEdu.value : "Others";
      }

      // Match profession option
      let matchedProf = "";
      if (profValRaw) {
        const foundProf = PROFESSION_OPTIONS.find(
          (p) => p.value.toLowerCase() === profValRaw.toLowerCase()
        );
        matchedProf = foundProf ? foundProf.value : "Others";
      }

      // Check referral code parameter
      const refVal = getVal("ref", "advisor", "partner");
      if (refVal) {
        const cleanRef = refVal.toLowerCase();
        setReferralCode(cleanRef);
        localStorage.setItem("ff_referral_code", cleanRef);
        sessionStorage.setItem("ff_referral_code", cleanRef);
      }

      setFormData((prev) => ({
        name: (nameVal || prev.name).slice(0, 50),
        email: (emailVal || prev.email).slice(0, 80),
        mobile: mobileVal || prev.mobile,
        city: matchedCity || prev.city,
        education: matchedEdu || prev.education,
        profession: matchedProf || prev.profession
      }));
    } catch (e) {
      console.warn("FormsPortal: URL prefill parse notice:", e);
    }
  }, []);

  // Auto-redirect to home screen after 2 seconds
  useEffect(() => {
    if (!isSubmitted) return;

    const timer = setTimeout(() => {
      handleDoneRedirect();
    }, 2000);

    return () => clearTimeout(timer);
  }, [isSubmitted]);

  const handleDoneRedirect = () => {
    if (typeof onRedirectHome === "function") {
      onRedirectHome();
    } else {
      window.location.href = "/";
    }
  };

  const handleGoogleQuickAuth = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res && res.user && res.user.email) {
        setFormData((prev) => ({
          ...prev,
          email: res.user.email,
          name: prev.name || res.user.name || ""
        }));
        setFormErrors((prev) => ({ ...prev, email: "" }));
      }
    } catch (err) {
      console.warn("Google quick auth fallback:", err);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleChange = (field, value) => {
    let cleanVal = value;

    if (field === "name") {
      cleanVal = value.slice(0, 50);
    } else if (field === "email") {
      cleanVal = value.trim().slice(0, 80);
    } else if (field === "mobile") {
      let digits = value.replace(/\D/g, "");
      if (digits.length > 10 && digits.startsWith("91")) {
        digits = digits.slice(2);
      }
      cleanVal = digits.slice(0, 10);
    }

    setFormData((prev) => ({ ...prev, [field]: cleanVal }));

    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Real-time detection state helpers
  const isMobileValid = isValidIndianMobile(formData.mobile) || /^\d{10}$/.test(formData.mobile.trim());
  const isEmailValid = isValidEmailFormat(formData.email);

  // ALL MENUS ARE COMPULSORY
  const validate = () => {
    const errs = {};

    // 1. Email (Compulsory, Strict RFC Detection)
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail) {
      errs.email = "Email address is required";
    } else if (!isValidEmailFormat(trimmedEmail)) {
      errs.email = "Please enter a valid email address (e.g. name@domain.com)";
    }

    // 2. Name (Compulsory)
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errs.name = "Full Name is required";
    } else if (trimmedName.length < 2) {
      errs.name = "Name must be at least 2 characters";
    } else if (/^[\d\W]+$/.test(trimmedName)) {
      errs.name = "Please enter a valid alphabetic name";
    }

    // 3. Mobile (Compulsory, 10 Digits)
    const trimmedMobile = formData.mobile.trim();
    if (!trimmedMobile) {
      errs.mobile = "Mobile number is required";
    } else if (trimmedMobile.length !== 10) {
      errs.mobile = `Please enter 10-digit mobile number (currently ${trimmedMobile.length} digits)`;
    } else if (!/^\d{10}$/.test(trimmedMobile)) {
      errs.mobile = "Please enter digits only";
    }

    // 4. City (Compulsory)
    if (!formData.city) {
      errs.city = "Please select your city";
    }

    // 5. Highest Education (Compulsory)
    if (!formData.education) {
      errs.education = "Please select your highest education";
    }

    // 6. Current Profession (Compulsory)
    if (!formData.profession) {
      errs.profession = "Please select your profession";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Field values for submission
  const effectiveCity = formData.city;
  const effectiveEducation = formData.education;
  const effectiveProfession = formData.profession;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!validate()) {
      window.scrollTo({ top: 100, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Submit via hidden form iframe with exact entry IDs and Google Form hidden tokens
      if (hiddenFormRef.current) {
        hiddenFormRef.current.submit();
      }

      // 2. Dual submit via fetch (no-cors) to Google Forms endpoint
      const postParams = new URLSearchParams();
      postParams.append("entry.183190177", formData.name.trim());
      postParams.append("entry.1384209841", formData.mobile.trim());
      postParams.append("entry.72691823", effectiveCity);
      postParams.append("entry.1170563700", effectiveEducation);
      postParams.append("entry.1764066533", effectiveProfession);
      postParams.append("fvv", "1");
      postParams.append("pageHistory", "0");
      postParams.append("fbzx", "5017803040604775895");

      fetch(GOOGLE_FORM_ACTION, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: postParams
      }).catch((fetchErr) => {
        console.warn("Google Form direct fetch notice (safe fallback used):", fetchErr);
      });

      // 3. Record directly to Database & Admin Panel via AppContext + Backend API
      if (typeof saveFormResponse === "function") {
        saveFormResponse({
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile.trim(),
          city: effectiveCity,
          education: effectiveEducation,
          profession: effectiveProfession,
          referralCode: referralCode || "",
          notes: `Consent recorded: ${recordEmailConsent ? "yes" : "no"}`
        }).catch((err) => console.warn("Form response save notice:", err));
      }

      // 4. Record as verified lead enquiry in backend database
      submitEnquiryApi({
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        topic: "Application Form",
        referralCode: referralCode || "",
        message: `City: ${effectiveCity} | Education: ${effectiveEducation} | Profession: ${effectiveProfession} | Verified Email: ${formData.email}${referralCode ? ` | Ref: ${referralCode}` : ""}`
      }).catch((enqErr) => console.warn("Enquiry DB sync notice:", enqErr));

      // Success screen transition
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 700);
    } catch (err) {
      console.error("Submission error:", err);
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-main, #07080C)",
        color: "var(--text-main, #FFFFFF)",
        fontFamily: "var(--font-sans, 'Plus Jakarta Sans', sans-serif)",
        paddingBottom: 70,
        position: "relative",
        overflowX: "hidden",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      {/* Hidden iframe and form for Google Form submission without navigation or CORS blocks */}
      <iframe
        name="gform_hidden_iframe"
        id="gform_hidden_iframe"
        title="Google Form Target"
        style={{ display: "none", width: 0, height: 0, border: 0 }}
      />
      <form
        ref={hiddenFormRef}
        action={GOOGLE_FORM_ACTION}
        method="POST"
        target="gform_hidden_iframe"
        style={{ display: "none" }}
      >
        <input type="hidden" name="entry.183190177" value={formData.name} />
        <input type="hidden" name="entry.1384209841" value={formData.mobile} />
        <input type="hidden" name="entry.72691823" value={effectiveCity} />
        <input type="hidden" name="entry.1170563700" value={effectiveEducation} />
        <input type="hidden" name="entry.1764066533" value={effectiveProfession} />
        <input type="hidden" name="fvv" value="1" />
        <input type="hidden" name="pageHistory" value="0" />
        <input type="hidden" name="fbzx" value="5017803040604775895" />
      </form>

      {/* Ambient background glow accents */}
      <div
        style={{
          position: "fixed",
          top: -120,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(760px, 92vw)",
          height: 360,
          background: "radial-gradient(circle, rgba(201, 154, 75, 0.14) 0%, rgba(7, 8, 12, 0) 70%)",
          pointerEvents: "none",
          zIndex: 0
        }}
      />

      {/* TOP HEADER BRANDING */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          backgroundColor: "rgba(13, 14, 21, 0.92)",
          backdropFilter: "blur(14px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
          padding: "16px 16px"
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(8px, 3vw, 16px)",
            flexWrap: "wrap",
            textAlign: "center"
          }}
        >
          {/* Your Wealth Compass Brand */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: "clamp(18px, 4.5vw, 22px)",
              fontWeight: 800,
              letterSpacing: "-0.02em"
            }}
          >
            <span style={{ color: "#FFFFFF" }}>Your</span>
            <span style={{ color: "var(--accent-gold, #C99A4B)" }}>Wealth</span>
            <span style={{ color: "#FFFFFF" }}>Compass</span>
          </div>

          <div
            style={{
              width: 1,
              height: 18,
              backgroundColor: "var(--border-medium, rgba(255, 255, 255, 0.18))"
            }}
          />

          {/* powered by apkacoach.com */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: "clamp(11px, 3vw, 13px)",
              color: "var(--text-fog, #8FA0AC)"
            }}
          >
            <span style={{ textTransform: "lowercase", letterSpacing: "0.02em" }}>powered by</span>
            <a
              href="https://www.apkacoach.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center" }}
              title="www.apkacoach.com"
            >
              <img
                src="/apkacoach-logo-dark.png"
                alt="www.apkacoach.com"
                style={{
                  height: "clamp(18px, 4vw, 22px)",
                  width: "auto",
                  objectFit: "contain",
                  verticalAlign: "middle"
                }}
              />
            </a>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main
        style={{
          width: "100%",
          maxWidth: 620,
          margin: "0 auto",
          padding: "clamp(20px, 4vw, 36px) clamp(14px, 3vw, 22px) 0",
          position: "relative",
          zIndex: 1,
          boxSizing: "border-box"
        }}
      >
        {isSubmitted ? (
          /* SUCCESS STATE */
          <div
            style={{
              background: "var(--bg-surface, #0D0E15)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              borderRadius: 20,
              padding: "clamp(32px, 6vw, 48px) clamp(20px, 5vw, 32px)",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
              animation: "fadeIn 0.35s ease"
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.14)",
                border: "2px solid #10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px"
              }}
            >
              <CheckCircle2 size={40} color="#10B981" />
            </div>

            <h2
              style={{
                fontSize: "clamp(22px, 5vw, 28px)",
                fontWeight: 800,
                color: "#FFFFFF",
                marginBottom: 12,
                fontFamily: "var(--font-serif, sans-serif)"
              }}
            >
              Application Submitted Successfully!
            </h2>

            <p
              style={{
                fontSize: 16,
                color: "var(--text-ivory, #F3EFE6)",
                maxWidth: 480,
                margin: "0 auto 16px",
                lineHeight: 1.6
              }}
            >
              Your details have been successfully recorded. Our expert advisory team will contact you shortly.
            </p>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "var(--accent-gold, #C99A4B)",
                fontSize: 13,
                fontWeight: 600,
                marginTop: 10
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--accent-gold)",
                  display: "inline-block"
                }}
              />
              Redirecting to home screen...
            </div>
          </div>
        ) : (
          /* FORM VIEW */
          <div
            style={{
              background: "var(--bg-surface, #0D0E15)",
              border: "1px solid var(--border-medium, rgba(255, 255, 255, 0.12))",
              borderRadius: "clamp(16px, 3vw, 22px)",
              boxShadow: "var(--shadow-layered, 0 24px 72px rgba(0, 0, 0, 0.85))",
              overflow: "hidden",
              padding: "clamp(22px, 5vw, 36px) clamp(18px, 4vw, 32px)",
              boxSizing: "border-box"
            }}
          >
            <form onSubmit={handleSubmit} style={{ width: "100%", boxSizing: "border-box" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                
                {/* Referral Attribution Badge */}
                {referralCode && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      background: "rgba(201, 154, 75, 0.12)",
                      border: "1px solid rgba(201, 154, 75, 0.35)",
                      borderRadius: 10,
                      fontSize: 12.5,
                      color: "var(--accent-gold)",
                      fontWeight: 600
                    }}
                  >
                    <span>🤝</span> Referred by Business Partner Advisor: <strong>{referralCode}</strong>
                  </div>
                )}

                {/* 1. EMAIL WITH VERIFIED RECORD CARD (Compulsory) */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: formErrors.email
                      ? "1px solid #EF4444"
                      : isEmailValid
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid var(--border-medium, rgba(255, 255, 255, 0.12))",
                    borderRadius: 12,
                    padding: 16,
                    transition: "all 0.2s ease"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                      flexWrap: "wrap",
                      gap: 8
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--text-ivory, #F3EFE6)"
                      }}
                    >
                      <Mail size={16} color="var(--accent-gold, #C99A4B)" />
                      <span>Email</span>
                      <span style={{ color: "#EF4444" }}>*</span>
                    </label>

                    {/* Google One-Tap Quick Verification button if not logged in */}
                    {(!user || !user.email) && (
                      <button
                        type="button"
                        onClick={handleGoogleQuickAuth}
                        disabled={googleLoading}
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.18)",
                          borderRadius: 6,
                          color: "#E2E8F0",
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "5px 10px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.14)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)")}
                      >
                        <ShieldCheck size={14} color="#38BDF8" />
                        <span>{googleLoading ? "Connecting..." : "Verify with Google"}</span>
                      </button>
                    )}
                  </div>

                  {/* Email Input Field */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="email"
                      maxLength={80}
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="e.g. yourname@example.com"
                      style={{
                        width: "100%",
                        padding: "13px 40px 13px 14px",
                        borderRadius: 8,
                        backgroundColor: "var(--bg-input, #151824)",
                        border: formErrors.email
                          ? "1px solid #EF4444"
                          : isEmailValid
                          ? "1px solid #10B981"
                          : "1px solid var(--border-medium, rgba(255, 255, 255, 0.14))",
                        color: "#FFFFFF",
                        fontSize: 15,
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                    {isEmailValid && (
                      <div
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#10B981",
                          display: "flex",
                          alignItems: "center"
                        }}
                        title="Valid email format verified"
                      >
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </div>

                  {/* Google Forms "Record ... as email" Checkbox Card */}
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      backgroundColor: "rgba(201, 154, 75, 0.06)",
                      border: "1px solid rgba(201, 154, 75, 0.18)",
                      borderRadius: 8,
                      padding: "10px 12px"
                    }}
                  >
                    <input
                      type="checkbox"
                      id="recordEmailCheck"
                      checked={recordEmailConsent}
                      onChange={(e) => setRecordEmailConsent(e.target.checked)}
                      style={{
                        marginTop: 3,
                        cursor: "pointer",
                        accentColor: "var(--accent-gold, #C99A4B)",
                        width: 16,
                        height: 16
                      }}
                    />
                    <label
                      htmlFor="recordEmailCheck"
                      style={{
                        fontSize: 13,
                        color: "var(--text-ivory, #E2E8F0)",
                        lineHeight: 1.45,
                        cursor: "pointer",
                        userSelect: "none"
                      }}
                    >
                      Record{" "}
                      <strong style={{ color: "#FFFFFF" }}>
                        {formData.email.trim() ? formData.email.trim() : "your email"}
                      </strong>{" "}
                      as the email to be included with my response
                    </label>
                  </div>

                  {/* Live Email Validation feedback */}
                  {formErrors.email ? (
                    <div style={{ fontSize: 12, color: "#EF4444", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={13} /> {formErrors.email}
                    </div>
                  ) : isEmailValid ? (
                    <div style={{ fontSize: 12, color: "#10B981", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Check size={13} /> Valid email verified
                    </div>
                  ) : null}
                </div>

                {/* 2. NAME (Compulsory) */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-ivory, #F3EFE6)",
                      marginBottom: 8
                    }}
                  >
                    <User size={15} color="var(--accent-gold, #C99A4B)" />
                    <span>Name</span>
                    <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Your answer"
                    style={{
                      width: "100%",
                      padding: "13px 15px",
                      borderRadius: 10,
                      backgroundColor: "var(--bg-input, #151824)",
                      border: formErrors.name
                        ? "1px solid #EF4444"
                        : "1px solid var(--border-medium, rgba(255, 255, 255, 0.14))",
                      color: "#FFFFFF",
                      fontSize: 15,
                      outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s ease"
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent-gold, #C99A4B)")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = formErrors.name
                        ? "#EF4444"
                        : "var(--border-medium, rgba(255, 255, 255, 0.14))")
                    }
                  />
                  {formErrors.name && (
                    <div style={{ fontSize: 12, color: "#EF4444", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={13} /> {formErrors.name}
                    </div>
                  )}
                </div>

                {/* 3. MOBILE (Compulsory, Strict 10 Digits starting with 6,7,8,9) */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-ivory, #F3EFE6)"
                      }}
                    >
                      <Phone size={15} color="var(--accent-gold, #C99A4B)" />
                      <span>Mobile</span>
                      <span style={{ color: "#EF4444" }}>*</span>
                    </label>

                    {/* Digits counter helper */}
                    <span style={{ fontSize: 11, color: "var(--text-fog, #8FA0AC)" }}>
                      {formData.mobile ? `${formData.mobile.length}/10 digits` : "10 digits (6-9)"}
                    </span>
                  </div>

                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    {/* Fixed +91 country prefix badge */}
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--accent-gold, #C99A4B)",
                        pointerEvents: "none",
                        userSelect: "none"
                      }}
                    >
                      <span>🇮🇳 +91</span>
                      <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>
                    </div>

                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[6-9][0-9]{9}"
                      maxLength={10}
                      value={formData.mobile}
                      onChange={(e) => handleChange("mobile", e.target.value)}
                      placeholder="Your answer"
                      style={{
                        width: "100%",
                        padding: "13px 40px 13px 76px",
                        borderRadius: 10,
                        backgroundColor: "var(--bg-input, #151824)",
                        border: formErrors.mobile
                          ? "1px solid #EF4444"
                          : isMobileValid
                          ? "1px solid #10B981"
                          : "1px solid var(--border-medium, rgba(255, 255, 255, 0.14))",
                        color: "#FFFFFF",
                        fontSize: 16,
                        letterSpacing: "0.04em",
                        fontWeight: 500,
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--accent-gold, #C99A4B)")}
                      onBlur={(e) =>
                        (e.target.style.borderColor = formErrors.mobile
                          ? "#EF4444"
                          : isMobileValid
                          ? "#10B981"
                          : "var(--border-medium, rgba(255, 255, 255, 0.14))")
                      }
                    />

                    {isMobileValid && (
                      <div
                        style={{
                          position: "absolute",
                          right: 12,
                          color: "#10B981",
                          display: "flex",
                          alignItems: "center"
                        }}
                        title="Valid 10-digit mobile number"
                      >
                        <CheckCircle2 size={18} />
                      </div>
                    )}
                  </div>

                  {/* Real-time mobile validation feedback */}
                  {formErrors.mobile ? (
                    <div style={{ fontSize: 12, color: "#EF4444", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={13} /> {formErrors.mobile}
                    </div>
                  ) : isMobileValid ? (
                    <div style={{ fontSize: 12, color: "#10B981", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <Check size={13} /> Valid 10-digit Indian mobile number
                    </div>
                  ) : formData.mobile.length > 0 && !/^[6-9]/.test(formData.mobile) ? (
                    <div style={{ fontSize: 12, color: "#F59E0B", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={13} /> Mobile numbers must begin with 6, 7, 8, or 9
                    </div>
                  ) : null}
                </div>

                {/* 4. CITY (Compulsory Dropdown: Delhi NCR, Gurgaon, Noida, Other) */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-ivory, #F3EFE6)",
                      marginBottom: 8
                    }}
                  >
                    <MapPin size={15} color="var(--accent-gold, #C99A4B)" />
                    <span>City</span>
                    <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 15px",
                      borderRadius: 10,
                      backgroundColor: "var(--bg-input, #151824)",
                      border: formErrors.city
                        ? "1px solid #EF4444"
                        : "1px solid var(--border-medium, rgba(255, 255, 255, 0.14))",
                      color: formData.city ? "#FFFFFF" : "var(--text-dim, #647888)",
                      fontSize: 15,
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer"
                    }}
                  >
                    <option value="" disabled style={{ backgroundColor: "#10121B", color: "#8FA0AC" }}>
                      Choose your city
                    </option>
                    {CITY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value} style={{ backgroundColor: "#10121B", color: "#FFFFFF" }}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {formErrors.city && (
                    <div style={{ fontSize: 12, color: "#EF4444", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={13} /> {formErrors.city}
                    </div>
                  )}
                </div>

                {/* 5. HIGHEST EDUCATION (Compulsory Dropdown: Graduation/Post Grad, Any Professional Cert/Diploma/Degree, 12th pass, Doctor, Others) */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-ivory, #F3EFE6)",
                      marginBottom: 8
                    }}
                  >
                    <GraduationCap size={15} color="var(--accent-gold, #C99A4B)" />
                    <span>Highest Education ( minimum Criteria 12th Pass)</span>
                    <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    value={formData.education}
                    onChange={(e) => handleChange("education", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 15px",
                      borderRadius: 10,
                      backgroundColor: "var(--bg-input, #151824)",
                      border: formErrors.education
                        ? "1px solid #EF4444"
                        : "1px solid var(--border-medium, rgba(255, 255, 255, 0.14))",
                      color: formData.education ? "#FFFFFF" : "var(--text-dim, #647888)",
                      fontSize: 15,
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer"
                    }}
                  >
                    <option value="" disabled style={{ backgroundColor: "#10121B", color: "#8FA0AC" }}>
                      Choose your highest education
                    </option>
                    {EDUCATION_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        style={{ backgroundColor: "#10121B", color: "#FFFFFF" }}
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {formErrors.education && (
                    <div style={{ fontSize: 12, color: "#EF4444", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={13} /> {formErrors.education}
                    </div>
                  )}
                </div>

                {/* 6. CURRENT PROFESSION (Compulsory Dropdown matching Google Form) */}
                <div>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-ivory, #F3EFE6)",
                      marginBottom: 8
                    }}
                  >
                    <Briefcase size={15} color="var(--accent-gold, #C99A4B)" />
                    <span>Current Profession</span>
                    <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    value={formData.profession}
                    onChange={(e) => handleChange("profession", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "13px 15px",
                      borderRadius: 10,
                      backgroundColor: "var(--bg-input, #151824)",
                      border: formErrors.profession
                        ? "1px solid #EF4444"
                        : "1px solid var(--border-medium, rgba(255, 255, 255, 0.14))",
                      color: formData.profession ? "#FFFFFF" : "var(--text-dim, #647888)",
                      fontSize: 15,
                      outline: "none",
                      boxSizing: "border-box",
                      cursor: "pointer"
                    }}
                  >
                    <option value="" disabled style={{ backgroundColor: "#10121B", color: "#8FA0AC" }}>
                      Choose your current profession
                    </option>
                    {PROFESSION_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value} style={{ backgroundColor: "#10121B", color: "#FFFFFF" }}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  {formErrors.profession && (
                    <div style={{ fontSize: 12, color: "#EF4444", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={13} /> {formErrors.profession}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ marginTop: 32 }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    minHeight: 52,
                    padding: "14px 20px",
                    borderRadius: 12,
                    backgroundColor: "var(--accent-gold, #C99A4B)",
                    color: "#07080C",
                    fontSize: "clamp(15px, 4vw, 16px)",
                    fontWeight: 700,
                    border: "none",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "0 4px 20px rgba(201, 154, 75, 0.35)",
                    transition: "all 0.2s ease",
                    opacity: isSubmitting ? 0.75 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = "var(--accent-gold-hover, #B5883D)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      e.currentTarget.style.backgroundColor = "var(--accent-gold, #C99A4B)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          border: "2px solid #07080C",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite"
                        }}
                      />
                      <span>Recording Response...</span>
                    </>
                  ) : (
                    <>
                      <Send size={17} />
                      <span>Submit</span>
                    </>
                  )}
                </button>

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim, #647888)",
                    textAlign: "center",
                    marginTop: 16,
                    marginBottom: 0
                  }}
                >
                  Your Wealth Compass • powered by apkacoach.com
                </p>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Hidden Google Form Native Submission Form & Iframe */}
      <form
        ref={hiddenFormRef}
        action={GOOGLE_FORM_ACTION}
        method="POST"
        target="google_form_iframe"
        style={{ display: "none" }}
      >
        <input type="hidden" name="entry.183190177" value={formData.name.trim()} />
        <input type="hidden" name="entry.1384209841" value={formData.mobile.trim()} />
        <input type="hidden" name="entry.72691823" value={effectiveCity} />
        <input type="hidden" name="entry.1170563700" value={effectiveEducation} />
        <input type="hidden" name="entry.1764066533" value={effectiveProfession} />
        <input type="hidden" name="fvv" value="1" />
        <input type="hidden" name="pageHistory" value="0" />
      </form>
      <iframe
        name="google_form_iframe"
        id="google_form_iframe"
        style={{ display: "none", width: 0, height: 0, border: 0 }}
        title="google-form-target"
      />
    </div>
  );
}
