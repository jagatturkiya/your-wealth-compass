const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, trim: true, lowercase: true, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["client", "advisor", "advisor_creator", "creator", "it_manager", "admin", "superadmin"],
      default: "advisor"
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    referralCode: { type: String, trim: true, lowercase: true, default: "" },
    referralLink: { type: String, default: "" },
    designation: { type: String, default: "Certified Financial Advisor", trim: true },
    assignedLeadsCount: { type: Number, default: 0 },
    conversionsCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
