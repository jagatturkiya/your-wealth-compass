const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
  name:    { type: String, default: "Client User" },
  email:   { type: String, default: "" },
  mobile:  { type: String, default: "" },
  topic:   { type: String, default: "General Enquiry" },
  message: { type: String, default: "" },
  referralCode: { type: String, default: "", index: true },
  assignedTo: {
    advisorId:          { type: String, default: null, index: true },
    advisorName:        { type: String, default: "" },
    advisorEmail:       { type: String, default: "" },
    advisorDesignation: { type: String, default: "Certified Financial Advisor" },
    assignedAt:         { type: Date, default: null }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Enquiry", enquirySchema);
