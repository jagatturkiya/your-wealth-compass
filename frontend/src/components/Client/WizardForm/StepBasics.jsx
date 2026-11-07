import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { COUNTRY_CONFIGS, getCountryConfig } from "../../../utils/countryData";

export default function StepBasics({ data, onChange, onNext }) {
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", mobile: "" });

  const currentCountry = getCountryConfig(data.countryCode || "+91");
  const storedRef = (typeof window !== "undefined")
    ? (localStorage.getItem("ff_referral_code") || sessionStorage.getItem("ff_referral_code") || "")
    : "";

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && onNext) {
      e.preventDefault();
      onNext();
    }
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (val.length > 40) {
      setFieldErrors((prev) => ({ ...prev, name: "Full name cannot exceed 40 characters." }));
      onChange("name", val.slice(0, 40));
    } else {
      if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
      onChange("name", val);
    }
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    if (val.length > 80) {
      setFieldErrors((prev) => ({ ...prev, email: "Email address cannot exceed 80 characters." }));
      onChange("email", val.slice(0, 80));
    } else {
      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
      onChange("email", val);
    }
  };

  const handleCountryChange = (e) => {
    const newCode = e.target.value;
    const newCountry = getCountryConfig(newCode);
    onChange("countryCode", newCode);

    // Trim mobile if it exceeds the new country's digit limit
    if (data.mobile && data.mobile.length > newCountry.digits) {
      onChange("mobile", data.mobile.slice(0, newCountry.digits));
    }
    if (fieldErrors.mobile) setFieldErrors((prev) => ({ ...prev, mobile: "" }));
  };

  const handleMobileChange = (e) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    if (rawDigits.length > currentCountry.digits) {
      setFieldErrors((prev) => ({
        ...prev,
        mobile: `Mobile number cannot exceed ${currentCountry.digits} digits for ${currentCountry.country}.`
      }));
      onChange("mobile", rawDigits.slice(0, currentCountry.digits));
    } else {
      if (fieldErrors.mobile) setFieldErrors((prev) => ({ ...prev, mobile: "" }));
      onChange("mobile", rawDigits);
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 26, fontWeight: 600, color: "var(--text-main)", fontFamily: "var(--font-sans)", letterSpacing: "-0.01em", margin: 0 }}>
          Let's start with your profile.
        </h2>
        {storedRef && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              background: "rgba(201, 154, 75, 0.12)",
              border: "1px solid rgba(201, 154, 75, 0.3)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--accent-gold)",
              fontWeight: 600,
              marginTop: 10
            }}
          >
            <span>🤝</span> Connected via Partner Advisor: <strong>{storedRef}</strong>
          </div>
        )}
      </div>

      {/* FULL NAME */}
      <div className="ff-input-group">
        <label className="ff-input-label-uppercase">Full Name</label>
        <input
          type="text"
          autoComplete="off"
          className={`ff-input-56px ${fieldErrors.name ? "has-error" : ""}`}
          placeholder="Enter your full name"
          maxLength={40}
          value={data.name || ""}
          onChange={handleNameChange}
        />
        {fieldErrors.name && (
          <div className="ff-field-error">
            <AlertCircle size={13} /> {fieldErrors.name}
          </div>
        )}
      </div>

      {/* EMAIL ADDRESS */}
      <div className="ff-input-group">
        <label className="ff-input-label-uppercase">Email Address</label>
        <input
          type="email"
          autoComplete="off"
          className={`ff-input-56px ${fieldErrors.email ? "has-error" : ""}`}
          placeholder="Enter your email address"
          maxLength={80}
          value={data.email || ""}
          onChange={handleEmailChange}
        />
        {fieldErrors.email && (
          <div className="ff-field-error">
            <AlertCircle size={13} /> {fieldErrors.email}
          </div>
        )}
      </div>

      {/* MOBILE NUMBER WITH DYNAMIC COUNTRY CODE & DIGIT LIMIT */}
      <div className="ff-input-group">
        <label className="ff-input-label-uppercase">Mobile Number</label>
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <select
            className="ff-country-select"
            value={data.countryCode || "+91"}
            onChange={handleCountryChange}
            aria-label="Select Country Code"
          >
            {COUNTRY_CONFIGS.map((c) => (
              <option key={c.code + c.country} value={c.code}>
                {c.flag} {c.code} ({c.country})
              </option>
            ))}
          </select>
          <input
            type="tel"
            autoComplete="off"
            className={`ff-input-56px ${fieldErrors.mobile ? "has-error" : ""}`}
            style={{ flex: 1 }}
            placeholder={currentCountry.placeholder}
            maxLength={currentCountry.digits}
            inputMode="numeric"
            pattern="[0-9]*"
            value={data.mobile || ""}
            onChange={handleMobileChange}
          />
        </div>
        {fieldErrors.mobile && (
          <div className="ff-field-error">
            <AlertCircle size={13} /> {fieldErrors.mobile}
          </div>
        )}
      </div>
    </div>
  );
}
