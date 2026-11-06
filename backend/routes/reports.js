const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Lead = require("../models/Lead");
const Enquiry = require("../models/Enquiry");
const AuditLog = require("../models/AuditLog");
const FormResponse = require("../models/FormResponse");
const AssignmentRule = require("../models/AssignmentRule");

const router = express.Router();

// Helper to extract user info from Authorization token (supports both base64 JSON & Firebase JWTs)
function getUserFromAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  try {
    const raw = authHeader.replace("Bearer ", "").trim();
    const parts = raw.split(".");
    if (parts.length === 3) {
      const payload = parts[1];
      const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
      return {
        id: decoded.user_id || decoded.sub || decoded.uid || decoded.id,
        email: decoded.email || "",
        name: decoded.name || "",
        role: decoded.role || "client"
      };
    }
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch (e) {
    return null;
  }
}

// Helper: Resolve advisor assignment (Direct Referral Credit OR Auto Distribution via Configured Rules)
async function resolveAdvisorAssignment(referralCode) {
  let assignedData = { advisorId: null, advisorName: "", advisorEmail: "", advisorDesignation: "Certified Financial Advisor", assignedAt: null };
  let sourceAdvisor = { advisorId: "", advisorName: "", advisorDesignation: "Certified Financial Advisor", referralCode: "" };

  const cleanRef = (referralCode || "").trim().toLowerCase();

  // 1. If referral code is provided, try to match advisor directly
  if (cleanRef) {
    try {
      const matchedAdvisor = await User.findOne({
        role: "advisor",
        status: "active",
        $or: [
          { referralCode: cleanRef },
          { username: cleanRef },
          { email: cleanRef },
          { name: new RegExp("^" + cleanRef + "$", "i") }
        ]
      }).lean();

      if (matchedAdvisor) {
        const designation = matchedAdvisor.designation || "Certified Financial Advisor";
        assignedData = {
          advisorId: matchedAdvisor._id.toString(),
          advisorName: matchedAdvisor.name,
          advisorEmail: matchedAdvisor.email,
          advisorDesignation: designation,
          assignedAt: new Date()
        };
        sourceAdvisor = {
          advisorId: matchedAdvisor._id.toString(),
          advisorName: matchedAdvisor.name,
          advisorDesignation: designation,
          referralCode: matchedAdvisor.referralCode || matchedAdvisor.username || cleanRef
        };
        return { assignedData, sourceAdvisor, refCode: cleanRef };
      }
    } catch (refErr) {
      console.warn("Referral advisor lookup error:", refErr.message);
    }
  }

  // 2. If no referral code or referral code didn't match:
  // Apply Super Admin's configured assignment rules
  try {
    let rule = await AssignmentRule.findOne({ key: "lead_distribution_rule" }).lean().catch(() => null);
    if (!rule) {
      rule = { strategy: "equal_random", maxLeadsPerAdvisor: 20, autoAssignEnabled: true };
    }

    // If auto-assign is turned off by Super Admin, keep lead strictly unassigned
    if (rule.autoAssignEnabled === false) {
      return { assignedData, sourceAdvisor, refCode: cleanRef };
    }

    const activeAdvisors = await User.find({ role: "advisor", status: "active" }).lean();
    if (activeAdvisors && activeAdvisors.length > 0) {
      let chosen = null;

      if (rule.strategy === "performance") {
        // Priority to advisors with most closed clients (conversionsCount)
        const sorted = [...activeAdvisors].sort((a, b) => {
          const diff = (b.conversionsCount || 0) - (a.conversionsCount || 0);
          if (diff !== 0) return diff;
          return (a.assignedLeadsCount || 0) - (b.assignedLeadsCount || 0);
        });
        chosen = sorted[0];
      } else if (rule.strategy === "capacity_cap") {
        // Only assign to advisors under the maxLeadsPerAdvisor threshold
        const maxCap = Number(rule.maxLeadsPerAdvisor) || 20;
        const eligible = activeAdvisors.filter(a => (a.assignedLeadsCount || 0) < maxCap);
        if (eligible.length > 0) {
          eligible.sort((a, b) => (a.assignedLeadsCount || 0) - (b.assignedLeadsCount || 0));
          chosen = eligible[0];
        } else {
          // If all at cap, fallback to the one with lowest active leads
          const sorted = [...activeAdvisors].sort((a, b) => (a.assignedLeadsCount || 0) - (b.assignedLeadsCount || 0));
          chosen = sorted[0];
        }
      } else {
        // Equal / Random round-robin by lowest current workload
        const sorted = [...activeAdvisors].sort((a, b) => (a.assignedLeadsCount || 0) - (b.assignedLeadsCount || 0));
        chosen = sorted[0];
      }

      if (chosen) {
        const designation = chosen.designation || "Certified Financial Advisor";
        assignedData = {
          advisorId: chosen._id.toString(),
          advisorName: chosen.name,
          advisorEmail: chosen.email,
          advisorDesignation: designation,
          assignedAt: new Date()
        };
        sourceAdvisor = {
          advisorId: chosen._id.toString(),
          advisorName: chosen.name,
          advisorDesignation: designation,
          referralCode: chosen.referralCode || chosen.username || ""
        };
      }
    }
  } catch (randErr) {
    console.warn("Advisor rule assignment error:", randErr.message);
  }

  return { assignedData, sourceAdvisor, refCode: cleanRef };
}

// POST /api/v1/reports/submit — save form submission
router.post("/submit", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);
    const data = req.body || {};

    const resolvedUserId = (authUser && authUser.id) ? authUser.id : (data.userId || "");
    const cityVal = data.city || data.protection?.city || "";
    const retAgeVal = String(data.retirementAge || data.protection?.retirementAge || "60");
    const termIns = data.termInsurance !== undefined ? data.termInsurance : (data.protection?.termInsurance ? "yes" : "no");
    const termAmt = String(data.termAmount || data.protection?.termAmount || "0");
    const healthIns = data.healthInsurance !== undefined ? data.healthInsurance : (data.protection?.healthInsurance ? "yes" : "no");
    const healthAmt = String(data.healthAmount || data.protection?.healthAmount || "0");

    let leadObj = {
      _id:             "lead_" + Date.now(),
      userId:          resolvedUserId,
      name:            data.name || "Client User",
      email:           data.email || "",
      mobile:          data.mobile || "",
      age:             String(data.age || ""),
      income:          String(data.income || "0"),
      expenses:        String(data.expenses || "0"),
      savings:         String(data.savings || "0"),
      city:            cityVal,
      retirementAge:   retAgeVal,
      termInsurance:   termIns,
      termAmount:      termAmt,
      healthInsurance: healthIns,
      healthAmount:    healthAmt,
      goals:           Array.isArray(data.goals) ? data.goals : [],
      healthScore:     Number(data.healthScore) || (data.scores?.overallScore) || 0,
      totalMonthlyRequired: Number(data.totalMonthlyRequired) || 0,
      emergencyGap:    Number(data.emergencyGap) || 0,
      scores:          data.scores || {},
      protection:      data.protection || {
        termInsurance: termIns === "yes",
        termAmount: termAmt,
        healthInsurance: healthIns === "yes",
        healthAmount: healthAmt,
        city: cityVal,
        retirementAge: retAgeVal
      },
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
    };

    // Resolve assignment: Referral credit or Random distribution
    const rawRefCode = data.referralCode || req.query.ref || req.body.ref || "";
    const { assignedData, sourceAdvisor, refCode } = await resolveAdvisorAssignment(rawRefCode);

    try {
      const created = await Lead.create({
        userId:          resolvedUserId,
        name:            data.name || "Client User",
        email:           data.email || "",
        mobile:          data.mobile || "",
        age:             String(data.age || ""),
        income:          String(data.income || "0"),
        expenses:        String(data.expenses || "0"),
        savings:         String(data.savings || "0"),
        city:            cityVal,
        retirementAge:   retAgeVal,
        termInsurance:   termIns,
        termAmount:      termAmt,
        healthInsurance: healthIns,
        healthAmount:    healthAmt,
        goals:           Array.isArray(data.goals) ? data.goals : [],
        healthScore:     leadObj.healthScore,
        totalMonthlyRequired: leadObj.totalMonthlyRequired,
        emergencyGap:    leadObj.emergencyGap,
        scores:          leadObj.scores,
        protection:      leadObj.protection,
        referralCode:    refCode,
        sourceAdvisor:   sourceAdvisor,
        assignedTo:      assignedData,
        leadStatus:      "new",
        advisorNotes:    []
      });
      leadObj = { ...created.toObject(), _id: created._id, id: created._id };

      if (assignedData.advisorId) {
        await User.findByIdAndUpdate(assignedData.advisorId, { $inc: { assignedLeadsCount: 1 } }).catch(() => {});
      }

      await AuditLog.create({
        type: "Lead Submission",
        user: data.email || data.mobile || (authUser ? authUser.email : "Anonymous"),
        status: "Success",
        details: `Assessment submitted: ${data.name || "Client User"} (Score: ${leadObj.healthScore}/100)${assignedData.advisorName ? ` [Assigned to ${assignedData.advisorName}${refCode ? ` via referral "${refCode}"` : " (Auto-assigned)"}]` : " [Unassigned]"}`
      }).catch(() => {});
    } catch (dbErr) {
      console.error("MongoDB Save Error:", dbErr.message);
    }

    res.json({
      success: true,
      report: {
        ...leadObj,
        id: leadObj._id || leadObj.id,
        submittedAt: leadObj.createdAt || new Date().toISOString(),
      },
      pdfUrl: null
    });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/reports/my-assessments — fetch all assessments for a user
router.get("/my-assessments", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);
    const { userId, email, mobile } = req.query;

    const targetUserId = userId || (authUser ? authUser.id : "");
    const targetEmail = (email || (authUser ? authUser.email : "")).trim().toLowerCase();
    const targetMobile = (mobile || (authUser ? authUser.mobile : "")).trim();

    const filters = [];
    if (targetUserId) filters.push({ userId: targetUserId });
    if (targetEmail && !targetEmail.endsWith("@mobile.client") && !targetEmail.includes("mobile.client")) {
      filters.push({ email: new RegExp("^" + targetEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") });
    }

    const cleanPhoneDigits = targetMobile ? targetMobile.replace(/\D/g, "") : "";
    const last10 = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;
    if (last10 && last10.length >= 7) {
      filters.push({ mobile: new RegExp(last10) });
    }

    if (filters.length === 0) {
      return res.json({ success: true, assessments: [] });
    }

    let records = [];
    try {
      records = await Lead.find({ $or: filters }).sort({ createdAt: -1 }).lean();
    } catch (dbErr) {
      console.error("Fetch user assessments error:", dbErr.message);
    }

    const mapped = records.map((l) => ({
      id: l._id,
      userId: l.userId || "",
      name: l.name,
      email: l.email,
      mobile: l.mobile,
      age: l.age,
      income: l.income,
      expenses: l.expenses,
      savings: l.savings,
      city: l.city,
      retirementAge: l.retirementAge,
      termInsurance: l.termInsurance,
      termAmount: l.termAmount,
      healthInsurance: l.healthInsurance,
      healthAmount: l.healthAmount,
      goals: l.goals || [],
      healthScore: l.healthScore || (l.scores?.overallScore) || 0,
      totalMonthlyRequired: l.totalMonthlyRequired || 0,
      emergencyGap: l.emergencyGap || 0,
      scores: l.scores || {},
      protection: l.protection || {
        termInsurance: l.termInsurance === "yes",
        termAmount: l.termAmount || "0",
        healthInsurance: l.healthInsurance === "yes",
        healthAmount: l.healthAmount || "0",
        city: l.city || "",
        retirementAge: l.retirementAge || "60"
      },
      pdfUrl: l.pdfUrl || null,
      submittedAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));

    res.json({ success: true, assessments: mapped });
  } catch (err) {
    console.error("Get my-assessments error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/reports/:id — fetch single assessment
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let record = null;
    try {
      record = await Lead.findById(id).lean();
    } catch (e) {}

    if (!record) {
      return res.status(404).json({ success: false, error: "Assessment not found" });
    }

    res.json({
      success: true,
      assessment: {
        ...record,
        id: record._id,
        submittedAt: record.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/reports/:id — delete assessment
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await Lead.findByIdAndDelete(id);
    } catch (e) {}
    res.json({ success: true, message: "Assessment deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/reports/enquiry — save contact/advisory enquiry
router.post("/enquiry", async (req, res) => {
  try {
    const { name, email, mobile, topic, message, referralCode } = req.body;
    const rawRefCode = referralCode || req.query.ref || "";
    const { assignedData, refCode } = await resolveAdvisorAssignment(rawRefCode);

    let enqObj = {
      _id: "enq_" + Date.now(),
      name: name || "Advisory Client",
      email: email || "",
      mobile: mobile || "",
      topic: topic || "General Wealth Advisory",
      message: message || "",
      referralCode: refCode,
      assignedTo: assignedData,
      createdAt: new Date().toISOString()
    };

    try {
      const created = await Enquiry.create({
        name: name || "Advisory Client",
        email: email || "",
        mobile: mobile || "",
        topic: topic || "General Wealth Advisory",
        message: message || "",
        referralCode: refCode,
        assignedTo: assignedData
      });
      enqObj = { ...created.toObject(), _id: created._id, id: created._id };

      await AuditLog.create({
        type: "Advisory Enquiry",
        user: email || mobile || name || "Anonymous",
        status: "Success",
        details: `Contact enquiry from ${name || "Client"}: ${topic || "Advisory"}${assignedData.advisorName ? ` [Assigned to ${assignedData.advisorName}]` : ""}`
      }).catch(() => {});
    } catch (dbErr) {
      console.error("MongoDB Enquiry Save Error:", dbErr.message);
    }

    res.json({
      success: true,
      enquiry: enqObj,
      message: "Enquiry submitted successfully"
    });
  } catch (err) {
    console.error("Enquiry submission error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/reports/form-response — save /forms profile application
router.post("/form-response", async (req, res) => {
  try {
    const { name, email, mobile, city, education, profession, notes, referralCode } = req.body;

    if (!name && !mobile && !email) {
      return res.status(400).json({ success: false, error: "Name and Mobile/Email are required" });
    }

    const cleanName = (name || "Applicant").trim();
    const cleanEmail = (email || "").trim();
    const digitsOnly = (mobile || "").replace(/\D/g, "");
    const cleanMobile = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : (digitsOnly || String(mobile || "").trim());
    const cleanCity = (city || "").trim();
    const cleanEdu = (education || "").trim();
    const cleanProf = (profession || "").trim();

    const rawRefCode = referralCode || req.query.ref || "";
    const { assignedData, sourceAdvisor, refCode } = await resolveAdvisorAssignment(rawRefCode);

    let createdResponse = null;
    let createdLead = null;

    try {
      createdResponse = await FormResponse.create({
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile,
        city: cleanCity,
        education: cleanEdu,
        profession: cleanProf,
        status: "new",
        source: "Forms Portal (/forms)",
        referralCode: refCode,
        assignedTo: assignedData,
        notes: notes ? [{ text: notes, author: "System" }] : []
      });

      // Also create or sync into Lead collection so it shows in main CRM pipeline
      createdLead = await Lead.create({
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile,
        city: cleanCity,
        leadStatus: "new",
        referralCode: refCode,
        sourceAdvisor: sourceAdvisor,
        assignedTo: assignedData,
        goals: [cleanProf, cleanEdu].filter(Boolean),
        advisorNotes: [
          {
            note: `Source: Forms Portal (/forms)\nCity: ${cleanCity}\nHighest Education: ${cleanEdu}\nCurrent Profession: ${cleanProf}`,
            authorName: "System",
            authorRole: "system",
            createdAt: new Date()
          }
        ]
      });

      await AuditLog.create({
        type: "Form Response",
        user: cleanEmail || cleanMobile || cleanName,
        status: "Success",
        details: `Form response from ${cleanName}: ${cleanProf} (${cleanCity})${assignedData.advisorName ? ` [Assigned to ${assignedData.advisorName}]` : ""}`
      }).catch(() => {});

      // Asynchronously forward to Google Form endpoint
      try {
        const https = require("https");
        const querystring = require("querystring");
        const gPostData = querystring.stringify({
          "fvv": "1",
          "pageHistory": "0",
          "entry.183190177": cleanName,
          "entry.1384209841": cleanMobile,
          "entry.72691823": cleanCity,
          "entry.1170563700": cleanEdu,
          "entry.1764066533": cleanProf
        });
        const gReq = https.request({
          hostname: "docs.google.com",
          port: 443,
          path: "/forms/d/e/1FAIpQLSfplzBIcOWuDBsczdUasKnxMVt57OvJSntLYrYyUyo5Nqf67w/formResponse",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(gPostData),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }, (gRes) => {
          if (gRes.statusCode >= 200 && gRes.statusCode < 400) {
            console.log("Google Form server sync OK:", gRes.statusCode);
          } else {
            console.warn("Google Form server sync status:", gRes.statusCode);
          }
        });
        gReq.on("error", (e) => console.warn("Google Form forward notice:", e.message));
        gReq.write(gPostData);
        gReq.end();
      } catch (gErr) {
        console.warn("Google Form forward skipped:", gErr.message);
      }
    } catch (dbErr) {
      console.error("MongoDB FormResponse Save Error:", dbErr.message);
    }

    const responseData = createdResponse
      ? createdResponse.toObject()
      : {
          _id: "fr_" + Date.now(),
          id: "fr_" + Date.now(),
          name: cleanName,
          email: cleanEmail,
          mobile: cleanMobile,
          city: cleanCity,
          education: cleanEdu,
          profession: cleanProf,
          status: "new",
          createdAt: new Date().toISOString()
        };

    res.json({
      success: true,
      formResponse: responseData,
      leadId: createdLead ? createdLead._id : null,
      message: "Form response recorded successfully"
    });
  } catch (err) {
    console.error("Form response submission error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
