import React, { useState } from "react";
import {
  ArrowRight,
  Shield,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  PiggyBank,
  Wallet
} from "lucide-react";
import { INR, INR_L } from "../../utils/financialEngine";

export default function InteractivePreviewSimulator({ onStartFullAssessment }) {
  // Simulator input state
  const [income, setIncome] = useState(120000); // ₹1.2 L / mo
  const [expenses, setExpenses] = useState(60000); // ₹60 K / mo
  const [savings, setSavings] = useState(300000); // ₹3 L liquid cash
  const [age, setAge] = useState(30);

  // 1. Savings Rate Metric (0 - 35 pts)
  const monthlySurplus = Math.max(0, income - expenses);
  const savingsRate = income > 0 ? Math.round((monthlySurplus / income) * 100) : 0;
  let savingsRateScore = 5;
  if (savingsRate >= 45) savingsRateScore = 35;
  else if (savingsRate >= 35) savingsRateScore = 30;
  else if (savingsRate >= 25) savingsRateScore = 24;
  else if (savingsRate >= 15) savingsRateScore = 17;
  else if (savingsRate >= 5) savingsRateScore = 10;

  // 2. Emergency Buffer Runway Metric (0 - 35 pts)
  const numRunwayMonths = expenses > 0 ? savings / expenses : 0;
  const emergencyMonths = numRunwayMonths.toFixed(1);
  const emergencyAdequate = numRunwayMonths >= 6;
  let emergencyScore = 4;
  if (numRunwayMonths >= 6) emergencyScore = 35;
  else if (numRunwayMonths >= 4.5) emergencyScore = 28;
  else if (numRunwayMonths >= 3) emergencyScore = 21;
  else if (numRunwayMonths >= 1.5) emergencyScore = 13;
  else if (numRunwayMonths >= 0.5) emergencyScore = 7;

  // 3. Age & Wealth Accumulation Metric (0 - 30 pts)
  const annualIncome = income * 12;
  let targetMultiplier = 1.0;
  if (age <= 25) targetMultiplier = 0.4;
  else if (age <= 30) targetMultiplier = 1.0;
  else if (age <= 35) targetMultiplier = 2.0;
  else if (age <= 40) targetMultiplier = 3.5;
  else if (age <= 45) targetMultiplier = 5.0;
  else targetMultiplier = 6.5;

  const targetSavings = annualIncome * targetMultiplier;
  const accumulationRatio = targetSavings > 0 ? savings / targetSavings : 0;
  let accumulationScore = 4;
  if (accumulationRatio >= 0.9) accumulationScore = 30;
  else if (accumulationRatio >= 0.65) accumulationScore = 25;
  else if (accumulationRatio >= 0.4) accumulationScore = 20;
  else if (accumulationRatio >= 0.2) accumulationScore = 14;
  else if (accumulationRatio >= 0.08) accumulationScore = 8;

  // Total Estimated Fitness Score (0 to 100)
  const score = Math.min(100, Math.max(15, Math.round(savingsRateScore + emergencyScore + accumulationScore)));

  // Recommended HLV Term Cover Benchmark (15x annual income)
  const termCover = income * 12 * 15;

  // Estimated retirement corpus rule of thumb based on living costs
  const yearsToRetire = Math.max(5, 60 - age);
  const inflationAdjustedMonthly = expenses * Math.pow(1.06, yearsToRetire);
  const retirementCorpus = Math.round(inflationAdjustedMonthly * 12 * 25);

  // Score color helper
  const getScoreColor = (s) => {
    if (s >= 75) return "#34D399"; // Emerald
    if (s >= 50) return "#F59E0B"; // Amber Gold
    return "#F87171"; // Coral Red
  };

  const scoreColor = getScoreColor(score);

  const handleUnlockFullReport = () => {
    if (onStartFullAssessment) {
      onStartFullAssessment({
        age: String(age),
        income: String(income),
        expenses: String(expenses),
        savings: String(savings)
      });
    }
  };

  return (
    <div className="ff-card-glass ff-simulator-container">
      {/* Decorative ambient background glow */}
      

      {/* Simulator Header without clutter badges */}
      <div className="ff-simulator-header" style={{ marginBottom: 24 }}>
        <div className="ff-simulator-header-info">
          <h3 className="ff-simulator-heading">
            Instant Financial Health & Wealth Simulator
          </h3>
          <p className="ff-simulator-sub">
            Drag the sliders below to test your cash flow surplus, emergency runway, and estimated financial health score in real time.
          </p>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live Score & Gaps on Right */}
      <div className="ff-simulator-grid">
        {/* LEFT COLUMN: INTERACTIVE SLIDERS */}
        <div className="ff-simulator-sliders">
          {/* Slider 1: Monthly Income */}
          <div className="ff-simulator-slider-item">
            <div className="ff-simulator-slider-row">
              <label className="ff-simulator-slider-label">
                <Wallet size={15} color="var(--accent-gold)" /> Monthly In-Hand Income
              </label>
              <span className="ff-simulator-slider-val">
                {INR(income)}/mo
              </span>
            </div>
            <input
              type="range"
              min={25000}
              max={1000000}
              step={5000}
              value={income}
              className="ff-simulator-range-input"
              onChange={(e) => {
                const val = Number(e.target.value);
                setIncome(val);
                if (expenses > val) setExpenses(val);
              }}
            />
            <div className="ff-simulator-slider-ticks">
              <span>₹25K</span>
              <span>₹2.5L</span>
              <span>₹5L</span>
              <span>₹10L</span>
            </div>
          </div>

          {/* Slider 2: Monthly Expenses */}
          <div className="ff-simulator-slider-item">
            <div className="ff-simulator-slider-row">
              <label className="ff-simulator-slider-label">
                <Activity size={15} color="var(--accent-gold)" /> Monthly Living Expenses
              </label>
              <span className="ff-simulator-slider-val">
                {INR(expenses)}/mo
              </span>
            </div>
            <input
              type="range"
              min={10000}
              max={Math.min(income, 500000)}
              step={5000}
              value={expenses}
              className="ff-simulator-range-input"
              onChange={(e) => setExpenses(Number(e.target.value))}
            />
            <div className="ff-simulator-slider-ticks">
              <span>₹10K</span>
              <span className="ff-simulator-savings-tag">
                Savings Rate: {savingsRate}%
              </span>
              <span>Max ₹{Math.min(income, 500000) / 1000}K</span>
            </div>
          </div>

          {/* Slider 3: Liquid Cash & Savings */}
          <div className="ff-simulator-slider-item">
            <div className="ff-simulator-slider-row">
              <label className="ff-simulator-slider-label">
                <PiggyBank size={15} color="var(--accent-gold)" /> Liquid Cash & Emergency Buffer
              </label>
              <span className="ff-simulator-slider-val">
                {INR_L(savings)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3000000}
              step={25000}
              value={savings}
              className="ff-simulator-range-input"
              onChange={(e) => setSavings(Number(e.target.value))}
            />
            <div className="ff-simulator-slider-ticks">
              <span>₹0</span>
              <span>₹5L</span>
              <span>₹15L</span>
              <span>₹30L</span>
            </div>
          </div>

          {/* Slider 4: Current Age */}
          <div className="ff-simulator-slider-item">
            <div className="ff-simulator-slider-row">
              <label className="ff-simulator-slider-label">
                <Sliders size={15} color="var(--accent-gold)" /> Current Age
              </label>
              <span className="ff-simulator-slider-val">
                {age} Years Old
              </span>
            </div>
            <input
              type="range"
              min={21}
              max={55}
              step={1}
              value={age}
              className="ff-simulator-range-input"
              onChange={(e) => setAge(Number(e.target.value))}
            />
            <div className="ff-simulator-slider-ticks">
              <span>21 yrs</span>
              <span>30 yrs</span>
              <span>45 yrs</span>
              <span>55 yrs</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE SCORE GAUGE & GAP TEASER */}
        <div className="ff-simulator-result-card">
          {/* Top Score Banner */}
          <div className="ff-simulator-score-row">
            <div>
              <div className="ff-simulator-score-label">
                Estimated Fitness Score
              </div>
              <div className="ff-simulator-score-numbers">
                <span style={{ color: scoreColor }} className="ff-simulator-score-main">
                  {score}
                </span>
                <span className="ff-simulator-score-total">/ 100</span>
              </div>
            </div>

            <div
              className="ff-simulator-status-pill"
              style={{
                background: score >= 75 ? "rgba(52, 211, 153, 0.12)" : score >= 50 ? "rgba(245, 158, 11, 0.12)" : "rgba(248, 113, 113, 0.12)",
                borderColor: scoreColor,
                color: scoreColor
              }}
            >
              {score >= 75 ? "● Solid Foundation" : score >= 50 ? "● Action Recommended" : "● Attention Required"}
            </div>
          </div>

          {/* Key Metrics Quick 2-Tile Grid */}
          <div className="ff-simulator-metrics-grid">
            {/* Tile 1: Emergency Runway */}
            <div className="ff-simulator-metric-tile">
              <div className="ff-simulator-metric-title">
                Emergency Runway
              </div>
              <div
                className="ff-simulator-metric-val"
                style={{ color: emergencyAdequate ? "var(--accent-teal)" : "#F87171" }}
              >
                {emergencyMonths} Months
              </div>
              <div className="ff-simulator-metric-note">
                Target: 6 Months ({INR_L(expenses * 6)})
              </div>
            </div>

            {/* Tile 2: Retirement Target */}
            <div className="ff-simulator-metric-tile">
              <div className="ff-simulator-metric-title">
                Retirement Target
              </div>
              <div
                className="ff-simulator-metric-val"
                style={{ color: "var(--accent-gold)" }}
              >
                {INR_L(retirementCorpus)}
              </div>
              <div className="ff-simulator-metric-note">
                Inflation-adjusted by age 60
              </div>
            </div>
          </div>

          {/* Strategic Observations */}
          <div className="ff-simulator-observations-card">
            <div className="ff-simulator-observations-title">
              <AlertTriangle size={14} /> Key Strategic Observations
            </div>
            <ul className="ff-simulator-observations-list">
              <li>
                <b>Monthly Cash Flow:</b> You have a monthly surplus of <b>{INR_L(monthlySurplus)}</b> ({savingsRate}% savings rate).
              </li>
              <li>
                <b>Emergency Buffer:</b>{" "}
                {emergencyAdequate
                  ? "Your liquid emergency cushion meets standard 6-month safety guidelines."
                  : `Calculated reserve deficit of ~${INR_L(Math.max(0, expenses * 6 - savings))} relative to 6-month living cost benchmark.`}
              </li>
              <li>
                <b>Recommended Life Cover:</b> Baseline HLV cover of <b>{INR_L(termCover)}</b> recommended for family income security.
              </li>
            </ul>
          </div>

          {/* Action CTA Button */}
          <button
            onClick={handleUnlockFullReport}
            className="ff-btn-primary ff-simulator-cta-btn"
          >
            <span>Start Free Assessment</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
