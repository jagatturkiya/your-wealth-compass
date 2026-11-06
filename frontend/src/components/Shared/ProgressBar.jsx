import React from "react";
import { Check, Clock } from "lucide-react";

export default function ProgressBar({ currentStep }) {
  const steps = [
    { id: 1, name: "Profile" },
    { id: 2, name: "Cashflow" },
    { id: 3, name: "Protection" },
    { id: 4, name: "Goals" },
    { id: 5, name: "Report" }
  ];

  const percentage = Math.min(100, Math.round((currentStep / 5) * 100));
  const timeRemainingMap = {
    1: "≈ 3 minutes remaining",
    2: "≈ 2 minutes remaining",
    3: "≈ 1.5 minutes remaining",
    4: "≈ 45 seconds remaining",
    5: "Diagnostic Ready"
  };

  return (
    <div style={{ width: "100%", marginBottom: 32 }}>
      {/* Horizontal Chip Stepper */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;

          return (
            <div
              key={step.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                background: isActive ? "rgba(201, 154, 75, 0.15)" : isCompleted ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${isActive ? "var(--accent-gold)" : isCompleted ? "var(--accent-emerald)" : "rgba(255, 255, 255, 0.08)"}`,
                color: isActive ? "var(--accent-gold)" : isCompleted ? "var(--accent-emerald)" : "var(--text-fog)",
                fontSize: 13,
                fontFamily: "var(--font-sans)",
                fontWeight: isActive || isCompleted ? 600 : 400,
                transition: "all 0.3s ease"
              }}
            >
              {isCompleted ? (
                <Check size={14} strokeWidth={2.5} />
              ) : isActive ? (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-gold)", display: "inline-block",  }} />
              ) : (
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--text-fog)", opacity: 0.4, display: "inline-block" }} />
              )}
              <span>{step.name}</span>
            </div>
          );
        })}
      </div>

      {/* Animated Vibrant Gold-Teal Gradient Progress Bar */}
      <div style={{ width: "100%", height: 6, borderRadius: 10, background: "rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            background: "linear-gradient(90deg, #C9962F 0%, #E5BD6B 50%, #5FA8A0 100%)",
            
            borderRadius: 10,
            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        />
      </div>
    </div>
  );
}
