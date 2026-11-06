import React, { useState } from "react";
import {
  ArrowRight, Shield, Activity, TrendingUp, Check,
  Plane, Home, GraduationCap, Heart, PiggyBank,
  Lock, Award, BarChart3, Layers, Clock, ShieldCheck, ChevronRight, AlertTriangle,
  CheckCircle2, Sparkles, User
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import InteractivePreviewSimulator from "./InteractivePreviewSimulator";
import LiveSocialProofToast from "./LiveSocialProofToast";

export default function LandingHero({ onStart, onStartWizard, onOpenLegal, onOpenAdvisory }) {
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [hoveredGoalIndex, setHoveredGoalIndex] = useState(null);

  // Inflation Escalation Engine State
  const [selectedGoalType, setSelectedGoalType] = useState("education");
  const [baseCost, setBaseCost] = useState(1000000); // Default ₹10 Lakhs

  const scrollToAssessment = (prefillData) => {
    if (onStart) {
      onStart(prefillData);
    } else if (onStartWizard) {
      onStartWizard(prefillData);
    } else {
      const el = document.getElementById("assessment-form");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const goalsList = [
    { label: "Today", icon: User },
    { label: "Dream House", icon: Home },
    { label: "Child's Education", icon: GraduationCap },
    { label: "Child's Marriage", icon: Heart },
    { label: "Retirement", icon: PiggyBank }
  ];

  const inflationCategories = [
    { id: "education", label: "Child's Education", rate: 8, icon: GraduationCap },
    { id: "marriage", label: "Child's Marriage", rate: 7, icon: Heart },
    { id: "house", label: "Dream House", rate: 7, icon: Home },
    { id: "retirement", label: "Retirement Corpus", rate: 6.5, icon: PiggyBank }
  ];

  const currentCategory = inflationCategories.find((c) => c.id === selectedGoalType) || inflationCategories[0];

  // Calculate compounding escalation points
  const yearsList = [0, 5, 10, 15, 20];
  const escalationData = yearsList.map((y) => {
    const fv = baseCost * Math.pow(1 + currentCategory.rate / 100, y);
    const increasePct = y === 0 ? 0 : Math.round(((fv - baseCost) / baseCost) * 100);
    return {
      yearLabel: y === 0 ? "Today" : `In ${y} Yrs`,
      years: y,
      futureCost: Math.round(fv),
      increasePct
    };
  });

  const INR_L = (v) => {
    if (v >= 10000000) return "₹" + (v / 10000000).toFixed(2) + " Cr";
    if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
    return "₹" + Math.round(v).toLocaleString("en-IN");
  };

  return (
    <div style={{ width: "100%", overflowX: "hidden" }}>
      {/* =========================================================
         SECTION 1 — HERO (SKY REGION TEXT & TRANSLUCENT BUILDING BACKGROUND)
         ========================================================= */}
      <section
        className="ff-hero-background"
        style={{
          minHeight: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          position: "relative",
          padding: "125px 24px 50px",
          textAlign: "center",
          backgroundColor: "#07080C",
          boxSizing: "border-box"
        }}
      >


        {/* Layer 2: Golden Radial Backdrop Glow Behind CTA */}
        <div
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            height: 300,
            background: "radial-gradient(ellipse at center, rgba(201, 154, 75, 0.18) 0%, rgba(7, 8, 12, 0) 70%)",
            filter: "blur(50px)",
            pointerEvents: "none",
            zIndex: 2
          }}
        />

        {/* HERO CENTERED SKY CONTENT CONTAINER */}
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            width: "100%",
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          {/* Powered by ApkaCoach */}
          <div style={{ marginBottom: 22, display: "inline-flex", alignItems: "center", gap: 7, opacity: 0.9 }}>
            <span style={{ fontSize: 12, color: "var(--text-fog)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
              powered by
            </span>
            <a
              href="https://www.apkacoach.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}
              title="Visit ApkaCoach Website"
            >
              <img src="/apkacoach-logo-dark.png" alt="ApkaCoach" style={{ height: 20, width: "auto", verticalAlign: "middle" }} />
            </a>
          </div>

          {/* Headline Positioned Cleanly in Sky Region */}
          <h1
            className="ff-hero-title"
            style={{
              fontSize: "clamp(32px, 4.5vw, 58px)",
              lineHeight: 1.15,
              fontWeight: 600,
              color: "var(--text-main)",
              marginBottom: 24,
              fontFamily: "var(--font-serif)",
              letterSpacing: "-0.02em",
              textShadow: "0 4px 24px rgba(0, 0, 0, 0.9)"
            }}
          >
            Every goal has a date. <br className="ff-desktop-br" />
            <span className="ff-serif-gold">Let's fund it on time.</span>
          </h1>

          {/* Tightened 2-Line Subtitle Paragraph */}
          <p
            className="ff-hero-subtitle"
            style={{
              fontSize: "clamp(15px, 1.8vw, 17px)",
              fontWeight: 500,
              color: "var(--text-ivory)",
              maxWidth: 680,
              margin: "0 auto 34px",
              lineHeight: 1.6,
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)",
              opacity: 0.95
            }}
          >
            Answer a few questions to uncover your financial gaps across cash flow, protection, retirement, and investments.
          </p>

          {/* Primary CTA Button */}
          <button
            className="ff-btn-gold ff-hero-cta-btn"
            onClick={scrollToAssessment}
            style={{
              fontSize: 15.5,
              fontWeight: 800,
              padding: "15px 34px",
              borderRadius: 10,
              cursor: "pointer",
              marginBottom: 50,
              
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.3s ease"
            }}
          >
            Get Your Financial Fitness Report <ArrowRight size={18} />
          </button>

          {/* GOAL TIMELINE GLOWING TRAJECTORY TRACK */}
          <div className="ff-hero-timeline" style={{ width: "100%", maxWidth: 740, position: "relative", marginTop: 18 }}>
            {/* Glowing Trajectory Track Line */}
            <div
              style={{
                position: "absolute",
                top: 24,
                left: "6%",
                right: "6%",
                height: 2,
                background: "linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(201,154,75,0.4) 70%, var(--accent-gold) 100%)",
                
                zIndex: 1
              }}
            />

            {/* Timeline Nodes */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2, flexWrap: "nowrap", gap: "2vw" }}>
              {goalsList.map((item, idx) => {
                const IconComponent = item.icon;
                const isActive = hoveredGoalIndex !== null ? hoveredGoalIndex === idx : activeGoalIndex === idx;

                return (
                  <div
                    key={item.label}
                    onClick={() => setActiveGoalIndex(idx)}
                    onMouseEnter={() => setHoveredGoalIndex(idx)}
                    onMouseLeave={() => setHoveredGoalIndex(null)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      flex: "1 1 0px",
                      minWidth: 0,
                      transition: "transform 0.25s ease"
                    }}
                  >
                    <div
                      style={{
                        width: "clamp(34px, 7.5vw, 46px)",
                        height: "clamp(34px, 7.5vw, 46px)",
                        borderRadius: "50%",
                        background: isActive ? "var(--accent-gold)" : "rgba(10, 12, 18, 0.9)",
                        border: `2px solid ${isActive ? "var(--accent-gold)" : "rgba(255, 255, 255, 0.2)"}`,
                        color: isActive ? "#07080C" : "var(--text-fog)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: isActive ? "0 0 24px rgba(201, 154, 75, 0.6)" : "0 4px 12px rgba(0,0,0,0.5)",
                        transform: isActive ? "scale(1.08)" : "scale(1)",
                        transition: "all 0.25s ease",
                        flexShrink: 0
                      }}
                    >
                      <IconComponent size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                    </div>

                    <span
                      className="ff-goal-node-label"
                      style={{
                        fontSize: 11,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "var(--accent-gold)" : "var(--text-ivory)",
                        transition: "all 0.25s ease",
                        textAlign: "center",
                        marginTop: 4,
                        opacity: 0.9,
                        textShadow: "0 2px 6px rgba(0, 0, 0, 0.8)"
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================
         SECTION 1.5 — INTERACTIVE LIVE DIAGNOSTIC SIMULATOR
         ========================================================= */}
      <section className="ff-simulator-section">
        <InteractivePreviewSimulator onStartFullAssessment={scrollToAssessment} />
      </section>

      {/* =========================================================
         SECTION 2 — INFLATION & COST OF TIME ESCALATION VISUALIZER
         ========================================================= */}
      <section className="ff-section-2" style={{ padding: "44px 24px 80px", maxWidth: 1140, margin: "0 auto", textAlign: "center" }}>

        {/* Section Title */}
        <div style={{ marginBottom: 64 }}>
          <h2 style={{ fontSize: "clamp(32px, 3.8vw, 44px)", fontWeight: 600, color: "var(--text-main)", fontFamily: "var(--font-serif)" }}>
            Compounding Growth & Goal Escalation
          </h2>
        </div>

        {/* RECHARTS AREA CHART FOR ESCALATION TIMELINE */}
        <div
          className="ff-card-glass ff-chart-card"
          style={{
            borderRadius: 20,
            padding: "32px 36px",
            border: "1px solid var(--border-subtle)",
            background: "linear-gradient(135deg, rgba(20, 24, 36, 0.96) 0%, rgba(13, 15, 24, 0.98) 100%)",
            boxShadow: "var(--shadow-layered)",
            marginBottom: 32
          }}
        >
          <div className="ff-chart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                Compounding growth trajectory over a 20-year milestone horizon.
              </div>
            </div>
            <div className="ff-chart-controls" style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-fog)" }}>Adjust Base Cost:</span>
              <button
                className="ff-btn-ghost"
                onClick={() => setBaseCost(1000000)}
                style={{ fontSize: 12, padding: "4px 10px", background: baseCost === 1000000 ? "rgba(201, 154, 75, 0.15)" : "transparent", color: baseCost === 1000000 ? "var(--accent-gold)" : "var(--text-fog)" }}
              >
                ₹10 L
              </button>
              <button
                className="ff-btn-ghost"
                onClick={() => setBaseCost(2500000)}
                style={{ fontSize: 12, padding: "4px 10px", background: baseCost === 2500000 ? "rgba(201, 154, 75, 0.15)" : "transparent", color: baseCost === 2500000 ? "var(--accent-gold)" : "var(--text-fog)" }}
              >
                ₹25 L
              </button>
              <button
                className="ff-btn-ghost"
                onClick={() => setBaseCost(5000000)}
                style={{ fontSize: 12, padding: "4px 10px", background: baseCost === 5000000 ? "rgba(201, 154, 75, 0.15)" : "transparent", color: baseCost === 5000000 ? "var(--accent-gold)" : "var(--text-fog)" }}
              >
                ₹50 L
              </button>
            </div>
          </div>

          <div style={{ height: 220, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={escalationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="yearLabel" tick={{ fontSize: 12, fill: '#CBD5E1' }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#CBD5E1' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 100000)}L`} />
                <Tooltip formatter={(v) => INR_L(v)} contentStyle={{ background: '#0D0E15', borderRadius: 8, border: '1px solid var(--border-gold)', color: '#FFFFFF', fontSize: 13 }} itemStyle={{ color: '#FFFFFF' }} labelStyle={{ color: '#CBD5E1', fontWeight: 700 }} />
                <Area type="monotone" dataKey="futureCost" stroke="var(--accent-gold)" fill="rgba(201, 154, 75, 0.2)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COST OF DELAY WARNING BOX */}
        <div className="ff-delay-warning">
          <AlertTriangle size={22} color="var(--alert-coral)" style={{ flexShrink: 0 }} />
          <div>
            <b style={{ color: "var(--alert-coral)" }}>Cost of Waiting Warning:</b> Delaying your savings strategy by 5 years increases your required monthly investment contribution by ~48% to achieve the exact same milestone target.
          </div>
        </div>

      </section>

      {/* =========================================================
         SECTION 3 — ASSESSMENT CTA (STREAMLINED)
         ========================================================= */}
      <section className="ff-cta-section" style={{ padding: "40px 24px 60px", maxWidth: 1140, margin: "0 auto" }}>
        {/* Card 1: Start Full Assessment */}
        <div className="ff-cta-card-inner">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent-gold)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              <Sparkles size={13} /> Institutional Diagnostic Engine
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 600, color: "var(--text-main)", marginBottom: 6, fontFamily: "var(--font-serif)" }}>
              Ready to run your personalized diagnostic?
            </h3>
            <p style={{ fontSize: 14.5, color: "var(--text-fog)", margin: 0 }}>
              Takes only 4 minutes &bull; 100% confidential &bull; Comprehensive institutional report
            </p>
          </div>
          <button className="ff-btn-gold ff-cta-btn" onClick={() => scrollToAssessment()}>
            Start Assessment <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* =========================================================
         SECTION 4 — MINIMAL FOOTER WITH WORKING MODAL LINKS
         ========================================================= */}
      <footer className="ff-landing-footer">
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-serif)", color: "var(--text-main)" }}>
            Your<span style={{ color: "var(--accent-gold)" }}>Wealth</span>Compass
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 13.5, color: "var(--text-fog)", margin: "4px 0", flexWrap: "wrap", justifyContent: "center" }}>
            <span
              style={{ cursor: "pointer", color: "var(--text-main)", fontWeight: 600 }}
              onClick={() => {
                if (onOpenLegal) onOpenLegal("privacy");
              }}
            >
              Privacy Policy
            </span>
            <span>&bull;</span>
            <span
              style={{ cursor: "pointer", color: "var(--text-main)", fontWeight: 600 }}
              onClick={() => {
                if (onOpenLegal) onOpenLegal("terms");
              }}
            >
              Terms of Service
            </span>
            <span>&bull;</span>
            <span
              style={{ cursor: "pointer", color: "var(--text-main)", fontWeight: 600 }}
              onClick={() => {
                if (onOpenLegal) onOpenLegal("contact");
                else if (onOpenAdvisory) onOpenAdvisory();
              }}
            >
              Contact / Advisory
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-fog)", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <span>&copy; {new Date().getFullYear()} Your Wealth Compass. All rights reserved.</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              Powered by
              <a
                href="https://www.apkacoach.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", textDecoration: "none" }}
                title="Visit ApkaCoach Website"
              >
                <img src="/apkacoach-logo-dark.png" alt="ApkaCoach" style={{ height: 16, width: "auto", verticalAlign: "middle" }} />
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* Live Social Proof Activity Toast (inspired by planyourwealth.in) */}
      <LiveSocialProofToast />
    </div>
  );
}
