const mongoose = require("mongoose");

const assignmentRuleSchema = new mongoose.Schema(
  {
    key: { type: String, default: "lead_distribution_rule", unique: true },
    strategy: {
      type: String,
      enum: ["equal_random", "performance", "capacity_cap"],
      default: "equal_random"
    },
    maxLeadsPerAdvisor: { type: Number, default: 20 },
    autoAssignEnabled: { type: Boolean, default: true },
    updatedBy: { type: String, default: "superadmin" }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.AssignmentRule || mongoose.model("AssignmentRule", assignmentRuleSchema);

