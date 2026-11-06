const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Lead = require("../models/Lead");
const Enquiry = require("../models/Enquiry");
const AuditLog = require("../models/AuditLog");
const FormResponse = require("../models/FormResponse");
const AssignmentRule = require("../models/AssignmentRule");

const router = express.Router();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  try {
    if (!storedHash || !storedHash.includes(":")) return false;
    const [salt, originalHash] = storedHash.split(":");
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    return hash === originalHash;
  } catch (e) {
    return false;
  }
}

function generateAdminToken(user) {
  const refCode = user.referralCode || user.username || "";
  const payload = {
    id: user._id ? user._id.toString() : user.id,
    email: user.email,
    username: user.username || "",
    referralCode: refCode,
    referralLink: refCode ? `https://www.yourwealthcompass.in/?ref=${refCode}` : "",
    name: user.name,
    role: user.role || "advisor",
    ts: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function getUserFromAuth(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    return decoded;
  } catch (e) {
    return null;
  }
}

// -------------------------------------------------------------

// Helper: Auto-distribute unassigned leads across active advisors
async function autoDistributeUnassignedLeads(targetAdvisorId = null) {
  try {
    const activeAdvisors = await User.find({ role: "advisor", status: "active" }).lean();
    if (!activeAdvisors || activeAdvisors.length === 0) {
      return { assignedCount: 0, message: "No active advisors" };
    }

    let rule = await AssignmentRule.findOne({ key: "lead_distribution_rule" }).lean().catch(() => null);
    if (!rule) {
      rule = { strategy: "equal_random", maxLeadsPerAdvisor: 20, autoAssignEnabled: true };
    }

    const unassignedLeads = await Lead.find({
      $or: [
        { "assignedTo.advisorId": null },
        { "assignedTo.advisorId": "" },
        { "assignedTo.advisorId": { $exists: false } },
        { assignedTo: { $exists: false } }
      ]
    });

    if (!unassignedLeads || unassignedLeads.length === 0) {
      return { assignedCount: 0, message: "No unassigned leads found" };
    }

    let assignedCount = 0;
    const advisorLoads = {};
    activeAdvisors.forEach(a => {
      advisorLoads[a._id.toString()] = a.assignedLeadsCount || 0;
    });

    for (let i = 0; i < unassignedLeads.length; i++) {
      const lead = unassignedLeads[i];

      let chosen = null;
      if (targetAdvisorId) {
        chosen = activeAdvisors.find(a => a._id.toString() === targetAdvisorId.toString());
      }

      if (!chosen) {
        if (rule.strategy === "performance") {
          const sorted = [...activeAdvisors].sort((a, b) => {
            const diff = (b.conversionsCount || 0) - (a.conversionsCount || 0);
            if (diff !== 0) return diff;
            return (advisorLoads[a._id.toString()] || 0) - (advisorLoads[b._id.toString()] || 0);
          });
          chosen = sorted[0];
        } else if (rule.strategy === "capacity_cap") {
          const maxCap = Number(rule.maxLeadsPerAdvisor) || 20;
          const eligible = activeAdvisors.filter(a => (advisorLoads[a._id.toString()] || 0) < maxCap);
          if (eligible.length > 0) {
            eligible.sort((a, b) => (advisorLoads[a._id.toString()] || 0) - (advisorLoads[b._id.toString()] || 0));
            chosen = eligible[0];
          } else {
            const sorted = [...activeAdvisors].sort((a, b) => (advisorLoads[a._id.toString()] || 0) - (advisorLoads[b._id.toString()] || 0));
            chosen = sorted[0];
          }
        } else {
          const sorted = [...activeAdvisors].sort((a, b) => (advisorLoads[a._id.toString()] || 0) - (advisorLoads[b._id.toString()] || 0));
          chosen = sorted[0];
        }
      }

      if (chosen) {
        const designation = chosen.designation || "Certified Financial Advisor";
        lead.assignedTo = {
          advisorId: chosen._id.toString(),
          advisorName: chosen.name,
          advisorEmail: chosen.email,
          advisorDesignation: designation,
          assignedAt: new Date()
        };
        await lead.save();
        assignedCount++;
        advisorLoads[chosen._id.toString()] = (advisorLoads[chosen._id.toString()] || 0) + 1;
        await User.findByIdAndUpdate(chosen._id, { $inc: { assignedLeadsCount: 1 } }).catch(() => {});
      }
    }

    return { assignedCount, totalActiveAdvisors: activeAdvisors.length };
  } catch (err) {
    console.error("autoDistributeUnassignedLeads error:", err);
    return { assignedCount: 0, error: err.message };
  }
}

// 1. AUTHENTICATION & LOGIN
// -------------------------------------------------------------

// POST /api/v1/admin/auth/login — multi-tier login (master password OR advisor/admin credentials)
router.post("/auth/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: "Password is required" });
    }

    // 1. Check Master Key Bypass (Super Admin)
    if (password === "work2026@") {
      const superUser = {
        id: "superadmin_master",
        name: "Super Administrator",
        username: "superadmin",
        email: identifier ? identifier.toLowerCase().trim() : "admin@yourwealthcompass.in",
        role: "superadmin",
        referralCode: "admin",
        referralLink: "https://www.yourwealthcompass.in/?ref=admin"
      };
      const token = generateAdminToken(superUser);

      await AuditLog.create({
        type: "Admin Login",
        user: superUser.email,
        status: "Success",
        details: "Super Admin master session authenticated"
      }).catch(() => {});

      return res.json({
        success: true,
        message: "Super Admin authenticated",
        user: superUser,
        token
      });
    }

    // 2. Check Database User by Email / Username / Mobile
    if (!identifier) {
      return res.status(400).json({ success: false, error: "Email, Username, or ID is required" });
    }

    const cleanIdentifier = identifier.toLowerCase().trim();
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { username: cleanIdentifier },
        { mobile: cleanIdentifier },
        { referralCode: cleanIdentifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials. User not found." });
    }

    const allowedRoles = ["advisor", "advisor_creator", "creator", "it_manager", "admin", "superadmin"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ success: false, error: "Access denied. Client accounts cannot access Admin Portal." });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ success: false, error: "Your account is deactivated. Contact Super Admin." });
    }

    const isValidPass = verifyPassword(password, user.passwordHash);
    if (!isValidPass) {
      return res.status(401).json({ success: false, error: "Invalid password." });
    }

    user.lastLoginAt = new Date();
    await user.save().catch(() => {});

    const refCode = user.referralCode || user.username || user.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const refLink = `https://www.yourwealthcompass.in/?ref=${refCode}`;

    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      username: user.username || "",
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      referralCode: refCode,
      referralLink: refLink
    };
    const token = generateAdminToken(userPayload);

    await AuditLog.create({
      type: "User Login",
      user: user.email || user.username,
      status: "Success",
      details: `Role: ${user.role} logged in (@${user.username || user.email})`
    }).catch(() => {});

    res.json({
      success: true,
      message: "Login successful",
      user: userPayload,
      token
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/verify-pass — legacy verify admin password
router.post("/verify-pass", (req, res) => {
  const { password } = req.body;
  if (password === "work2026@") {
    const superUser = {
      id: "superadmin_master",
      name: "Super Administrator",
      username: "superadmin",
      email: "admin@yourwealthcompass.in",
      role: "superadmin",
      referralCode: "admin",
      referralLink: "https://www.yourwealthcompass.in/?ref=admin"
    };
    return res.json({
      success: true,
      message: "Password verified",
      user: superUser,
      token: generateAdminToken(superUser)
    });
  } else {
    res.status(401).json({ success: false, error: "Invalid admin password" });
  }
});

// -------------------------------------------------------------
// 2. ADVISOR & TEAM MANAGEMENT
// -------------------------------------------------------------

// GET /api/v1/admin/users — list advisors and team members
router.get("/users", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);
    // Disallow regular advisors from viewing the entire team
    if (authUser && authUser.role === "advisor") {
      return res.status(403).json({ success: false, error: "Unauthorized. Super Admin or Advisor Creator access required." });
    }

    const teamUsers = await User.find({
      role: { $in: ["advisor", "advisor_creator", "creator", "it_manager", "admin", "superadmin"] }
    }).sort({ createdAt: -1 }).lean();

    // Attach active lead counts and conversions for each advisor
    const enriched = await Promise.all(
      teamUsers.map(async (u) => {
        const uId = u._id.toString();
        const totalAssigned = await Lead.countDocuments({ "assignedTo.advisorId": uId }).catch(() => 0);
        const converted = await Lead.countDocuments({ "assignedTo.advisorId": uId, leadStatus: "converted" }).catch(() => 0);
        const inProgress = await Lead.countDocuments({
          "assignedTo.advisorId": uId,
          leadStatus: { $in: ["contacted", "in_discussion", "meeting_scheduled"] }
        }).catch(() => 0);

        const refCode = u.referralCode || u.username || u.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const refLink = `https://www.yourwealthcompass.in/?ref=${refCode}`;

        return {
          id: u._id,
          name: u.name,
          username: u.username || "",
          email: u.email,
          mobile: u.mobile || "",
          role: u.role,
          referralCode: refCode,
          referralLink: refLink,
          status: u.status || "active",
          assignedLeadsCount: totalAssigned,
          convertedLeadsCount: converted,
          inProgressLeadsCount: inProgress,
          conversionRate: totalAssigned > 0 ? Math.round((converted / totalAssigned) * 100) : 0,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt
        };
      })
    );

    res.json({ success: true, users: enriched });
  } catch (err) {
    console.error("Get team users error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/users — create new advisor / team member
router.post("/users", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);
    if (authUser && authUser.role === "advisor") {
      return res.status(403).json({ success: false, error: "Unauthorized. Super Admin or Advisor Creator access required." });
    }

    const { name, username, email, mobile, password, role = "advisor" } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, error: "Name and password are required." });
    }

    const cleanUsername = (username || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    const cleanEmail = (email || (cleanUsername ? `${cleanUsername}@yourwealthcompass.in` : "")).toLowerCase().trim();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: "Username or email is required." });
    }

    // Check if email or username already exists
    const existing = await User.findOne({
      $or: [
        { email: cleanEmail },
        ...(cleanUsername ? [{ username: cleanUsername }] : [])
      ]
    });

    if (existing) {
      return res.status(400).json({ success: false, error: `Account with identifier "${cleanUsername || cleanEmail}" already exists.` });
    }

    const suffix = Math.random().toString(36).substring(2, 6);
    const refCode = (customReferralCode || (cleanUsername ? `${cleanUsername}-${suffix}` : `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${suffix}`)).toLowerCase().trim();
    const refLink = `https://www.yourwealthcompass.in/?ref=${refCode}`;
    const passwordHash = hashPassword(password);

    const validRoles = ["advisor", "advisor_creator", "it_manager", "superadmin"];
    const targetRole = validRoles.includes(role) ? role : "advisor";

    const createdUser = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      mobile: mobile ? mobile.trim() : "",
      passwordHash,
      role: targetRole,
      referralCode: refCode,
      referralLink: refLink,
      status: "active"
    });

    await AuditLog.create({
      type: "Team Management",
      user: authUser ? authUser.email : "Admin",
      status: "Success",
      details: `Created new ${createdUser.role}: ${createdUser.name} (@${cleanUsername || cleanEmail}) [Ref: ${refCode}]`
    }).catch(() => {});

    // Automatically assign existing unassigned leads to this new advisor immediately!
    if (createdUser.role === "advisor") {
      try {
        await autoDistributeUnassignedLeads(createdUser._id);
      } catch (distErr) {
        console.warn("Auto distribute to new advisor skipped:", distErr.message);
      }
    }

    res.json({
      success: true,
      message: `Account created for ${createdUser.name}!`,
      user: {
        id: createdUser._id,
        name: createdUser.name,
        username: createdUser.username,
        email: createdUser.email,
        mobile: createdUser.mobile,
        role: createdUser.role,
        referralCode: createdUser.referralCode,
        referralLink: createdUser.referralLink,
        status: createdUser.status,
        createdAt: createdUser.createdAt
      }
    });
  } catch (err) {
    console.error("Create advisor error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/users/:id/password — reset advisor password
router.post("/users/:id/password", async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    user.passwordHash = hashPassword(newPassword);
    await user.save();

    await AuditLog.create({
      type: "Team Management",
      user: "Admin",
      status: "Success",
      details: `Password reset for user: ${user.email || user.username}`
    }).catch(() => {});

    res.json({ success: true, message: `Password updated for ${user.name}.` });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/users/:id/status — toggle active/inactive status
router.post("/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    user.status = status;
    await user.save();

    await AuditLog.create({
      type: "Team Management",
      user: "Admin",
      status: "Success",
      details: `Status set to '${status}' for user: ${user.email || user.username}`
    }).catch(() => {});

    res.json({ success: true, message: `Account status updated to ${status}.`, user: { id: user._id, status: user.status } });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/admin/users/:id — delete advisor and unassign leads
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Unassign their leads
    await Lead.updateMany(
      { "assignedTo.advisorId": id },
      { $set: { "assignedTo.advisorId": null, "assignedTo.advisorName": "", "assignedTo.advisorEmail": "" } }
    ).catch(() => {});

    await User.findByIdAndDelete(id);

    await AuditLog.create({
      type: "Team Management",
      user: "Admin",
      status: "Success",
      details: `Deleted advisor: ${user.email || user.username}`
    }).catch(() => {});

    res.json({ success: true, message: "Advisor deleted successfully and their leads were unassigned." });
  } catch (err) {
    console.error("Delete advisor error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. LEADS & ASSIGNMENTS (ROLE-AWARE)
// -------------------------------------------------------------

// GET /api/v1/admin/leads — fetch leads (role-aware: advisor sees only assigned, advisor creator sees none)
router.get("/leads", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);

    // If advisor creator, has no access to client leads
    if (authUser && (authUser.role === "advisor_creator" || authUser.role === "creator")) {
      return res.json({ success: true, leads: [] });
    }

    let filter = {};

    // If logged in as specific advisor, only return leads assigned to them!
    if (authUser && authUser.role === "advisor") {
      filter = { "assignedTo.advisorId": authUser.id };
    }

    let leads = [];
    try {
      leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
    } catch (dbErr) {
      console.error("Lead fetch error:", dbErr.message);
    }

    const mapped = leads.map((l) => ({
      id: l._id,
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
      referralCode: l.referralCode || "",
      sourceAdvisor: l.sourceAdvisor || {},
      assignedTo: l.assignedTo || { advisorId: null, advisorName: "", advisorEmail: "", assignedAt: null },
      leadStatus: l.leadStatus || "new",
      advisorNotes: l.advisorNotes || [],
      submittedAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));

    res.json({ success: true, leads: mapped });
  } catch (err) {
    console.error("Get leads error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/leads/:id/assign — assign lead to an advisor (Super Admin)
router.post("/leads/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { advisorId, advisorName, advisorEmail } = req.body;
    const authUser = getUserFromAuth(req);

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found." });
    }

    lead.assignedTo = {
      advisorId: advisorId || null,
      advisorName: advisorName || "",
      advisorEmail: advisorEmail || "",
      assignedAt: advisorId ? new Date() : null
    };

    await lead.save();

    await AuditLog.create({
      type: "Lead Assignment",
      user: authUser ? authUser.email : "Super Admin",
      status: "Success",
      details: advisorId
        ? `Lead '${lead.name}' assigned to Advisor: ${advisorName} (${advisorEmail})`
        : `Lead '${lead.name}' unassigned`
    }).catch(() => {});

    res.json({ success: true, message: "Lead assignment updated.", assignedTo: lead.assignedTo });
  } catch (err) {
    console.error("Assign lead error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/admin/leads/:id/status — update lead pipeline status & add internal note
router.post("/leads/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { leadStatus, note } = req.body;
    const authUser = getUserFromAuth(req);

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, error: "Lead not found." });
    }

    if (leadStatus) {
      lead.leadStatus = leadStatus;
    }

    if (note && note.trim()) {
      lead.advisorNotes.unshift({
        id: "note_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        note: note.trim(),
        authorName: authUser ? authUser.name : "Advisor",
        authorRole: authUser ? authUser.role : "advisor",
        createdAt: new Date()
      });
    }

    await lead.save();

    await AuditLog.create({
      type: "Lead Stage Update",
      user: authUser ? authUser.email : "Advisor",
      status: "Success",
      details: `Lead '${lead.name}' status changed to '${lead.leadStatus}'`
    }).catch(() => {});

    res.json({
      success: true,
      message: "Lead updated successfully.",
      leadStatus: lead.leadStatus,
      advisorNotes: lead.advisorNotes
    });
  } catch (err) {
    console.error("Update lead status error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/leads/auto-assign-all — manually trigger auto-distribution of all unassigned leads
router.post("/leads/auto-assign-all", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);
    const result = await autoDistributeUnassignedLeads();

    await AuditLog.create({
      type: "Lead Distribution",
      user: authUser ? authUser.email : "Super Admin",
      status: "Success",
      details: `Auto-assigned ${result.assignedCount} previously unassigned leads across active advisors.`
    }).catch(() => {});

    res.json({
      success: true,
      message: `Successfully distributed ${result.assignedCount} leads across active advisors.`,
      assignedCount: result.assignedCount
    });
  } catch (err) {
    console.error("Auto assign all error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/admin/leads/:id — delete a lead
router.delete("/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Lead.findByIdAndDelete(id).catch(() => {});
    await AuditLog.create({
      type: "Lead Management",
      user: "Admin",
      status: "Success",
      details: `Lead deleted: ${id}`
    }).catch(() => {});

    res.json({ success: true, message: "Lead deleted successfully" });
  } catch (err) {
    console.error("Delete lead error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 4. ENQUIRIES & AUDIT LOGS
// -------------------------------------------------------------

// GET /api/v1/admin/enquiries — fetch contact enquiries (role-filtered)
router.get("/enquiries", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);

    if (authUser && (authUser.role === "advisor_creator" || authUser.role === "creator")) {
      return res.json({ success: true, enquiries: [] });
    }

    let filter = {};
    if (authUser && authUser.role === "advisor") {
      filter = { "assignedTo.advisorId": authUser.id };
    }

    let enquiries = [];
    try {
      enquiries = await Enquiry.find(filter).sort({ createdAt: -1 }).lean();
    } catch (dbErr) {
      console.error("Enquiry fetch error:", dbErr.message);
    }

    const mapped = enquiries.map((e) => ({
      id: e._id,
      name: e.name,
      email: e.email,
      mobile: e.mobile || "",
      topic: e.topic,
      message: e.message,
      referralCode: e.referralCode || "",
      assignedTo: e.assignedTo || {},
      submittedAt: e.createdAt
    }));

    res.json({ success: true, enquiries: mapped });
  } catch (err) {
    console.error("Get enquiries error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/admin/enquiries/:id — delete an enquiry
router.delete("/enquiries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Enquiry.findByIdAndDelete(id).catch(() => {});
    res.json({ success: true, message: "Enquiry deleted successfully" });
  } catch (err) {
    console.error("Delete enquiry error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/admin/logs — fetch system audit logs
router.get("/logs", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);
    if (authUser && authUser.role === "advisor") {
      return res.json({ success: true, logs: [] });
    }
    if (authUser && (authUser.role === "advisor_creator" || authUser.role === "creator")) {
      return res.json({ success: true, logs: [] });
    }

    let logs = [];
    try {
      logs = await AuditLog.find().sort({ createdAt: -1 }).lean();
    } catch (dbErr) {
      console.error("Audit log fetch error:", dbErr.message);
    }

    const mapped = logs.map((l) => ({
      id: l._id,
      timestamp: l.createdAt,
      type: l.type,
      user: l.user,
      status: l.status,
      details: l.details,
    }));

    res.json({ success: true, logs: mapped });
  } catch (err) {
    console.error("Get logs error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 5. FORM RESPONSES (/forms Portal)
// -------------------------------------------------------------

// GET /api/v1/admin/form-responses — fetch all form submissions (role-filtered)
router.get("/form-responses", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);

    if (authUser && (authUser.role === "advisor_creator" || authUser.role === "creator")) {
      return res.json({ success: true, formResponses: [] });
    }

    let filter = {};
    if (authUser && authUser.role === "advisor") {
      filter = { "assignedTo.advisorId": authUser.id };
    }

    let responses = [];
    try {
      responses = await FormResponse.find(filter).sort({ createdAt: -1 }).lean();
    } catch (dbErr) {
      console.error("Form responses fetch error:", dbErr.message);
    }

    const mapped = responses.map((fr) => ({
      id: fr._id,
      _id: fr._id,
      name: fr.name,
      email: fr.email,
      mobile: fr.mobile || "",
      city: fr.city || "",
      education: fr.education || "",
      profession: fr.profession || "",
      status: fr.status || "new",
      source: fr.source || "Forms Portal (/forms)",
      referralCode: fr.referralCode || "",
      assignedTo: fr.assignedTo || {},
      notes: fr.notes || [],
      submittedAt: fr.createdAt,
      createdAt: fr.createdAt
    }));

    res.json({ success: true, formResponses: mapped });
  } catch (err) {
    console.error("Get form responses error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/admin/form-responses/:id — update status or add note
router.patch("/form-responses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, noteText, authorName } = req.body;

    const updateObj = {};
    if (status) updateObj.status = status;

    let updated = null;
    if (noteText) {
      updated = await FormResponse.findByIdAndUpdate(
        id,
        {
          ...updateObj,
          $push: {
            notes: {
              id: "fn_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
              text: noteText,
              author: authorName || "Admin",
              createdAt: new Date()
            }
          }
        },
        { new: true }
      );
    } else {
      updated = await FormResponse.findByIdAndUpdate(id, updateObj, { new: true });
    }

    res.json({ success: true, formResponse: updated });
  } catch (err) {
    console.error("Update form response error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/admin/form-responses/:id — delete a form response
router.delete("/form-responses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await FormResponse.findByIdAndDelete(id).catch(() => {});
    res.json({ success: true, message: "Form response deleted successfully" });
  } catch (err) {
    console.error("Delete form response error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// -------------------------------------------------------------
// 5. ASSIGNMENT RULES & EXTENDED ACTIONS
// -------------------------------------------------------------

// GET /api/v1/admin/rules/assignment — fetch current lead distribution rules
router.get("/rules/assignment", async (req, res) => {
  try {
    let rule = await AssignmentRule.findOne({ key: "lead_distribution_rule" }).lean();
    if (!rule) {
      rule = {
        strategy: "equal_random",
        maxLeadsPerAdvisor: 20,
        autoAssignEnabled: true,
        updatedBy: "system"
      };
    }
    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/rules/assignment — update lead distribution rules (Superadmin only)
router.post("/rules/assignment", async (req, res) => {
  try {
    const authUser = getUserFromAuth(req);
    if (authUser && authUser.role !== "superadmin") {
      return res.status(403).json({ success: false, error: "Only Super Admin can configure lead distribution rules." });
    }

    const { strategy, maxLeadsPerAdvisor, autoAssignEnabled } = req.body;
    const validStrategies = ["equal_random", "performance", "capacity_cap"];
    const chosenStrategy = validStrategies.includes(strategy) ? strategy : "equal_random";

    const rule = await AssignmentRule.findOneAndUpdate(
      { key: "lead_distribution_rule" },
      {
        strategy: chosenStrategy,
        maxLeadsPerAdvisor: Number(maxLeadsPerAdvisor) || 20,
        autoAssignEnabled: typeof autoAssignEnabled === "boolean" ? autoAssignEnabled : true,
        updatedBy: authUser?.username || authUser?.name || "superadmin"
      },
      { upsert: true, new: true }
    );

    await AuditLog.create({
      type: "Rule Configuration",
      user: authUser?.username || "Superadmin",
      status: "Success",
      details: `Lead distribution strategy set to '${chosenStrategy}' (Cap: ${rule.maxLeadsPerAdvisor}, AutoAssign: ${rule.autoAssignEnabled})`
    }).catch(() => {});

    res.json({ success: true, message: "Assignment rules updated successfully", rule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/enquiries/:id/assign — assign enquiry to advisor
router.post("/enquiries/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { advisorId, advisorName, advisorEmail, advisorDesignation } = req.body;
    const enq = await Enquiry.findById(id);
    if (!enq) return res.status(404).json({ success: false, error: "Enquiry not found" });

    enq.assignedTo = {
      advisorId: advisorId || null,
      advisorName: advisorName || "",
      advisorEmail: advisorEmail || "",
      advisorDesignation: advisorDesignation || "Certified Financial Advisor",
      assignedAt: advisorId ? new Date() : null
    };
    await enq.save();

    await AuditLog.create({
      type: "Enquiry Assignment",
      user: "Admin",
      status: "Success",
      details: `Enquiry ${id} assigned to ${advisorName || "Unassigned"}`
    }).catch(() => {});

    res.json({ success: true, message: `Enquiry assigned to ${advisorName || "Unassigned"}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/admin/form-responses/:id/assign — assign form response to advisor
router.post("/form-responses/:id/assign", async (req, res) => {
  try {
    const { id } = req.params;
    const { advisorId, advisorName, advisorEmail, advisorDesignation } = req.body;
    const fr = await FormResponse.findById(id);
    if (!fr) return res.status(404).json({ success: false, error: "Form response not found" });

    fr.assignedTo = {
      advisorId: advisorId || null,
      advisorName: advisorName || "",
      advisorEmail: advisorEmail || "",
      advisorDesignation: advisorDesignation || "Certified Financial Advisor",
      assignedAt: advisorId ? new Date() : null
    };
    await fr.save();

    res.json({ success: true, message: `Form response assigned to ${advisorName || "Unassigned"}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
