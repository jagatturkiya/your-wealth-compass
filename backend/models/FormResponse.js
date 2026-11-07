const mongoose = require("mongoose");

const formResponseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    mobile: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    education: { type: String, default: "", trim: true },
    profession: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["new", "contacted", "meeting_scheduled", "converted", "archived"],
      default: "new",
      index: true
    },
    source: { type: String, default: "Forms Portal (/forms)" },
    referralCode: { type: String, default: "", index: true },
    sourceAdvisor: {
      advisorId:          { type: String, default: null, index: true },
      advisorName:        { type: String, default: "" },
      advisorEmail:       { type: String, default: "" },
      advisorDesignation: { type: String, default: "Certified Financial Advisor" }
    },
    assignedTo: {
      advisorId:          { type: String, default: null, index: true },
      advisorName:        { type: String, default: "" },
      advisorEmail:       { type: String, default: "" },
      advisorDesignation: { type: String, default: "Certified Financial Advisor" },
      assignedAt:         { type: Date, default: null }
    },
    notes: [
      {
        id: {
          type: String,
          default: () => "fn_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6)
        },
        text: { type: String, default: "" },
        author: { type: String, default: "Admin" },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("FormResponse", formResponseSchema);
